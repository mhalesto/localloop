// api/firebaseClient.js
import { Platform } from 'react-native';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';

// OPTIONAL App Check on web (safe no-op on native without provider)
let maybeInitAppCheck = () => { };
try {
  const { initializeAppCheck, ReCaptchaV3Provider } = require('firebase/app-check');
  maybeInitAppCheck = (app) => {
    if (Platform.OS === 'web') {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('<YOUR_RECAPTCHA_V3_SITE_KEY>'),
        isTokenAutoRefreshEnabled: true,
      });
    }
  };
} catch { }

if (!firebaseConfig || !firebaseConfig.projectId) {
  console.warn('[firebase] Missing configuration. Fill in api/firebaseConfig.js');
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
maybeInitAppCheck(app);

const bucketFromConfig = app?.options?.storageBucket || '(none)';
const gsBucketUrl = bucketFromConfig?.startsWith('gs://')
  ? bucketFromConfig
  : `gs://${bucketFromConfig}`;

console.log('[firebase] using project:', app?.options?.projectId);
console.log('[firebase] storage bucket (config):', bucketFromConfig);
console.log('[firebase] storage bucket URL used:', gsBucketUrl);

// Firestore
export const db =
  Platform.OS === 'web'
    ? getFirestore(app)
    : initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
      ignoreUndefinedProperties: true,
    });

// Storage — pass bucket explicitly to avoid mismatches
export const storage = getStorage(app, gsBucketUrl);

// Auth
let _auth;
if (Platform.OS === 'web') {
  _auth = getAuth(app);
} else {
  try {
    _auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (e) {
    console.warn('[firebase] initializeAuth failed, fallback getAuth()', e);
    try { _auth = getAuth(app); } catch { _auth = null; }
  }
}
export const auth = _auth;

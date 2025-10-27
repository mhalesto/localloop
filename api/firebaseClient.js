// api/firebaseClient.js
import { Platform } from 'react-native';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';

// (Optional) App Check on web only
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

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
maybeInitAppCheck(app);

console.log('[firebase] project:', app?.options?.projectId);
console.log('[firebase] storageBucket (config):', app?.options?.storageBucket);

// ----- Firestore -----
export const db =
  Platform.OS === 'web'
    ? getFirestore(app)
    : initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
      ignoreUndefinedProperties: true,
    });

// ----- Storage -----
export const storage = getStorage(app);

// Guarded retry-tuning (SDKs without these exports won’t crash)
try {
  // dynamic require to avoid bundling-time errors across SDK versions
  const storageMod = require('firebase/storage');
  const setMaxUploadRetryTime = storageMod?.setMaxUploadRetryTime;
  const setMaxOperationRetryTime = storageMod?.setMaxOperationRetryTime;
  if (typeof setMaxUploadRetryTime === 'function') {
    setMaxUploadRetryTime(storage, 15_000);
  }
  if (typeof setMaxOperationRetryTime === 'function') {
    setMaxOperationRetryTime(storage, 10_000);
  }
} catch { /* noop */ }

// ----- Auth -----
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

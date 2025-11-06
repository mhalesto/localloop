// api/firebaseClient.js
import { Platform } from 'react-native';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';

// App Check for additional security (web and native)
let maybeInitAppCheck = () => { };
try {
  const {
    initializeAppCheck,
    ReCaptchaV3Provider,
    getToken,
    CustomProvider
  } = require('firebase/app-check');

  maybeInitAppCheck = (app) => {
    let provider;

    if (Platform.OS === 'web') {
      // For web, use reCAPTCHA v3
      // Get your site key from Firebase Console > App Check > Web app
      provider = new ReCaptchaV3Provider('6LdBVJsqAAAAAPGMGBnZ9kTJ-CnrOPdJQm8HgfYA');
    } else {
      // For React Native (iOS/Android)
      // In production, use SafetyNet (Android) and DeviceCheck/App Attest (iOS)
      // For now, we'll use a custom provider that allows debug tokens
      provider = new CustomProvider({
        getToken: async () => {
          // In production, this would integrate with native attestation
          // For development, you can use debug tokens
          const debugToken = process.env.APP_CHECK_DEBUG_TOKEN || '';
          return {
            token: debugToken,
            expireTimeMillis: Date.now() + 3600 * 1000, // 1 hour
          };
        },
      });
    }

    // Initialize App Check with the appropriate provider
    const appCheck = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });

    console.log('[App Check] Initialized for platform:', Platform.OS);
  };
} catch (error) {
  console.log('[App Check] Not available, continuing without it:', error.message);
}

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

// api/firebaseClient.js
import { Platform } from 'react-native';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';

if (!firebaseConfig || !firebaseConfig.projectId) {
  console.warn('[firebase] Missing configuration. Fill in api/firebaseConfig.js');
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db =
  Platform.OS === 'web'
    ? getFirestore(app)
    : initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
      ignoreUndefinedProperties: true,
    });

let _auth;
if (Platform.OS === 'web') {
  _auth = getAuth(app);
} else {
  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    console.warn('[firebase] initializeAuth failed, falling back to getAuth()', error);
    try {
      _auth = getAuth(app);
    } catch (innerError) {
      console.warn('[firebase] getAuth failed after initializeAuth error', innerError);
      _auth = null;
    }
  }
}

export const auth = _auth;

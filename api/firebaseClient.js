import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

let app;
let db = null;

try {
  if (!firebaseConfig || !firebaseConfig.projectId) {
    console.warn('[firebase] Missing configuration. Fill in api/firebaseConfig.js');
  } else {
    const apps = getApps();
    app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
    db = getFirestore(app);
  }
} catch (error) {
  console.warn('[firebase] Initialization failed', error);
}

export { app, db };

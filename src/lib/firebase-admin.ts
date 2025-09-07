
import * as admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK.
// It's intended for server-side use only.

if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
      });
    } catch (error) {
      console.error('Firebase Admin initialization error from service account key:', error);
    }
  } else {
    // Fallback for environments where the key isn't set,
    // but the app might be configured via default credentials.
    try {
        admin.initializeApp();
    } catch(error) {
        console.error('Firebase Admin default initialization error:', error);
    }
  }
}

export default admin;

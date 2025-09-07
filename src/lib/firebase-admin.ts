
import 'server-only';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK.
// It's intended for server-side use only.

if (!getApps().length) {
  const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      initializeApp({
        credential: cert(JSON.parse(serviceAccountKey)),
      });
    } catch (error) {
      console.error('Firebase Admin initialization error from service account key:', error);
    }
  } else {
    // Fallback for environments where the key isn't set,
    // but the app might be configured via default credentials (e.g., Google Cloud Run).
    try {
        initializeApp();
    } catch(error) {
        console.error('Firebase Admin default initialization error:', error);
    }
  }
}

const adminApp = getApps()[0];
const adminDb = getFirestore(adminApp);

export { adminDb };
export default admin;

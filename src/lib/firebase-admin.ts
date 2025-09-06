
import * as admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK.
// It's intended for server-side use only.

// Ensure the service account key is available as an environment variable.
// In a production environment (like Vercel or Firebase Hosting), you would set this
// in the project settings, not in a .env file.
const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountKey!)),
    });
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.message);
  }
}

export default admin;

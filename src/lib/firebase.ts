// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgUZ8dcIMY3pd7k9s6_sHO_EyHtG1MImA",
  authDomain: "flossword.firebaseapp.com",
  projectId: "flossword",
  storageBucket: "flossword.firebasestorage.app",
  messagingSenderId: "358115126261",
  appId: "1:358115126261:web:c38d9331348e8c2f21cebc"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };

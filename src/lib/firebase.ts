
// src/lib/firebase.ts
import { initializeApp, getApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for placeholder values specifically for critical fields
if (
  !firebaseConfigValues.apiKey || firebaseConfigValues.apiKey === "YOUR_API_KEY" ||
  !firebaseConfigValues.authDomain || firebaseConfigValues.authDomain === "YOUR_AUTH_DOMAIN" ||
  !firebaseConfigValues.databaseURL || firebaseConfigValues.databaseURL === "YOUR_DATABASE_URL" ||
  !firebaseConfigValues.projectId || firebaseConfigValues.projectId === "YOUR_PROJECT_ID"
) {
  let missingVars = [];
  if (!firebaseConfigValues.apiKey || firebaseConfigValues.apiKey === "YOUR_API_KEY") missingVars.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!firebaseConfigValues.authDomain || firebaseConfigValues.authDomain === "YOUR_AUTH_DOMAIN") missingVars.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!firebaseConfigValues.databaseURL || firebaseConfigValues.databaseURL === "YOUR_DATABASE_URL") missingVars.push("NEXT_PUBLIC_FIREBASE_DATABASE_URL");
  if (!firebaseConfigValues.projectId || firebaseConfigValues.projectId === "YOUR_PROJECT_ID") missingVars.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

  throw new Error(
    `Firebase configuration is incomplete. Please ensure all NEXT_PUBLIC_FIREBASE_... environment variables are set correctly in your .env file (or environment). Missing or using placeholder for: ${missingVars.join(', ')}.
    The databaseURL, for example, must be in the format https://<YOUR-PROJECT-ID>.firebaseio.com or https://<YOUR-PROJECT-ID>.<region>.firebasedatabase.app.
    After setting them, restart your development server.`
  );
}

const firebaseConfig: FirebaseOptions = firebaseConfigValues as FirebaseOptions;

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };

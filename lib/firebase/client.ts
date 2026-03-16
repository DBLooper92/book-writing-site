import "client-only";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const requiredEnvVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

const hasExplicitConfig = missingEnvVars.length === 0;

function initializeFirebaseApp() {
  if (getApps().length) {
    return getApp();
  }

  if (hasExplicitConfig) {
    return initializeApp({
      apiKey: requiredEnvVars.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: requiredEnvVars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: requiredEnvVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: requiredEnvVars.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  }

  try {
    return initializeApp();
  } catch {
    throw new Error(
      `Missing Firebase environment variables: ${missingEnvVars.join(", ")}. ` +
        "Set NEXT_PUBLIC_FIREBASE_* locally, or rely on Firebase App Hosting auto-initialization during build."
    );
  }
}

const app = initializeFirebaseApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, auth, db };

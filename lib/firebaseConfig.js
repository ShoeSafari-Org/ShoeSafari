import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase services are only needed in the browser. Keeping service creation
// behind this guard allows Next.js to prerender the app in environments where
// deployment secrets have not been provided yet, while still failing clearly
// when a browser feature is used without configuration.
const isBrowser = typeof window !== "undefined";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

const firebaseApp = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = isBrowser && firebaseApp ? getAuth(firebaseApp) : null;
const db = isBrowser && firebaseApp ? getFirestore(firebaseApp) : null;
const storage = isBrowser && firebaseApp ? getStorage(firebaseApp) : null;


export { auth, db , storage};
export default firebaseApp;

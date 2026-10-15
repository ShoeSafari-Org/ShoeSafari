import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "shoesafari-checkout-admin";

/** Initialize Firebase Admin only inside server routes that need trusted data. */
export function getFirebaseAdminDb() {
  const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!credentials) {
    throw new Error("Server-side Firebase credentials are not configured.");
  }

  const existingApp = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existingApp) return getFirestore(existingApp);

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(credentials);
  } catch {
    throw new Error("Server-side Firebase credentials are invalid.");
  }

  const app = initializeApp(
    {
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    },
    ADMIN_APP_NAME
  );
  return getFirestore(app);
}

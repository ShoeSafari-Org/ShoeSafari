import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [action, uid] = process.argv.slice(2);

if (!["grant", "revoke"].includes(action) || !uid) {
  console.error("Usage: node scripts/set-admin-claim.mjs <grant|revoke> <firebase-user-uid>");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error("Set FIREBASE_PROJECT_ID before running this command.");
  process.exit(1);
}

initializeApp({ projectId, credential: applicationDefault() });
const auth = getAuth();
const user = await auth.getUser(uid);
const claims = { ...user.customClaims };

if (action === "grant") {
  claims.admin = true;
} else {
  delete claims.admin;
}

await auth.setCustomUserClaims(uid, claims);
console.log(`Admin claim ${action === "grant" ? "granted to" : "revoked from"} ${uid}.`);

import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const [action, uid, ...reasonParts] = process.argv.slice(2);

const reason = reasonParts.join(" ").trim();
const operatorId = process.env.ADMIN_OPERATOR_ID?.trim();

if (!["grant", "revoke"].includes(action) || !uid || !reason || !operatorId) {
  console.error("Usage: ADMIN_OPERATOR_ID=<operator> node scripts/set-admin-claim.mjs <grant|revoke> <firebase-user-uid> <reason>");
  process.exit(1);
}

if (reason.length < 3 || reason.length > 500) {
  console.error("Reason must be between 3 and 500 characters.");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error("Set FIREBASE_PROJECT_ID before running this command.");
  process.exit(1);
}

initializeApp({ projectId, credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();
const user = await auth.getUser(uid);
const claims = { ...user.customClaims };

const previousAdmin = user.customClaims?.admin === true;
const nextAdmin = action === "grant";
const audit = await db.collection("AdminClaimAudit").add({
  action,
  targetUid: uid,
  operatorId,
  reason,
  previousAdmin,
  nextAdmin,
  status: "attempted",
  createdAt: FieldValue.serverTimestamp(),
});

try {
  if (action === "grant") claims.admin = true;
  else delete claims.admin;

  await auth.setCustomUserClaims(uid, claims);
  await audit.update({ status: "succeeded", completedAt: FieldValue.serverTimestamp() });
  console.log(`Admin claim ${action === "grant" ? "granted to" : "revoked from"} ${uid}.`);
} catch (error) {
  await audit.update({
    status: "failed",
    failureType: error instanceof Error ? error.name : "UnknownError",
    completedAt: FieldValue.serverTimestamp(),
  });
  throw error;
}

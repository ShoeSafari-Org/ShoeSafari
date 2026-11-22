# Admin claim audit

The trusted `scripts/set-admin-claim.mjs` command requires an explicit
`ADMIN_OPERATOR_ID` and a non-empty reason for every grant or revoke. It writes
an attempted record to the protected `AdminClaimAudit` collection before
changing Firebase Auth claims, then marks the record succeeded or failed with a
server timestamp. Failure records contain only the error type, never the
service-account credential or raw error detail.

Example:

```sh
ADMIN_OPERATOR_ID=security-oncall \
  node scripts/set-admin-claim.mjs revoke FIREBASE_UID "offboarding completed"
```

The collection is readable only by admins and cannot be written from client
code. Review the audit record and refresh the affected user's ID token after a
change.

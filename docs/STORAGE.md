# Product image Storage

Deploy `storage.rules` with Firebase CLI before enabling product uploads:

```bash
firebase deploy --only storage --config firebase.storage.json --project your-project-id
```

The rules
allows shoppers to read objects under `products/`, and only Firebase Auth
accounts with the trusted `admin: true` custom claim can upload, replace, or
delete product images. Uploads must have an image content type and stay below
5 MiB. All other paths are denied.

Grant the claim only through Firebase Admin SDK from a trusted environment,
using `setCustomUserClaims(uid, { ...existingClaims, admin: true })`. To revoke
it, remove `admin` from the current custom claims and call
`setCustomUserClaims` again. Never grant claims from browser code. Configure the Storage emulator with
`firebase.storage.json`; the test suite uses only the `demo-shoesafari` project
and never accesses production Firebase.

Run the Storage rules tests locally with Java installed. CI uses this same
command, and no production Firebase credentials are required:

```bash
npm run test:rules:storage
```

Run both Firestore and Storage rules suites with `npm run test:rules`.

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

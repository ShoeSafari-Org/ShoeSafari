# Firestore deployment notes

ShoeSafari uses Firestore for commerce data that should not be placed in a
public payment transaction:

## Collections

### `ShoeSafariProducts`

Each product document should contain:

- `name` — display name
- `price` — numeric USD price
- `img` — Firebase Storage download URL

### `ShoeSafariOrders`

The checkout creates an order document after a successful Stellar payment. It
contains the human-readable `orderId`, `transactionHash`, `buyerWallet`,
`amountUsd`, `amountRaw`, cart `items`, customer delivery information, and the
Firebase `userId` when the shopper is authenticated.

The Soroban contract remains authoritative for whether funds are `Paid`,
`Shipped`, or `Refunded`. Firestore mirrors those statuses to make customer and
merchant views useful, but it must not be treated as proof that a payment was
settled.

## Security rules and administrator claims

The checked-in `firestore.rules` file is the authorization boundary. Product
documents are publicly readable and only writable by accounts whose Firebase
ID token contains the boolean custom claim `admin: true`. Customers can read
their own orders; only admins can read all orders or update/delete orders.
Guest order creation is limited to documents with a null `userId`. All other
paths are denied by default. The browser `AdminGuard` only controls navigation
and display; Firestore evaluates the signed token claim for every operation.

Grant or revoke the claim from a trusted machine with the Firebase Admin SDK
and credentials permitted to update users' claims. Create a service account
with the minimum required Firebase Authentication permissions, set
`GOOGLE_APPLICATION_CREDENTIALS` to its private file path, and run:

```bash
FIREBASE_PROJECT_ID=your-project node scripts/set-admin-claim.mjs grant FIREBASE_UID
FIREBASE_PROJECT_ID=your-project node scripts/set-admin-claim.mjs revoke FIREBASE_UID
```

The script preserves other custom claims. Never put the service-account file
in the repository or a browser bundle. After changing a claim, have the user
sign in again or refresh their ID token. Removing the claim denies subsequent
Firestore requests once Firebase issues the refreshed token.

Run the Firestore rules tests locally with Java installed:

```bash
npx firebase-tools@13.35.1 --config firebase.firestore.json --project demo-shoesafari \
  emulators:exec --only firestore "npx vitest run tests/rules/firestore.rules.test.js"
```

The emulator uses a `demo-` project ID and never accesses production data.
Deploy the production rules separately with:

```bash
firebase deploy --only firestore:rules --config firebase.firestore.json --project your-project-id
```

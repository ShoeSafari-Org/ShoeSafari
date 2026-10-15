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

### Trusted Stellar checkout quotes

The checkout quote API reads product prices through Firebase Admin on the
server. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` with a server-only service
account and `CHECKOUT_QUOTE_SECRET` with a private random secret of at least 32
characters. Never prefix these variables with `NEXT_PUBLIC_` or expose them to
browser code. The API accepts product IDs and quantities, ignores prices and
totals from the browser, and returns a signed quote that expires after 10
minutes. The wallet flow verifies the signature and expiry immediately before
building the transaction. Buyers see the server-confirmed total and quote
expiry before signing.

## Rules before deployment

Configure Firestore Security Rules before using real customer data. At minimum:

1. Allow public reads only for product documents.
2. Allow product writes only for the merchant admin identity.
3. Allow customers to read only orders whose `userId` matches their Firebase
   UID.
4. Allow admin order reads and status updates only for the merchant admin.
5. Validate order fields and keep card data out of Firestore entirely.

The current client-side admin email allowlist is a UI access boundary, not a
replacement for Firestore Rules. Use Firebase custom claims or an equivalent
server-managed role for production deployments.

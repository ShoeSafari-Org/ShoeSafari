# Checkout quote signing and verification

Checkout quotes are server-authored values. The browser may request a quote,
but it must not be trusted to set the price, line items, payment asset, or
amount sent to the Soroban contract.

## Signed format

The server serializes the `CheckoutQuote` JSON object, encodes those bytes as
base64url, and signs the exact encoded payload with HMAC-SHA256:

```text
base64url(JSON quote).base64url(HMAC-SHA256(payload, CHECKOUT_QUOTE_SECRET))
```

The payload includes `quoteId`, `orderId`, normalized line items and prices,
`totalUsd`, `expiresAt`, and, for Stellar payments, the selected asset,
contract ID, and raw amount. JSON serialization is the canonicalization step;
verification signs the received payload rather than parsed or reserialized
fields.

## Trust boundaries and lifecycle

1. The server reads the catalog and creates a short-lived quote. The secret is
   server-only and must never use a `NEXT_PUBLIC_` variable.
2. The browser sends the opaque token back to the verification route before
   Freighter signing. The route verifies the HMAC in constant time, decodes the
   payload, checks expiry, and revalidates payment values against the current
   network configuration.
3. The browser builds the transaction only from that verified quote. The
   Soroban contract remains the source of truth for the on-chain amount and
   receipt; Firestore is an off-chain order record.

Quotes expire after 10 minutes. They are not reusable for a different order,
asset, or amount because the client and verification route bind those values
to the signed payload. A quote is not a nonce or a payment authorization:
after an on-chain payment is submitted, do not retry it merely because an
off-chain request or Firestore write failed. Reconcile the original
transaction hash instead.

## Abuse cases and operations

- **Price or quantity tampering:** reject any client-created or modified token;
  only the server-calculated catalog values are accepted.
- **Signature substitution or truncation:** reject malformed tokens and compare
  signatures with a timing-safe comparison.
- **Replay after expiry:** reject tokens whose `expiresAt` is in the past and
  request a fresh quote.
- **Secret exposure:** rotate `CHECKOUT_QUOTE_SECRET` in the deployment secret
  manager. Rotation invalidates outstanding quotes; never log the secret or a
  complete token.
- **RPC or persistence uncertainty:** keep the public transaction hash and
  reconcile that hash. Never submit a second payment automatically.

Use fake values in documentation and tests only. Never place real wallet keys,
customer data, or production contract credentials in a quote or example.

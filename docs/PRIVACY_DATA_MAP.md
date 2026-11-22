# Customer, wallet, and transaction data map

Use this map when reviewing checkout, support, or admin changes. Public chain
data is not private customer data, but it can remain linkable to an order.

| Data | Visibility | Storage | Access | Retention/redaction |
| --- | --- | --- | --- | --- |
| Name, email, shipping address | Private | Firestore order record | Customer owner and authorized admin | One year after completion; anonymize on verified request or retention expiry |
| Firebase UID | Private | Firestore order record | Authorized admin and account owner | Removed during order anonymization |
| Buyer wallet address | Public/pseudonymous | Stellar ledger and a copied Firestore field | Anyone on-chain; copied field limited to order access | Chain is immutable; copied field is removed during anonymization |
| Transaction hash, ledger, token, amount, order hash | Public | Stellar ledger; hash also in Firestore | Anyone on-chain; copied field limited to order access | Chain is immutable; preserve the accounting reference |
| Cart items and prices | Private before checkout; order details private after checkout | Browser storage and Firestore order record | Customer owner and authorized admin | Browser cart is disposable; order line items follow order retention |
| Wallet secret, Firebase service account, quote secret | Secret | Never stored in browser or Firestore | Deployment secret manager only | Rotate on exposure; never log or include in support evidence |

## Pseudonymity limits

A Stellar address is not a legal identity, but public transactions, timing,
amounts, and repeated activity can be correlated. Do not describe a wallet as
anonymous. Never put names, emails, addresses, access tokens, or private keys
in memo fields, event data, logs, screenshots, or support comments.

## Deletion and support

Use the [retention and deletion guidance](SECURITY.md) and the
[payment reconciliation runbook](PAYMENT_RECONCILIATION.md). Anonymization
changes the private Firestore copy only; it cannot erase the public ledger or
the transaction hash needed to prove payment. Verify requester ownership before
removing private fields, and record only the minimum evidence needed for the
approved support process.

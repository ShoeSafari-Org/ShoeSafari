# Customer data retention and deletion

## Retention period

The merchant retains direct customer details in a Firestore order for one year
(365 days) after the order is completed. Completion means the commerce status
becomes `Shipped` or `Refunded`; the admin status update writes a server-side
`completedAt` timestamp. For older completed records without that field,
`updatedAt` is the completion-time fallback because the admin writes it when
the status changes. If neither timestamp exists, do not treat the record as
expired; retain it until a verified customer request or a reliable completion
date is available.

At the end of the retention period, an admin can use the order page's
**Anonymize after retention** action. It clears the Firestore customer name,
email, delivery address, Firebase UID, and copied buyer wallet address, and
records `personalDataAnonymizedAt`. It preserves the order identifier,
transaction hash, amount, token, status, and line items needed for accounting.
These retained references can still be correlated with public Stellar data.
The workflow never submits a transaction or changes contract state, indexed
events, or any other on-chain record.

## Customer requests

Customers can submit a deletion request through the merchant's published
support channel. Before acting, the merchant verifies that the requester
controls the account or checkout email associated with the order; for guest
orders, verify the checkout email and order reference. Admins can then choose
**Honor verified request** on a completed order to remove direct customer
details before the normal retention date. Do not use this path until the
requester's identity and order ownership have been checked. Record the request
date and outcome in the merchant's restricted support process without copying
the customer's personal details into another log.

Only a signed-in administrator with the Firestore `admin: true` custom claim
can perform the update. The app enforces that authorization with Firestore
Security Rules; a hidden or disabled UI control is not the security boundary.
The operation only changes the Firestore commerce copy. It does not delete or
alter public Stellar records, including the payment transaction and order
identifier. Tell customers that public chain data is immutable and may remain
linkable through the retained transaction hash. If a legal or accounting hold
requires retaining direct identifiers longer, follow that hold and document
the exception in the restricted support process.

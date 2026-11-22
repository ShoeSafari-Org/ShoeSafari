# Order action audit

Dispatch and refund actions write append-only records to
`ShoeSafariOrderActions`. Each record contains only operational metadata:
order id, action, attempted/succeeded/failed phase, the connected operator
wallet when available, transaction hash/ledger on success, a failure reason,
and a server timestamp.

Firestore rules restrict reads and creates to admins and deny updates/deletes.
The audit record supplements, rather than replaces, the verified on-chain
transaction and contract event. Retain records according to the operational
audit policy and avoid putting customer address, payment secrets, or wallet
signatures in the audit document.

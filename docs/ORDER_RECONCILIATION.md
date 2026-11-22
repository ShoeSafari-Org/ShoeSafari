# Chain-to-Firestore reconciliation

The admin indexer uses only successfully decoded, structurally validated
checkout contract events as reconciliation input. Matching Firestore orders
record the event ledger, transaction hash, chain status, reason, and server
timestamp.

Reconciliation is idempotent: an event at or below the stored `chainLedger` is
skipped, so delayed or out-of-order events cannot overwrite newer state. A
status difference is preserved in `reconciliationReason` for support review
instead of being silently hidden.

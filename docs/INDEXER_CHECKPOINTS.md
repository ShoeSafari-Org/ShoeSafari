# Indexer checkpoint scope

Indexer cursors are browser-local checkpoints scoped by the full Stellar
network passphrase and checkout contract id. A cursor from another network or
deployment is discarded instead of being reused.

The previous v1 key was already scoped by network and contract id, so a valid
v1 record is migrated once into the v2 record with explicit metadata. Invalid,
malformed, or mismatched records are removed safely and the indexer starts from
its configured ledger backfill.

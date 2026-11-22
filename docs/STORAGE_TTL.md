# Persistent storage TTL policy

Checkout persistent records use a minimum renewal threshold of 1,000 ledgers
and are extended to 10,000 ledgers whenever they are written or successfully
read. The policy covers admin, order, token-allowlist, and approval-policy
records. Removing a token or approval policy deletes the key instead of
renewing it, and missing keys are treated as absent.

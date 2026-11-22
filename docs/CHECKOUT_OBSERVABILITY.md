# Checkout observability

The browser checkout flow records process-local lifecycle metrics for quote,
readiness, simulation, signing, submission, confirmation, and persistence.
Each sample has only a fixed stage, the configured Stellar network, a token
symbol, an outcome, and a duration. Order IDs, wallet addresses, quote tokens,
RPC URLs, transaction hashes, error text, and personal data are never metric
labels.

Success and failure counters should be exported by the host application's
telemetry adapter and displayed as rates and latency percentiles. Alert on a
sustained increase in failures or p95 duration for one stage/network/token,
with separate thresholds for readiness, RPC submission, and confirmation.
Treat a confirmation timeout as an uncertain payment outcome and route it to
the existing recovery flow; do not automatically retry a payment submission.

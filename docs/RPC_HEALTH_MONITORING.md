# RPC health monitoring

Checkout RPC reads, simulations, sends, and polls emit process-local counters
and durations labelled by operation, network, endpoint host, outcome, and a
small error class (`timeout`, `rate_limited`, `network`, `simulation`,
`authorization`, or `unknown`). Query strings and request/response data are not
stored. The host telemetry adapter should export these snapshots as rates and
p50/p95 latency series.

Alert only on sustained failure-rate or latency degradation for a specific
operation and network. A poll timeout is an uncertain payment result: route it
through recovery and do not automatically resubmit the payment. RPC outages
should be sampled and retried according to the existing flow rather than
turning every transient failure into an alert.

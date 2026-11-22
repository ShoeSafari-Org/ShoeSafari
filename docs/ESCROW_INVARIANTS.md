# Escrow balance invariant

For every successful payment, the contract balance increases by exactly the
escrow amount while the buyer balance decreases by the same amount. Dispatch
moves that amount from the contract to the merchant; refund moves it back to
the buyer. Failed duplicate or invalid lifecycle calls must not move funds or
change the recorded order state.

The focused contract tests cover the mock SEP-41 token through payment,
dispatch, refund, and duplicate-call paths, plus the native SAC lifecycle
coverage already present in the suite.

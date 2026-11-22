# Dispatch and refund confirmation

Before signing a dispatch or refund, the admin sees the order hash, buyer,
token, amount, current status, and the escrow destination or refund warning.
The browser confirmation is explicit, and the row is disabled while the action
is in flight so duplicate clicks cannot submit duplicate transactions.

On success, the returned transaction hash and ledger replace the displayed
event metadata and remain visible in the success message. A failed or cancelled
action leaves the order state unchanged.

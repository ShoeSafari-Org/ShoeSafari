# Merchant rotation

`set_merchant` is authorized by the current merchant and emits the complete
`merchant_changed_v1` audit event containing both addresses. Rotation changes
future authorization and dispatch destinations; it does not alter existing
orders or move escrow.

Pending orders remain pending across a rotation and can still be paid with
their original terms. Paid escrow remains in the checkout contract until the
new merchant authorizes dispatch or refund. The old merchant cannot perform
privileged actions after the change, while configured high-value approval
policies continue to require their separate approver.

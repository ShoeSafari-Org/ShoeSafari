# Pending order expiry

Checkout orders begin in `Pending` and have fifteen minutes to receive payment.
The deadline uses the Soroban ledger timestamp recorded at creation. After the
deadline, anyone may call `expire_order` to remove the unpaid record, or a new
`create_order`/`pay` call may replace it. Each cleanup emits `order_expired_v1`.

Only pending records can expire. Paid, shipped, and refunded orders are never
removed by this policy, so escrowed funds cannot be lost through expiry.

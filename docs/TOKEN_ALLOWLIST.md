# Token allowlisting

`add_token` reads the token's SEP-41 `decimals` value before storing it in the
allowlist and accepts only the seven-decimal precision used by the checkout.
Malformed contracts or tokens with another precision fail the call and are not
allowlisted.

The contract cannot safely probe `transfer` during allowlisting: that would
require a funded sender and could move real funds. The actual payment call is
the behavior boundary; its authenticated SEP-41 transfer must succeed before
the order is recorded as paid. Operators should allowlist only verified token
contracts and use testnet-safe payment checks during deployment.

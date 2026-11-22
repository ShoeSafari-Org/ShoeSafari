# External token behavior

Checkout treats the allowlisted SEP-41 token as an external call boundary.
Payment records the order as `Paid` only after the token transfer returns
successfully, so a rejected or trapped transfer cannot create a paid order.
Dispatch and refund update state only after their outbound transfer succeeds;
the lifecycle status checks prevent repeated releases.

Allowlisting is an operator trust decision. Use verified token contracts and
testnet-safe transfers before production configuration; the contract does not
attempt speculative callbacks or token transfers during allowlisting.

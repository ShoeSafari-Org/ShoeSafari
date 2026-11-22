# Order ID encoding and collision policy

The checkout accepts a human-readable order string at the client boundary and
uses `SHA-256(UTF-8(exact string))` as the contract's `BytesN<32>` order id.
The string is not trimmed or Unicode-normalized, so every language must encode
the exact same scalar sequence as UTF-8 before hashing.

Cross-language fixtures:

| Input | SHA-256 hex |
| --- | --- |
| `order-123` | `3b6a198e6f182f27b91aa5a8b37ab70d4c54d3889e4a947243c1afd3e718ca66` |
| `注文-🚀` | `46fabd28ad87430ab3ff120a9141dde54740cc16dffda6ed0c64972580087469` |
| `a-very-long-order-id-that-must-remain-byte-stable-across-languages-0001` | `37d04c475898c00c5ccf8aa9121c2cda182e60df5fbea80417d8c2825e0fd0e8` |

The contract treats the 32-byte hash as the unique key. A duplicate hash is
rejected before a new order record is written. For support lookup, compute the
canonical lowercase hash with `hashOrderIdHex(orderId)` and use that value as
the `BytesN<32>` lookup key; do not guess or re-encode it differently.

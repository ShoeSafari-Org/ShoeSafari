# ShoeSafari Checkout (Soroban)

A [Stellar Soroban](https://stellar.org/developers) smart contract that runs an
**on-chain order registry with escrow**. Buyers pay with any whitelisted
[SEP-41](https://stellar.org/developers/learn/guides/interoperability/sep-41)
token (USDC, native XLM, ...) straight from their wallet
(via [Freighter](https://freighter.app)). Funds are **escrowed in the contract**
until the merchant dispatches the order — or refunded on-chain back to the buyer.

## Interface

The versioned machine-readable interface is
[`interface/checkout-v1.json`](interface/checkout-v1.json). It records the
Soroban entrypoint signatures and argument order, event names and fields, and
numeric order status values. The storefront and contract documentation should
refer to this manifest when describing the public interface. Run
`npm run check:checkout-interface` after interface changes; the deterministic
source check fails when Rust entrypoints, event fields/topics, or status values
drift from the manifest.

When making a backward-incompatible interface change, add a new manifest file
and increment its major interface version; keep the old manifest to document
deployed contracts. For compatible additions, update the current manifest's
minor version. Corrections that do not change the deployed interface use a
patch version. Update this README, the frontend API reference, and the release
checklist in the same change.

This is the contract-facing interface used by the storefront. `amount` values
passed to Soroban are **raw token units**; the storefront's cart prices are
display values in USD. For a supported 7-decimal token, `12.34` token units is
`123_400_000` raw units. Do not pass a formatted string such as `"12.34 USDC"`
to the contract.

| Call | Signature | Authorization and effect |
| --- | --- | --- |
| `create_order` | `create_order(buyer: Address, order_id: BytesN<32>, token: Address, amount: i128) -> Result<(), Error>` | Buyer authorizes; records a `Pending` order without moving funds. |
| `pay` | `pay(token: Address, buyer: Address, order_id: BytesN<32>, amount: i128) -> Result<(), Error>` | Buyer authorizes; transfers the exact raw-unit amount into escrow and marks the order `Paid`. |
| `dispatch` | `dispatch(order_id: BytesN<32>) -> Result<(), Error>` | Merchant authorizes; releases escrow to the merchant. |
| `refund` | `refund(order_id: BytesN<32>) -> Result<(), Error>` | Merchant authorizes; returns escrow to the buyer. |
| `order` | `order(order_id: BytesN<32>) -> Option<Order>` | Reads buyer, raw `amount`, token contract, timestamp, and status. |
| `status` | `status(order_id: BytesN<32>) -> Option<Status>` | Reads the order lifecycle state. |
| `is_paid` | `is_paid(order_id: BytesN<32>) -> bool` | True for `Paid` or `Shipped` orders. |

For the storefront client, use [`payWithStellar`](../../lib/stellar/checkout.ts),
which accepts a USD display amount, a signed quote, a wallet public key, and an
optional configured `TokenConfig`. The client builds the contract's raw-unit
`i128`; its token configuration and formatter are in
[`lib/stellar/config.ts`](../../lib/stellar/config.ts). See the
[Stellar API reference](../../docs/STELLAR_API.md) for helper signatures and
the [network configuration matrix](../../docs/NETWORK_CONFIGURATION.md) for
the token IDs and decimals configured by network.

```ts
import { payWithStellar } from "../../lib/stellar/checkout";
import { defaultToken } from "../../lib/stellar/config";

const receipt = await payWithStellar({
  amountUsd: 12.34, // storefront display amount; the client converts it
  orderId: "order-123",
  quoteToken, // server-signed quote returned by the checkout API
  publicKey, // connected Freighter public address
  token: defaultToken(), // configured default token; omit to use the default
});
```

The Soroban `pay` call receives an `i128` raw amount, not `amountUsd` or a
formatted UI value. For example, the client currently converts `$12.34` to
`123_400_000` raw units for its 7-decimal supported tokens. Use
`formatTokenAmount` from `lib/stellar/config.ts` when displaying an on-chain
raw amount; never infer display decimals from the amount itself.

| Function         | Params                                                                     | Returns                | Description                                                        |
| ---------------- | -------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| `initialize`     | `merchant: Address`                                                        | `Result<(), Error>`    | Set the merchant wallet (one-time, deployer signs)                 |
| `set_merchant`   | `new_merchant: Address`                                                    | `Result<(), Error>`    | Change the merchant wallet (current merchant signs)                |
| `merchant`       | —                                                                          | `Result<Address, Error>` | Read the merchant wallet                                         |
| `add_token`      | `token: Address`                                                           | `Result<(), Error>`    | Whitelist a SEP-41 token for payments (merchant signs)             |
| `remove_token`   | `token: Address`                                                           | `Result<(), Error>`    | Remove a token from the whitelist (merchant signs)                 |
| `is_token_allowed` | `token: Address`                                                         | `bool`                 | Query whether a token is accepted                                   |
| `set_approval_policy` | `token: Address, threshold: i128, approver: Address`               | `Result<(), Error>`    | Require a second signer for high-value dispatches and refunds       |
| `clear_approval_policy` | `token: Address`                                                    | `Result<(), Error>`    | Disable the token's second-signer requirement                       |
| `approval_policy` | `token: Address`                                                        | `Option<ApprovalPolicy>` | Read the optional approval policy                                  |
| `create_order`   | `buyer`, `order_id: BytesN<32>`, `token`, `amount: i128`                   | `Result<(), Error>`    | Register order intent as `Pending` (buyer signs; no funds move)    |
| `pay`            | `token`, `buyer`, `order_id: BytesN<32>`, `amount: i128`                   | `Result<(), Error>`    | **Escrow** `amount` from `buyer` into the contract; order → `Paid` |
| `dispatch`       | `order_id: BytesN<32>`                                                     | `Result<(), Error>`    | Release escrow to the merchant; order → `Shipped` (merchant signs) |
| `refund`         | `order_id: BytesN<32>`                                                     | `Result<(), Error>`    | Return escrow to the buyer; order → `Refunded` (merchant signs)    |
| `order`          | `order_id: BytesN<32>`                                                     | `Option<Order>`        | Read the full order record (`buyer`, `amount`, `token`, `timestamp`, `status`) |
| `status`         | `order_id: BytesN<32>`                                                     | `Option<Status>`       | Read the order lifecycle status                                    |
| `is_paid`        | `order_id: BytesN<32>`                                                     | `bool`                 | True when funds were received (`Paid` or `Shipped`)                |

## Order lifecycle

```
                  create_order                 dispatch
                 ┌───────────────┐          ┌───────────────┐
   buyer ───────▶│    Pending    │── pay ──▶│     Paid      │──▶ Shipped (funds → merchant)
                 └───────────────┘          └───────┬───────┘
                                                    │ refund
                                                    ▼
                                               Refunded (funds → buyer)
```

### `pay` details

- `buyer.require_auth()` — the buyer must sign the transaction.
- High-value release approval is disabled by default. The merchant can set a
  raw-unit threshold and an additional approver per token. A qualifying
  `dispatch` or `refund` requires both the merchant and configured approver to
  authorize the same transaction; the approval address cannot equal the
  merchant. Keeping policy per token avoids mixing thresholds across tokens
  with different decimal configurations.
- `amount` is in **raw token units** (USDC/XLM use 7 decimals, so `10.00 = 100_000_000`).
- Transfers buyer → **contract** via the SEP-41 `transfer` host call (escrow).
- The `token` must be on the merchant's whitelist (`add_token`).
- If `create_order` registered the order first, payment must match its buyer,
  token, and exact amount. Mismatches fail with `OrderTermsMismatch` before
  funds move. Direct `pay` without a prior `create_order` remains supported.
- Rejects amounts `<= 0`, unknown tokens, and duplicate payments (`OrderAlreadyPaid`).
- Emits `PaymentReceived`:

```
topics: ["pay", token, buyer, merchant, order_id]
data:   { amount }   (i128, raw units)
```

### Events

| Event            | Topics                                    | Data                      |
| ---------------- | ----------------------------------------- | ------------------------- |
| `PaymentReceived`| `pay`, token, buyer, merchant, order_id   | `{ amount }`              |
| `OrderCreated`   | `create_order`, token, buyer, order_id    | `{ amount, timestamp }`   |
| `OrderShipped`   | `dispatch`, order_id, merchant            | `{ amount }`              |
| `OrderRefunded`  | `refund`, order_id, buyer                 | `{ amount }`              |
| `MerchantChangedV1` | `merchant_changed_v1`, previous merchant, new merchant | — |
| `TokenAllowlistChangedV1` | `token_allowlist_changed_v1`, token | `{ allowed }` |

Configuration events are published only after merchant authorization succeeds.
Repeated allowlist calls that do not change state do not emit duplicate events.

### Errors

| Code | Name                 | Meaning                                  |
| ---- | -------------------- | ---------------------------------------- |
| 1    | `NotInitialized`     | `merchant` not set yet                   |
| 2    | `AlreadyInitialized` | `initialize` called twice                |
| 3    | `InvalidAmount`      | `amount <= 0`                            |
| 4    | `OrderAlreadyPaid`   | order already paid / registry id in use  |
| 5    | `TokenNotAllowed`    | token not on the merchant's whitelist    |
| 6    | `OrderNotFound`      | no order for the given `order_id`        |
| 7    | `InvalidOrderStatus` | order is not `Paid` for dispatch/refund  |
| 8    | `OrderTermsMismatch` | payment buyer, token, or amount differs from the pending order |
| 9    | `InvalidApprovalPolicy` | invalid threshold, token, or signer configuration |

## Build

Requires Rust with the `wasm32v1-none` target and the
[Stellar CLI](https://github.com/stellar/stellar-cli).

```bash
rustup target add wasm32v1-none
cargo build --target wasm32v1-none --release
ls target/wasm32v1-none/release/shoesafari_checkout.wasm
```

## Test

```bash
cargo test
```

Tests cover the full lifecycle with a self-contained mock SEP-41 token AND the
real Stellar Asset Contract for native XLM
(`env.register_stellar_asset_contract_v2`), so nothing needs to be deployed.
They also verify pending order terms cannot be changed when the payment is made.

## Order storage lifetime

Orders use persistent storage. When an order's remaining TTL is below the
1,000-ledger threshold, `storage::set_order` and `storage::get_order` request a
renewal to 10,000 ledgers. Reads and lifecycle transitions that load or update
an order renew its ledger entry. An absent order is not renewed.

This is a rolling renewal policy, not permanent storage: an order that is not
read or written before its TTL expires can be archived and may require a
separate restore operation before it can be accessed. The 10,000-ledger target
is subject to the network's maximum persistent-entry TTL and archival rules;
it does not override network limits or guarantee a fixed wall-clock lifetime.

## Deploy (testnet)

For contract-vs-frontend release decisions, storage compatibility, production
contract ID changes, and post-deployment checks, follow the
[checkout contract release checklist](../../docs/CONTRACT_RELEASE.md).

```bash
# 1. Create and fund an account
stellar keys generate alice --network testnet --fund

# 2. Deploy the contract
stellar contract deploy \
  --wasm target/wasm32v1-none/release/shoesafari_checkout.wasm \
  --source-account alice \
  --network testnet \
  --alias shoesafari_checkout

# 3. Initialize with the merchant wallet
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account alice \
  --network testnet \
  -- \
  initialize \
  --merchant GC55K6MT5EAHO4FFIRRKEW7XZYAIOKL57PJIG42BAYY4RPMCDZWUG7H7

# 4. Whitelist the tokens you accept
stellar contract invoke \
  --id <CONTRACT_ID> --source-account alice --network testnet -- \
  add_token --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA

stellar contract invoke \
  --id <CONTRACT_ID> --source-account alice --network testnet -- \
  add_token --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

Native XLM testnet SAC id `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
is empirically verified; mainnet uses a different id (see `lib/stellar/config.ts`).

## Pay via CLI (testnet)

Testnet USDC (Stellar Asset Contract):
`CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`

```bash
# Order id: 32 bytes, hex-encoded.
ORDER_ID=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef

# Escrow the payment
stellar contract invoke \
  --id <CONTRACT_ID> --source-account alice --network testnet -- \
  pay \
  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA \
  --buyer alice \
  --order_id "$ORDER_ID" \
  --amount 10000000

# Dispatch (release escrow to the merchant) once shipped
stellar contract invoke \
  --id <CONTRACT_ID> --source-account alice --network testnet -- \
  dispatch --order_id "$ORDER_ID"

# ...or refund back to the buyer
stellar contract invoke \
  --id <CONTRACT_ID> --source-account alice --network testnet -- \
  refund --order_id "$ORDER_ID"

# Read the order status
stellar contract invoke \
  --id <CONTRACT_ID> --source-account alice --network testnet -- \
  status --order_id "$ORDER_ID"
```

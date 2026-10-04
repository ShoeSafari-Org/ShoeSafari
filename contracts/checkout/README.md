# ShoeSafari Checkout (Soroban)

A [Stellar Soroban](https://stellar.org/developers) smart contract that runs an
**on-chain order registry with escrow**. Buyers pay with any whitelisted
[SEP-41](https://stellar.org/developers/learn/guides/interoperability/sep-41)
token (USDC, native XLM, ...) straight from their wallet
(via [Freighter](https://freighter.app)). Funds are **escrowed in the contract**
until the merchant dispatches the order — or refunded on-chain back to the buyer.

## Interface

| Function         | Params                                                                     | Returns                | Description                                                        |
| ---------------- | -------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------ |
| `initialize`     | `merchant: Address`                                                        | `Result<(), Error>`    | Set the merchant wallet (one-time, deployer signs)                 |
| `set_merchant`   | `new_merchant: Address`                                                    | `Result<(), Error>`    | Change the merchant wallet (current merchant signs)                |
| `merchant`       | —                                                                          | `Result<Address, Error>` | Read the merchant wallet                                         |
| `add_token`      | `token: Address`                                                           | `Result<(), Error>`    | Whitelist a SEP-41 token for payments (merchant signs)             |
| `remove_token`   | `token: Address`                                                           | `Result<(), Error>`    | Remove a token from the whitelist (merchant signs)                 |
| `is_token_allowed` | `token: Address`                                                         | `bool`                 | Query whether a token is accepted                                   |
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

## Deploy (testnet)

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

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

---

## Comprehensive Deployment Guide

### 1. Prerequisites & Toolchain Setup

Ensure the following prerequisites are installed and configured:

1. **Rust & WebAssembly Target**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add wasm32-unknown-unknown
   ```
2. **Stellar CLI (formerly Soroban CLI)**:
   ```bash
   cargo install --locked stellar-cli --features opt
   # Verify installation
   stellar --version
   ```
3. **Configure Network Environments**:
   ```bash
   # Add Stellar Testnet
   stellar network add \
     --global testnet \
     --rpc-url https://soroban-testnet.stellar.org:443 \
     --network-passphrase "Test SDF Network ; September 2015"

   # Add Stellar Mainnet
   stellar network add \
     --global mainnet \
     --rpc-url https://mainnet.sorobanrpc.com:443 \
     --network-passphrase "Public Global Stellar Network ; July 2015"
   ```
4. **Configure Deployer & Merchant Identities**:
   ```bash
   # Generate or import deployer key
   stellar keys generate deployer --network testnet
   # Fund testnet identity using Friendbot
   stellar keys fund deployer --network testnet
   ```

---

### 2. Building & Optimizing the Contract

Always produce an optimized WebAssembly bytecode artifact prior to on-chain deployment:

```bash
cd contracts/checkout

# 1. Compile to target wasm32
cargo build --target wasm32-unknown-unknown --release

# 2. Optimize the WASM binary (minimizes bytecode size and storage footprint)
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/shoessafari_checkout.wasm
```

The optimized file will be output to:
`target/wasm32-unknown-unknown/release/shoessafari_checkout.optimized.wasm`.

---

### 3. Step-by-Step Testnet Deployment

```bash
# 1. Deploy the optimized contract WASM to Stellar Testnet
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/shoessafari_checkout.optimized.wasm \
  --source deployer \
  --network testnet)

echo "Deployed Contract ID: $CONTRACT_ID"

# 2. Initialize the contract with the Merchant Wallet Address
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source deployer \
  --network testnet -- \
  initialize \
  --merchant <MERCHANT_PUBLIC_KEY>

# 3. Whitelist accepted Stellar Asset Contract (SAC) tokens
# Example: Whitelist Testnet USDC
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source <MERCHANT_IDENTITY> \
  --network testnet -- \
  add_token \
  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

---

### 4. Mainnet Deployment Checklist & Production Security

Before executing mainnet deployment, verify all checklist invariants:

- [ ] **Audited Source Code**: All smart contract code frozen, verified against formal invariants and zero open vulnerabilities.
- [ ] **Hardware Wallet / Multisig Signing**: Mainnet deployer and merchant keys should be hardware wallets (Ledger) or multi-sig accounts, not hot CLI keys.
- [ ] **Production Stellar Asset Contract (SAC) IDs**: Confirm mainnet token contract IDs (e.g., Mainnet USDC: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`).
- [ ] **Sufficient Reserve Balance**: Deployer account funded with sufficient native XLM for contract deployment fees, WASM ledger footprints, and persistent storage rents.
- [ ] **One-Time Initialization Guarantee**: The `initialize` call must be executed in the same deployment batch or script to prevent front-running.
- [ ] **Frontend Configuration**: Update environment variables (`NEXT_PUBLIC_CHECKOUT_CONTRACT_ID`, `NEXT_PUBLIC_STELLAR_NETWORK=mainnet`) in web and service layers.

---

### 5. Contract Initialization Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `merchant` | `Address` | Yes | The authoritative merchant Stellar wallet that receives payment releases upon order dispatch and holds administrative authority to manage token whitelisting. |

---

### 6. Troubleshooting & Common Error Resolutions

| Error / Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| `HostError: Error(Contract, #1)` (`AlreadyInitialized`) | Contract `initialize` has already been invoked. | The contract can only be initialized once. For upgrades or redeployments, deploy a new contract instance. |
| `HostError: Error(Contract, #2)` (`Unauthorized`) | Caller is not authorized for the requested merchant action. | Ensure the signing keypair matches the configured `merchant` address. |
| `HostError: Error(Contract, #3)` (`TokenNotAllowed`) | Payment was attempted with a token not on the whitelist. | Merchant must call `add_token --token <SAC_ADDRESS>` before buyers can submit payments. |
| `HostError: Error(Contract, #4)` (`OrderNotFound`) | Action called on an uninitialized or non-existent `order_id`. | Confirm the 32-byte hex `order_id` matches the buyer's order record. |
| `HostError: Error(Contract, #5)` (`OrderAlreadyPaid`) | Payment was submitted for an order already in `Paid` or `Shipped` status. | Generate a fresh unique 32-byte `order_id` for each checkout session. |
| `HostError: Error(Contract, #6)` (`OrderTermsMismatch`) | Payment amount, token, or buyer does not match the terms registered during `create_order`. | Verify exact token address, buyer address, and raw stroop integer amount match order intent. |
| `Transaction expired / Fee too low` | Network congestion or surge pricing. | Add `--fee <stroops>` flag to increase max inclusion fee when invoking CLI. |


# Soroban Smart Contract Deployment Guide

Comprehensive guide for compiling, testing, deploying, initializing, and managing the ShoeSafari Escrow Checkout smart contract (`contracts/checkout`) across Stellar Testnet and Mainnet environments.

---

## 1. Prerequisites & Toolchain Setup

Ensure the following prerequisites and development dependencies are installed on your environment before compiling or deploying:

### 1.1 Rust & WebAssembly Target
Soroban smart contracts are written in Rust and compiled to `wasm32-unknown-unknown`.
- **Rust Toolchain**: Rust stable (1.79+ recommended).
  ```bash
  # Install Rust via rustup if not already present
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  
  # Ensure rustup is up to date
  rustup update stable
  
  # Add the WebAssembly compilation target
  rustup target add wasm32-unknown-unknown
  ```

### 1.2 Stellar CLI
The official `stellar-cli` (formerly `soroban-cli`) is required for building, packaging, deploying, and invoking Soroban smart contracts.
- **Installation via Cargo**:
  ```bash
  cargo install --locked stellar-cli --features opt
  ```
- **Verify Installation**:
  ```bash
  stellar version
  ```

---

## 2. Local Testing & Verification

Before deploying to remote networks, execute the full suite of unit and integration tests under `contracts/checkout`:

```bash
cd contracts/checkout

# Run all contract unit tests (mock SEP-41 token + Stellar Asset Contract integration tests)
cargo test
```

### Build Optimized WASM
Compile the contract with release profile flags (`opt-level = 3`, `lto = true`, `overflow-checks = true`):
```bash
# Using Stellar CLI
stellar contract build

# Verify compiled artifact size
ls -lh ../../target/wasm32-unknown-unknown/release/shoesafari_checkout.wasm
```
*Note: Target binary size should typically remain well below the Soroban network limit (64 KB).*

---

## 3. Testnet Deployment Guide

### 3.1 Network & Keypair Configuration
Configure the Stellar Testnet network and fund a deployer identity:

```bash
# Configure Testnet network alias
stellar network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate and fund a dedicated testnet merchant identity with Friendbot
stellar keys generate merchant-testnet --network testnet --fund

# View public key
stellar keys address merchant-testnet
```

### 3.2 Deploy the Contract Bytecode
Deploy the compiled WASM bytecode to the Stellar Testnet:

```bash
cd contracts/checkout

# Deploy to testnet
stellar contract deploy \
  --wasm ../../target/wasm32-unknown-unknown/release/shoesafari_checkout.wasm \
  --source-account merchant-testnet \
  --network testnet
```
*Output: Returns contract address (e.g. `C...`). Record this address as `TESTNET_CONTRACT_ID`.*

### 3.3 Contract Initialization
Initialize the escrow contract with the merchant's Stellar public key. The merchant address must authorize this invocation (`merchant.require_auth()`):

```bash
stellar contract invoke \
  --id <TESTNET_CONTRACT_ID> \
  --source-account merchant-testnet \
  --network testnet \
  -- \
  initialize \
  --merchant $(stellar keys address merchant-testnet)
```

Verify initialization:
```bash
stellar contract invoke \
  --id <TESTNET_CONTRACT_ID> \
  --network testnet \
  -- \
  merchant
```
*Expected Return: The merchant address configured above.*

### 3.4 Whitelisting Accepted Payment Tokens
The contract requires tokens to be explicitly whitelisted before buyers can fund orders.

```bash
# 1. Whitelist Testnet USDC (Stellar Asset Contract)
stellar contract invoke \
  --id <TESTNET_CONTRACT_ID> \
  --source-account merchant-testnet \
  --network testnet \
  -- \
  add_token \
  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA

# 2. Whitelist Native XLM (Testnet SAC Contract)
stellar contract invoke \
  --id <TESTNET_CONTRACT_ID> \
  --source-account merchant-testnet \
  --network testnet \
  -- \
  add_token \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# Verify whitelist status
stellar contract invoke \
  --id <TESTNET_CONTRACT_ID> \
  --network testnet \
  -- \
  is_token_allowed \
  --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

---

## 4. Mainnet Deployment Checklist & Runbook

Deploying to Stellar Mainnet involves real financial assets and immutable contract state. Follow this step-by-step checklist rigorously:

### Pre-Deployment Verification Checklist
- [ ] Contract source code audited and unit tests passed with 100% green coverage (`cargo test`).
- [ ] Gas profiling and instruction limit bounds confirmed within Soroban network limits.
- [ ] Hardware wallet (e.g., Ledger) or multi-sig setup prepared for the merchant admin account.
- [ ] Dedicated merchant wallet funded with sufficient XLM (at least 20 XLM for base reserves and contract entry TTL storage fees).
- [ ] Exact contract IDs for Mainnet Circle USDC and Mainnet Native XLM SAC confirmed.

### 4.1 Configure Mainnet Identity
```bash
# Add Mainnet network alias
stellar network add \
  --global mainnet \
  --rpc-url https://mainnet.sorobanrpc.com \
  --network-passphrase "Public Global Stellar Network ; September 2015"

# Import or add secure merchant key
stellar keys add merchant-mainnet
```

### 4.2 Deploy and Initialize on Mainnet
```bash
# 1. Deploy contract WASM
stellar contract deploy \
  --wasm ../../target/wasm32-unknown-unknown/release/shoesafari_checkout.wasm \
  --source-account merchant-mainnet \
  --network mainnet

# 2. Initialize contract with merchant address
stellar contract invoke \
  --id <MAINNET_CONTRACT_ID> \
  --source-account merchant-mainnet \
  --network mainnet \
  -- \
  initialize \
  --merchant <MERCHANT_PUBLIC_KEY>

# 3. Whitelist Native XLM SAC (Mainnet deterministic contract ID)
stellar contract invoke \
  --id <MAINNET_CONTRACT_ID> \
  --source-account merchant-mainnet \
  --network mainnet \
  -- \
  add_token \
  --token CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA

# 4. Whitelist Circle USDC (Mainnet SAC)
stellar contract invoke \
  --id <MAINNET_CONTRACT_ID> \
  --source-account merchant-mainnet \
  --network mainnet \
  -- \
  add_token \
  --token <MAINNET_USDC_CONTRACT_ID>
```

---

## 5. Contract Initialization Parameters & State Overview

| Entrypoint | Parameter | Type | Required Signer | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `initialize` | `merchant` | `Address` | `merchant` | Establishes the admin merchant account owning contract escrow controls. Can only be invoked once. |
| `set_merchant` | `new_merchant` | `Address` | `current_merchant` | Transfers merchant contract ownership. |
| `add_token` | `token` | `Address` | `merchant` | Whitelists a SEP-41 token for order escrow payments. |
| `remove_token` | `token` | `Address` | `merchant` | Revokes token payment acceptance. |
| `dispatch` | `order_id` | `BytesN<32>` | `merchant` | Releases escrowed funds to merchant upon item delivery. |
| `refund` | `order_id` | `BytesN<32>` | `merchant` | Reverses order and transfers escrowed funds back to buyer. |

---

## 6. Troubleshooting & Common Operational Errors

### 6.1 `Error::AlreadyInitialized` (`Error(Contract, #1)`)
- **Cause**: The contract has already been initialized with a merchant address. Calling `initialize` more than once is strictly prohibited by contract state invariants.
- **Remedy**: If changing the merchant wallet address, invoke `set_merchant` using the current merchant wallet key rather than calling `initialize`.

### 6.2 `Transaction rejected: HostError (Error(Storage, #2))` / Missing Account
- **Cause**: The source account has not been funded or does not exist on the specified network.
- **Remedy**: On testnet, fund the account using `stellar keys fund <account-name>`. On mainnet, ensure at least 2 to 5 XLM base reserve is deposited.

### 6.3 `OrderTermsMismatch` (`Error(Contract, #5)`)
- **Cause**: The buyer, token address, or raw payment amount sent in `pay` differs from the terms registered in `create_order`.
- **Remedy**: Ensure the client verifies `order(order_id)` before calling `pay` and uses identical raw integer units (e.g. 7 decimal scaling for USDC/XLM).

### 6.4 `TokenNotAllowed` (`Error(Contract, #4)`)
- **Cause**: Attempting to pay with a token that has not been approved via `add_token`.
- **Remedy**: Invoke `add_token --token <TOKEN_CONTRACT_ADDRESS>` as the merchant account.

### 6.5 Wasm Compilation Exceeds Size Bounds
- **Cause**: Building without release flags or with debug assertions included.
- **Remedy**: Use `stellar contract build` or `cargo build --target wasm32-unknown-unknown --release` with `lto = true` configured in `Cargo.toml`.

<div align="center">

# ShoeSafari — Stellar Storefront Reference Architecture

**An open-source retail storefront built on the Stellar network**

[![CI](https://github.com/ShoeSafari-Hub/ShoeSafari/actions/workflows/ci.yml/badge.svg)](https://github.com/ShoeSafari-Hub/ShoeSafari/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-%237b2ff7?logo=stellar)](https://developers.stellar.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Security](https://img.shields.io/badge/Security-Policy-blue.svg)](SECURITY.md)

</div>

ShoeSafari is a **reference-architecture e-commerce storefront** that shows how a
production-style online store can accept **Stellar (Soroban) payments** — USDC
or native XLM paid directly from a customer's Freighter wallet into a **Rust
smart contract** that escrows the funds until the order ships.

It is intentionally built as a realistic store rather than a toy demo: Next.js storefront,
product catalog, cart, email OTP flow, and a checkout that offers both
traditional card payment and **on-chain Stellar settlement** with an order
registry, escrow, and on-chain refunds. Teams and builders can use it as a
blueprint for adding Soroban checkout to their own store.

> **Open-source ecosystem project:** ShoeSafari is being prepared for Stellar
> Drips Wave and GrantFox. The repository is a reusable reference implementation;
> see [CONTRIBUTING.md](CONTRIBUTING.md) for how to help improve it.

---

## Deep Stellar Integration

The full design rationale — escrow, multi-token support, event indexing,
pre-flight fee simulation, and how this acts as a portable public-good blueprint
— lives in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

In short, payments are **non-custodial** and **refundable**:

```
buyer ──pay──▶ contract (escrow) ──dispatch──▶ merchant
                     │
                     └──refund──▶ buyer (on-chain)
```

- **Order registry on-chain** — every order records `{ buyer, amount, token,
  timestamp, status }` and transitions `Pending → Paid → Shipped/Refunded`.
- **Multi-token** — any SEP-41 token the merchant whitelists (`add_token`):
  USDC and native XLM out of the box.
- **Escrow** — funds stay in the contract until the merchant dispatches, or
  go straight back to the buyer on refund.
- **Real-time indexing** — the storefront polls `getEvents` (cursor-paginated)
  and decodes `pay`/`dispatch`/`refund` events live (`lib/stellar/indexer.ts`).
- **Pre-flight simulation** — every payment is simulated first so resource
  fees are reported and failures are caught before the buyer signs
  (`lib/stellar/simulate.ts`).
- **Readiness checks** — account funding, trustline, and token balance are all
  verified before building the transaction (`lib/stellar/account.ts`).

---

## Table of Contents

- [Highlights](#highlights)
- [Deep Stellar Integration](#deep-stellar-integration)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the repository](#1-clone-the-repository)
  - [2. Install dependencies](#2-install-dependencies)
  - [3. Configure environment variables](#3-configure-environment-variables)
  - [4. Run the local dev server](#4-run-the-local-dev-server)
- [Smart Contract Deployment (Testnet)](#smart-contract-deployment-testnet)
  - [Step 1 — Build the contract](#step-1--build-the-contract)
  - [Step 2 — Test the contract](#step-2--test-the-contract)
  - [Step 3 — Set up a testnet identity](#step-3--set-up-a-testnet-identity)
  - [Step 4 — Deploy to testnet](#step-4--deploy-to-testnet)
  - [Step 5 — Initialize with your merchant wallet](#step-5--initialize-with-your-merchant-wallet)
  - [Step 6 — Wire the deployed contract to the storefront](#step-6--wire-the-deployed-contract-to-the-storefront)
  - [Convenience script](#convenience-script)
- [Paying with USDC (testnet)](#paying-with-usdc-testnet)
- [Environment Variables Reference](#environment-variables-reference)
- [Security Notes](#security-notes)
- [Firestore deployment notes](docs/FIRESTORE.md)
- [Drips Wave issue backlog](docs/WAVE_ISSUES.md)
- [Contributing](#contributing)
- [License](#license)

---

## Highlights

- **Next.js 14** App Router + Tailwind CSS storefront (catalog, cart, checkout,
  admin, blog).
- **Soroban checkout with escrow** — a Rust smart contract moves USDC (or
  native XLM) from the buyer's wallet into an **on-chain escrow**, records the
  order, and releases it to the merchant on dispatch or refunds it on-chain.
- **Freighter wallet integration** with network guard, pre-flight simulation,
  readiness checks, real-time `getEvents` indexing, and an explorer link on
  success.
- **Self-funding testnet flow** — brand-new accounts are auto-funded via
  friendbot, so testing takes under a minute.
- **Testnet USDC + native XLM** (Stellar Asset Contract) — no card, no bank,
  no KYC required.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Storefront (Next.js / React / Tailwind)                          │
│                                                                   │
│  app/checkout/page.tsx                                            │
│    ├─ components/StellarCheckoutButton.jsx  "Pay with USDC"       │
│    ├─ components/StellarOrderWatch.jsx      live event monitor    │
│    └─ lib/stellar/                                              │
│         ├─ checkout.ts          payment flow                      │
│         ├─ account.ts           trustline / balance / friendbot   │
│         ├─ simulate.ts          pre-flight fee simulation         │
│         ├─ indexer.ts           getEvents cursor listener         │
│         ├─ freighter.ts         wallet connect/sign               │
│         ├─ scval.ts             ScVal builders                    │
│         └─ events.ts            event decoding                    │
└──────────────────────────┬────────────────────────────────────────┘
                           │  invokeHostFunction(pay) via RPC
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  contracts/checkout  (Rust · Soroban SDK 27)                      │
│                                                                   │
│  order registry: order_id -> Order {buyer, amount, token, status} │
│  pay(token, buyer, order_id, amount)   buyer → escrow (contract)  │
│  dispatch(order_id)                    escrow → merchant          │
│  refund(order_id)                      escrow → buyer             │
│  add_token / remove_token              SEP-41 whitelist           │
└──────────────────────────┬────────────────────────────────────────┘
                           │  SEP-41 transfer + contract events
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  Stellar network (testnet / mainnet)                              │
│  Ledger stores PaymentReceived / OrderShipped / OrderRefunded     │
│  Stellar Asset Contracts: USDC + native XLM                       │
└──────────────────────────────────────────────────────────────────┘
```

### The `pay` function

| Param      | Type         | Meaning                                      |
| ---------- | ------------ | -------------------------------------------- |
| `token`    | `Address`    | Whitelisted SEP-41 token (USDC SAC or native XLM SAC) |
| `buyer`    | `Address`    | The paying wallet (must authorize)           |
| `order_id` | `BytesN<32>` | 32-byte unique order identifier               |
| `amount`   | `i128`       | Raw token units (USDC = 7 decimals)          |

`pay` escrows `amount` from `buyer` into the contract, marks the order `Paid`,
and emits a `PaymentReceived` event:

```
topics: ["pay", token, buyer, merchant, order_id]
data:   { amount }
```

The merchant then calls `dispatch(order_id)` to release the escrow (emits
`dispatch`) or `refund(order_id)` to return it to the buyer (emits `refund`).
The storefront decodes these events live and from confirmed transactions to
display receipts and finish orders.

> Full design decisions, the escrow model, and how the pieces fit together:
> **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Repository Layout

A clean split between **frontend**, **contracts**, and **config**:

```
shoesafari/
├── app/                            # Frontend — Next.js App Router
│   ├── (landingpage)/              #   landing sections (Hero, Stellar, AboutUs…)
│   ├── checkout/page.tsx           #   checkout with the Stellar/USDC stage
│   ├── shop/                       #   product catalog + product details
│   ├── collections/                #   collections listing
│   ├── admin/                      #   admin product management
│   └── profile/login/              #   authentication
├── components/                     # Shared UI (Stellar checkout/wallet buttons, Toast…)
├── lib/                            # Client-side libraries
│   ├── stellar/                    #   Soroban payment library
│   │   ├── config.ts               #     network / contract / token config
│   │   ├── freighter.ts            #     wallet connect / signing
│   │   ├── scval.ts                #     ScVal builders + decoders
│   │   ├── checkout.ts             #     payWithStellar() payment flow
│   │   ├── account.ts              #     trustline / balance / friendbot
│   │   ├── simulate.ts             #     pre-flight resource-fee simulation
│   │   ├── indexer.ts              #     getEvents cursor listener
│   │   └── events.ts               #     contract event decoding
│   └── AuthContext.jsx             #   auth + cart context
├── contracts/
│   └── checkout/                   # Contracts — Rust Soroban smart contract
│       ├── src/
│       │   ├── lib.rs              #   entry points (initialize, pay, dispatch, refund…)
│       │   ├── order.rs            #   Order struct + status lifecycle
│       │   ├── storage.rs          #   persistent storage + TTL management
│       │   ├── events.rs           #   PaymentReceived / OrderShipped / OrderRefunded…
│       │   ├── errors.rs           #   typed error codes
│       │   └── test.rs             #   mock-token + native-asset integration tests
│       ├── Cargo.toml
│       └── README.md               #   contract interface + manual CLI examples
├── docs/
│   └── ARCHITECTURE.md             # Deep Stellar integration design rationale
├── scripts/
│   └── deploy-testnet.sh           # one-command build + deploy + initialize
├── public/                         # Static assets (product images)
├── .env.local.example              # Config — environment variable template
├── package.json                    # Frontend dependencies + scripts
└── LICENSE
```

## Tech Stack

| Layer       | Technology                                             |
| ----------- | ------------------------------------------------------ |
| Frontend    | Next.js 14 (App Router), React, Tailwind CSS, Firebase |
| Payments    | `@stellar/stellar-sdk` 16, `@stellar/freighter-api` 6  |
| Smart chain | Rust, Soroban SDK 27, Stellar CLI                      |
| Currency    | USDC + native XLM via the Stellar Asset Contract (7 decimals) |

## Prerequisites

Install the following before getting started:

| Tool             | Version / Notes                                              | Install                                     |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------- |
| **Node.js**      | 18.18+ (bundles `npm`)                                       | https://nodejs.org                          |
| **Rust**         | stable, with the `wasm32v1-none` target                      | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` |
| **Stellar CLI**  | latest (`stellar --version`)                                 | `brew install stellar-cli` or via [cargo/docs](https://github.com/stellar/stellar-cli) |
| **Freighter**    | browser wallet extension (Chrome / Firefox)                  | https://freighter.app                       |

> **Rust note:** a C toolchain/LLVM is required to compile the Soroban contract.
> On macOS install Xcode Command Line Tools (`xcode-select --install`).

Verify your setup:

```bash
node --version      # v18.18+ or newer
cargo --version     # 1.7x+
stellar --version   # latest
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ShoeSafari-Hub/ShoeSafari.git
cd ShoeSafari
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the template and fill in your values:

```bash
cp .env.local.example .env.local
```

A minimal Stellar-only configuration (the rest of the app runs with the existing
Firebase/Mongo values you already use):

```bash
# --- Stellar / Soroban payments ---
NEXT_PUBLIC_STELLAR_NETWORK=testnet
# NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
# NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Deployed checkout contract id (see "Smart Contract Deployment" below)
NEXT_PUBLIC_CHECKOUT_CONTRACT_ID=

# USDC token contract (testnet default; set for mainnet)
# NEXT_PUBLIC_USDC_CONTRACT_ID=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA

# Display-only: the merchant wallet that receives USDC payments.
# The authoritative value lives on-chain, set during contract initialize.
# PUBLIC_MERCHANT_ADDRESS=
```

### 4. Run the local dev server

```bash
npm run dev
```

Open http://localhost:3000 — you should land on the storefront home page. To see
the Stellar checkout, add an item to your cart and visit the checkout page.

> Until you deploy the contract (next section), `NEXT_PUBLIC_CHECKOUT_CONTRACT_ID`
> is empty and the Stellar payment stage stays disabled — that's expected.

## Smart Contract Deployment (Testnet)

The checkout contract lives in `contracts/checkout/`. Deploying it is a
four-part pipeline: **build → test → deploy → initialize**.

### Step 1 — Build the contract

```bash
cd contracts/checkout

# Install the Soroban wasm target (one time)
rustup target add wasm32v1-none

# Build the optimized release wasm
stellar contract build
```

`stellar contract build` compiles with Cargo and **optimizes the wasm by
default**. The artifact is written to
`contracts/checkout/target/wasm32v1-none/release/shoesafari_checkout.wasm`.

Alternatively, the manual Cargo route (optimize with a newer CLI's
`stellar contract build --optimize`, or the legacy
`stellar contract optimize --wasm <file> --out <file>`):

```bash
cd contracts/checkout
cargo build --target wasm32v1-none --release
```

### Step 2 — Test the contract

The test suite uses a self-contained mock token plus the real Stellar Asset
Contract for native XLM, so no deployment or network access is needed:

```bash
cd contracts/checkout
cargo test
```

Expected output includes the full order lifecycle — escrow + dispatch, refund,
native-XLM payments, token whitelist, duplicate-order, not-initialized,
zero-amount, double-init, and merchant-change cases.

### Step 3 — Set up a testnet identity

Generate a funded keypair that the Stellar CLI will use as the deployer:

```bash
# Back at the repo root
stellar keys generate alice --network testnet --fund
```

> `alice` is the default identity used by `scripts/deploy-testnet.sh` and by the
> examples below. Swap the name/flag to match your own keyring.

### Step 4 — Deploy to testnet

```bash
stellar contract deploy \
  --wasm contracts/checkout/target/wasm32v1-none/release/shoesafari_checkout.wasm \
  --source-account alice \
  --network testnet
```

The command prints a contract id:

```
Contract: CBL2LFZKZJ4DHANUKYQXHFTTBFEUQ3QYIG4M5CLVND6FRRQTJTY4Q7WG
```

Save it — you'll need it for the next two steps.

### Step 5 — Initialize with your merchant wallet

The contract requires a one-time `initialize` call that sets the **merchant
wallet** receiving every future payment. The merchant address must authorize
the transaction, so this must be the merchant's own account:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account alice \
  --network testnet \
  -- \
  initialize \
  --merchant G...YOUR_MERCHANT_ADDRESS...
```

Verify it took effect:

```bash
stellar contract invoke --id <CONTRACT_ID> --network testnet -- merchant
```

Expected output is the merchant address you just set. An order cannot be paid
before this step succeeds.

> **Warning:** the merchant address you pass here authorizes every release from
> escrow. Triple-check it before submitting on mainnet. This store ships
> un-initialized on purpose so each team authorizes its own merchant.

### Step 5b — Whitelist the tokens you accept

Funds can only be escrowed with tokens the merchant has approved. Add USDC and
native XLM (testnet values):

```bash
stellar contract invoke --id <CONTRACT_ID> --source-account alice --network testnet -- \
  add_token --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA

stellar contract invoke --id <CONTRACT_ID> --source-account alice --network testnet -- \
  add_token --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

Verify with `stellar contract invoke --id <CONTRACT_ID> --network testnet -- is_token_allowed --token <TOKEN>`.

### Step 6 — Wire the deployed contract to the storefront

Add the contract id to `.env.local`:

```bash
NEXT_PUBLIC_CHECKOUT_CONTRACT_ID=<CONTRACT_ID>
```

Restart the dev server and the "Pay with USDC" stage on the checkout page
activates.

### Convenience script

`scripts/deploy-testnet.sh` automates Steps 1, 4, and 5 (build → deploy →
initialize). It initializes the contract with the given merchant address, or
with the deploying account's own public key when none is supplied, and
whitelists USDC + native XLM:

```bash
./scripts/deploy-testnet.sh                  # merchant = deployer's public key
./scripts/deploy-testnet.sh G...YOUR_MERCHANT...  # explicit merchant
```

It prints the `NEXT_PUBLIC_CHECKOUT_CONTRACT_ID` to paste into `.env.local`.

## Paying with Stellar (testnet)

1. Install [Freighter](https://freighter.app) and set the network to **Testnet**
   (Settings → Network → Testnet).
2. Open the checkout page, connect Freighter, and tap **Pay with USDC**.
3. The app checks your account (funding it via friendbot if new), verifies your
   USDC trustline and balance, and simulates the transaction to estimate fees.
4. Approve the transaction in Freighter. The contract escrows the exact amount
   (7-decimal USDC) and emits a `PaymentReceived` event; the live order monitor
   shows it landing on-chain in real time.
5. Confirm the payment on the explorer link shown after success.

> **Mainnet:** set `NEXT_PUBLIC_STELLAR_NETWORK=mainnet`, point
> `NEXT_PUBLIC_USDC_CONTRACT_ID` at the mainnet USDC SAC contract, set
> `NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID` (mainnet native id differs from
> testnet), redeploy the contract, and initialize it with your real merchant
> account.

## Environment Variables Reference

| Variable                              | Required | Purpose                                   |
| ------------------------------------- | -------- | ----------------------------------------- |
| `NEXT_PUBLIC_STELLAR_NETWORK`         | no       | `testnet` (default) or `mainnet`          |
| `NEXT_PUBLIC_STELLAR_RPC_URL`         | no       | Soroban RPC endpoint (testnet default)    |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | no    | Network passphrase (testnet default)      |
| `NEXT_PUBLIC_CHECKOUT_CONTRACT_ID`    | yes*     | Deployed checkout contract (C…)           |
| `NEXT_PUBLIC_USDC_CONTRACT_ID`        | no       | USDC token contract (testnet default)     |
| `NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID`| no       | Native XLM SAC (verified testnet default) |
| `PUBLIC_MERCHANT_ADDRESS`             | no       | Display-only merchant wallet (on-chain value is authoritative) |
| `NEXT_PUBLIC_FIREBASE_*`              | yes      | Firebase config (existing storefront)     |
| `MONGO_DB_URI`                        | yes      | Mongo URI (existing storefront)           |

\* Required for the Stellar payment stage; empty until you deploy the contract.

## Security Notes

- **Merchant authorization is on-chain.** The `initialize` transaction sets the
  wallet that owns the contract and can release escrow, and requires that
  merchant's signature. Verify it before submitting, especially on mainnet.
- **Escrow, not custody.** Funds move `buyer → contract → merchant` only via
  `dispatch`, or back to the buyer via `refund`. Neither party can withdraw to
  an arbitrary address, and an order can only be paid once
  (`OrderAlreadyPaid`).
- **Token whitelist.** Only tokens the merchant added with `add_token` can
  fund orders (`TokenNotAllowed` otherwise).
- **Amounts are enforced in the contract.** `amount <= 0` is rejected and the
  escrowed amount is exactly what the buyer signed for.
- **Client totals are convenience only.** Verify payments against the emitted
  `PaymentReceived` event server-side if you operate a fulfillment backend.
- **Keys never leave the browser.** Freighter holds private keys; the store
  only ever asks for signatures.

## Contributing

Community contributions are welcome. Issues, bounties, and milestones are
tracked natively on the GrantFox platform. Please read
**[CONTRIBUTING.md](CONTRIBUTING.md)** before opening your first pull request.

## License

MIT — see [LICENSE](LICENSE).

# ShoeSafari × Stellar: Architecture & Deep Integration

ShoeSafari is designed as an **open-source reference implementation** for
accepting Stellar payments: a production-grade storefront where every payment
is a first-class on-chain event, not a payment-processor redirect.

This document describes the deep integration between the Next.js storefront,
the Stellar network, and the Soroban checkout contract, and why each piece is
built the way it is. It is written to be portable: anyone should be able to take
this architecture, point it at their own tokens and merchant wallet, and run a
non-custodial checkout that uses the Stellar public rail.

For support steps when a submitted payment is pending or missing from the
storefront, see the [payment reconciliation runbook](PAYMENT_RECONCILIATION.md).

## Contributor map

Use this map to find each subsystem's entry point and its focused validation
command. Run commands from the repository root unless the path says otherwise.

| Subsystem | Entry point | Validation |
| --- | --- | --- |
| Storefront pages and shared UI | `app/` and `components/` | `npm run test` |
| Shared app state and user flows | `context/` | `npm run test` |
| Stellar wallet, transaction, and event helpers | `lib/stellar/` | `npm run test` |
| Soroban checkout contract | `contracts/checkout/src/lib.rs` | `cd contracts/checkout && cargo test` |
| Firestore and Storage access rules | `firestore.rules` and `storage.rules` | `npm run test:rules` |
| Browser checkout and accessibility flows | `e2e/` | `npm run test:e2e` (accessibility: `npm run test:e2e:accessibility`) |

For broader frontend checks, use `npm run lint`, `npm run type-check`, and
`npm run build`. Contract formatting and lint checks are `cargo fmt -- --check`
and `cargo clippy --all-targets -- -D warnings` from `contracts/checkout/`.

---

## 1. System overview

```
┌─────────────────────────────┐        ┌─────────────────────────────┐
│        Buyer's browser      │        │           Merchant          │
│  Freighter wallet (signer)  │        │  G… public key (contract    │
└─────────────┬───────────────┘        │  owner / escrow release)    │
              │ signTransaction        └──────────────┬──────────────┘
              ▼                                       │ dispatch/refund
┌─────────────────────────────┐                       │
│       Next.js storefront    │                       │
│  lib/stellar/* (see §4)     │                       │
│   - account.ts  readiness   │                       │
│   - simulate.ts  preflight  │                       │
│   - indexer.ts  getEvents   │                       │
│   - checkout.ts  flow       │                       │
└──────────────┬──────────────┘                       │
               │  JSON-RPC                            ▼
               ▼                        ┌─────────────────────────────┐
     ┌────────────────────┐             │  Checkout Soroban contract  │
     │  Soroban RPC       │◀───────────▶│  (order registry + escrow)  │
     │  getEvents /       │             └──────────────┬──────────────┘
     │  simulate / send   │                            │ SEP-41 transfer
     └────────────────────┘                            ▼
             │                              ┌─────────────────────────┐
             ▼                              │  Stellar Asset Contract  │
       Stellar testnet/mainnet              │  (USDC SAC, native XLM)  │
       (ledger of record)                   └─────────────────────────┘
```

Two systems cooperate:

1. **On-chain (Soroban)** — the checkout contract owns the order lifecycle and
   the escrow. It is the single source of truth for whether an order is
   Pending, Paid, Shipped, or Refunded.
2. **Off-chain (Next.js)** — the storefront never holds keys. It builds
   unsigned transactions, simulates them, asks Freighter to sign, and monitors
   the chain for events.

Because the storefront holds no custody, ShoeSafari is a genuinely
non-custodial checkout: funds move directly `buyer → contract → merchant`
(or `buyer → contract → buyer` on refund).

---

## 2. The Soroban contract

`contracts/checkout` — a single contract with four responsibilities.

### 2.1 Order registry

Orders are stored under a persistent `DataKey::Order(BytesN<32>)`, keyed by a
32-byte `order_id`. The frontend SHA-256 hashes a human-readable id
(`SS-1699…`) so arbitrary strings map cleanly to 32 bytes.

```rust
pub struct Order {
    pub buyer:     Address,
    pub amount:    i128,     // raw token units
    pub token:     Address,  // the SEP-41 contract used
    pub timestamp: u64,      // ledger timestamp of last transition
    pub status:    Status,   // Pending | Paid | Shipped | Refunded
}
```

Every read/write path extends the entry TTL (live-until), so order records do
not evaporate mid-lifecycle. Low-frequency, explicit-identity data (orders) is
the right fit for persistent storage; high-frequency hot data is deliberately
kept out of the contract.

### 2.2 Multi-token support via the Stellar Asset Contract

The contract accepts any SEP-41 token the merchant whitelists with
`add_token`. Two deployments matter in practice:

| Token      | Type             | Contract id (testnet)                                        | Trustline needed? |
| ---------- | ---------------- | ------------------------------------------------------------ | ----------------- |
| USDC       | SAC credit asset | `CBIELTK…HMXQDAMA`                                           | Yes               |
| Native XLM | SAC native asset | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` ¹ | No                |

¹ `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` is **verified
empirically** by simulating `balance` (returns 100,000,000,000 for a 10,000 XLM
account) and `decimals` (7) against soroban-testnet.stellar.org. The native
asset contract id is deterministic but is _not_ a plain
`SHA-256(networkPassphrase ‖ Asset::Native XDR)`; it is the hash of the
`HashIDPreimage::ENVELOPE_TYPE_CONTRACT_ID_FROM_ASSET` XDR structure per
[stellar-xdr](https://github.com/stellar/stellar-xdr/blob/master/Stellar-transaction.x).
Prefer `stellar contract id asset --asset native --network testnet` over
recomputing it by hand. Mainnet id: `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`.

The contract speaks to every token through the same SEP-41 `transfer` interface
(`TokenClient`), so adding a new currency is a merchant `add_token` call plus a
frontend registry entry — no new code.

### 2.3 Escrow with merchant-dispatch and on-chain refund

This is the core design decision. Funds never go straight to the merchant.

- `pay(token, buyer, order_id, amount)` → `buyer → contract` (escrow),
  order → `Paid`. Emits `payment_received`.
- `dispatch(order_id)` → `contract → merchant`, order → `Shipped`.
  Merchant-authorized. Irreversible.
- `refund(order_id)` → `contract → buyer`, order → `Refunded`.
  Merchant-authorized (the merchant is the party deciding fulfilment).

Guarantees:

- **No double-spend**: an order can only transition `Pending → Paid` once;
  `pay` on a Paid/Shipped/Refunded order is rejected with `OrderAlreadyPaid`.
- **No lost funds**: escrow can only be released to the merchant or returned to
  the recorded buyer — never to an arbitrary third party.
- **Auditable**: every transition emits a contract event; the full history is a
  public, replayable log (see §4.4).

### 2.4 Token whitelist & auth model

- `add_token` / `remove_token` are merchant-only (`merchant.require_auth()`),
  so the merchant controls exactly which tokens can fund orders.
- `buyer.require_auth()` on `pay`/`create_order` means a buyer cannot be charged
  without their signature.
- `dispatch`/`refund` are merchant-only, so only the merchant can move funds
  out of escrow.

### 2.5 Test strategy

The test suite uses a self-contained mock SEP-41 token **and** the real Stellar
Asset Contract for native XLM (`env.register_stellar_asset_contract_v2`) plus
`StellarAssetClient::mint`. This means native-XLM flows are tested against the
real token semantics, not a mock. Error cases are asserted via the generated
`try_*` client methods.

---

## 3. Why native XLM + USDC together

Two tokens, one rail:

- **USDC** is what merchants want to price in and what buyers expect to spend.
- **Native XLM** is the gas of the network — and, via the SAC, a real
  spendable asset. Because buyers must hold XLM anyway to pay fees, accepting
  XLM as payment lets under-banked buyers pay with the wallet they already have
  (e.g. via an in-app trade XLM→USDC only when the merchant actually wants
  USDC).

Pricing is always computed off-chain in the storefront (in raw units);
the contract does not need an oracle because it escrows **exactly** the amount
the transaction was built with and the buyer signed for.

---

## 4. Frontend Stellar utilities (`lib/stellar/*`)

### 4.1 `account.ts` — readiness checks

Before building a transaction we verify the buyer is actually able to pay:

| Check              | Mechanism                                                 | Why it matters                        |
| ------------------ | --------------------------------------------------------- | ------------------------------------- |
| Account exists     | `server.getAccount`; friendbot on testnet                 | Soroban needs a sequence number       |
| Native XLM reserve | `server.getAccountEntry(...).balance()` ≥ 1 XLM           | Fees + footprint come out of XLM      |
| Trustline (USDC)   | `server.getAssetBalance(pubkey, new Asset(code, issuer))` | SAC credit assets require a trustline |
| Token balance      | SAC `balance` via simulation (`readTokenBalance`)         | Enough funds for the amount           |

`assertPaymentReady` returns a structured report and, in strict mode, throws a
`WalletError` with a human-readable, actionable message — so the checkout
explains _why_ a payment can't proceed instead of failing at signing time.

### 4.2 `simulate.ts` — pre-flight simulation & resource fees

Every payment is simulated twice on the RPC:

1. `simulateTransaction` → a `SimulationReport`:
   - `minResourceFee` (stroops) — the fee to cover the Soroban footprint,
   - `instructions`, `diskReadBytes`, `writeBytes` — the resource budget,
   - simulation errors (insufficient balance, bad args) surfaced _before_
     the buyer signs,
   - a recommended classic inclusion fee from `getFeeStats`.
2. `prepareTransaction` → attaches the footprint, auth entries, and fee.

Fees are reported in the UI after payment so the real cost of the operation is
transparent. The classic inclusion fee is budgeted as
`max(recommended, minResourceFee) + buffer`.

### 4.3 `indexer.ts` — real-time event indexing (`getEvents`)

`PaymentEventIndexer` polls `server.getEvents` cursor-paginated for the checkout
contract and decodes `pay`, `create_order`, `dispatch`, and `refund` events.

- **First connect**: backfills from `latestLedger - 100` to catch any payments
  that landed before the page opened.
- **Steady state**: advances by cursor (no ledger-range + cursor mixing), so no
  event is double-read or skipped.
- **Decoding**: `topics[0]` is the event symbol; topics + data-map values are
  decoded to strings (`scValToString`). Event ids dedupe on the client in a
  FIFO window capped at 5,000 IDs. Cursor retries and adjacent poll overlaps
  are deduplicated while retained; older IDs can be replayed after eviction.
- **Retention**: if the RPC's retention window rejects a backfill ledger, the
  window rolls forward toward the tip and recovers.

The checkout page runs one of these monitors for the active order id
(`StellarOrderWatch`) and shows a live, decoded confirmation the moment the
`pay` event lands — independent of the classic `getTransaction` polling used
during submission.

### 4.4 `checkout.ts` — the payment flow

```
ensureNetwork ─▶ assertPaymentReady ─▶ build invoke("pay")
  ─▶ simulate + prepare ─▶ Freighter sign ─▶ sendTransaction
  ─▶ waitForTransaction ─▶ decodePaymentEvent ─▶ result
```

The returned `PayResult` carries the preflight fee report, the on-chain ledger,
and the decoded receipt.

#### Checkout states and recovery

The page moves through these states while handling one quoted order:

| State | What happens | Next state or action |
| --- | --- | --- |
| **Preparing** | Checkout verifies the signed quote, checks the wallet network, account, trustline and balance, then simulates and prepares the transaction. | Any failed check stops before wallet submission; correct the issue and request a current quote. |
| **Awaiting signature** | Freighter asks the buyer to sign the prepared transaction. | Approval submits that signed transaction. A wallet rejection stops the attempt before submission. |
| **Submitted / pending** | RPC accepts the transaction, and the browser saves its public hash and order reference in local storage while it waits for a final result. | A confirmed successful transaction proceeds to receipt verification. If polling or the browser is interrupted, use **Check saved payment status** to look up the same hash. |
| **Confirmed** | The transaction succeeds and its payment event is decoded and checked against the order. | Checkout reports payment complete and clears the saved pending reference. |
| **Failed** | The network reports a final failed result. | The saved reference is cleared; after confirming the failure, the buyer may start a new checkout attempt. |
| **Uncertain** | RPC cannot be reached or polling times out after submission. This does not prove failure. | Keep the displayed transaction hash and check that same hash again. Do not submit another payment while the result is uncertain. |

The browser's saved pending reference contains the hash and order metadata, not
wallet secrets. A successful chain transaction is authoritative even if saving
the off-chain order record later fails; use the
[payment reconciliation runbook](PAYMENT_RECONCILIATION.md) to investigate.
The checkout button remains unavailable while a saved payment is pending, so
recovery checks the original transaction instead of automatically submitting
a duplicate.

---

## 5. Public-good blueprint

This project is intentionally built to be copyable:

1. **Open standards only.** SEP-41 tokens, the SAC, contract events, and the
   standard RPC interface — nothing proprietary.
2. **Non-custodial by construction.** The storefront never holds private keys;
   there is no hot wallet to attack. The only "custody" is the smart contract
   escrow, which is public, auditable code.
3. **Refundable.** Merchant-triggered on-chain refunds mean buyers are not
   locked out of their funds — a common objection to crypto payments.
4. **Transparent.** Every payment is a public event; reconciliation is a `getEvents`
   query away. `StellarOrderWatch` proves this in the UI.
5. **Multi-currency ready.** Adding a token is a whitelist call + a config row.
6. **Environment-driven.** Network, RPC, contract, and token ids all come from
   env vars (`.env.local`), so the same codebase runs on testnet, mainnet, or
   a local standalone node.
7. **Efficient.** Orders are low-frequency, identity-keyed data; the contract
   avoids hot storage, keeps a modest footprint, and the frontend budgets fees
   up front.

## 6. Operations notes

- **Deployment**: `stellar contract deploy` then `initialize` (set merchant),
  then `add_token` for each accepted token (see `contracts/checkout/README.md`
  for the exact CLI invocations).
- **Dispatch / refund**: the merchant triggers these from their own tooling
  using the `dispatch`/`refund` contract calls (CLI or a small merchant script).
- **Verifying contract ids**: never trust a token contract id from a website.
  Derive it from the issuer's `Asset` XDR (or copy from the asset issuer), and
  confirm native SAC ids with a simulated `balance` call against the RPC. For
  native XLM prefer `stellar contract id asset --asset native --network testnet`
  over hand-computing the `HashIDPreimage::ENVELOPE_TYPE_CONTRACT_ID_FROM_ASSET`
  hash.
- **Mainnet native SAC id** differs from testnet; use
  `stellar contract id asset --asset native --network mainnet` (current value
  `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA` is taken from the
  stellar-cli built-in alias table) and confirm it against live RPC before first
  use (see `lib/stellar/config.ts`).

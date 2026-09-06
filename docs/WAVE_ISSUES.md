# Drips Wave issue backlog

This document is the maintainer source for creating focused issues for the
Stellar Wave Program. Each issue should be copied into GitHub, assigned an
honest Drips complexity level, and added to a Wave only when the maintainer can
review it during that cycle.

Every issue must include its context, scope, relevant files, acceptance
criteria, tests, and out-of-scope notes. Contributors should be assigned before
starting work and PRs should include `Closes #<issue-number>`.

## High complexity — 200 points

### Add native XLM payment selection alongside USDC

**Impact:** Demonstrates that the same checkout architecture supports both a
stablecoin and Stellar's native asset.

**Scope:** Add token selection to the checkout, use the existing token registry
and readiness helpers, display the selected asset and amount, and document the
testnet flow.

**Acceptance criteria:**

- A shopper can select USDC or native XLM on testnet.
- Readiness checks use the selected token and correct decimals.
- The signed Soroban invocation uses the selected token contract.
- Tests cover both token choices and insufficient balances.
- Documentation explains the asset and network assumptions.

**Out of scope:** Mainnet launch, fiat conversion, or adding arbitrary tokens.

### Make on-chain and commerce order status synchronization resilient

**Impact:** Keeps merchant and customer views accurate when event polling,
Firestore writes, or a browser session is interrupted.

**Scope:** Reconcile `Paid`, `Shipped`, and `Refunded` state using the contract
record and indexed events, make updates idempotent, and surface conflicts.

**Acceptance criteria:**

- Repeated events do not duplicate or regress an order.
- A missed browser callback can be recovered from the chain.
- Firestore status never claims settlement without an on-chain reference.
- Tests cover duplicate, delayed, and out-of-order events.

**Out of scope:** Replacing Stellar as the payment source of truth.

## Medium complexity — 150 points

### Add transaction timeout recovery and retry states

Improve the checkout UI for pending, timeout, rejected, and confirmed
transactions without allowing accidental duplicate payment attempts.

### Add Firestore Security Rules for products and orders

Restrict product writes and admin operations, allow customers to read only their
own orders, validate order fields, and document the required Firebase admin
role/custom-claim setup.

### Add customer fulfillment status from merchant actions

Show `Paid`, `Shipped`, and `Refunded` consistently in the customer order page,
including a transaction link and a clear explanation of escrow state.

### Add checkout integration tests

Cover cart totals, order persistence, payment failure handling, and successful
receipt rendering with mocked Firebase and Stellar boundaries.

## Trivial — 100 points

### Add a testnet checkout walkthrough

Document prerequisites, Freighter setup, testnet funding, trustline/balance
checks, payment confirmation, explorer verification, and refund/dispatch
behavior with current screenshots.

### Add contributor onboarding and issue labels

Document the local frontend and contract setup, define labels for `frontend`,
`stellar`, `soroban`, `security`, `testing`, and `documentation`, and verify
that a clean checkout can run the documented checks.

## Maintainer operating checklist

- Review applications daily during a Wave.
- Assign one contributor per issue after checking fit and scope.
- Answer blockers quickly and keep acceptance criteria stable.
- Review and merge qualifying PRs before the Wave deadline.
- Mark completed issues resolved in Drips/GitHub before the cycle closes.
- Leave an honest review within the review window.

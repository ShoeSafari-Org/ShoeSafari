# Contributing to ShoeSafari

First off — thank you for considering a contribution. ShoeSafari is an
open-source, reference-architecture storefront on the Stellar network, and the
project lives or dies by community contributions like yours.

This project is **actively tracked for milestones and bounties on the GrantFox
platform**. That means your work can be scoped, reviewed, and rewarded through
GrantFox's native issue and milestone tracking — not just merged silently.

ShoeSafari is also being prepared for the **Stellar Drips Wave** ecosystem. The
goal is to make Stellar USDC useful in everyday commerce and to give builders a
clear, working example they can fork. Contributions should improve one of three
things: the shopper experience, the Stellar/Soroban integration, or the
documentation that helps another merchant adopt it.

Please take a minute to read this guide. It keeps contributions fast to review,
easy to test, and consistent across the frontend and the Rust contract.

The current Wave-ready issue backlog is maintained in
[docs/WAVE_ISSUES.md](docs/WAVE_ISSUES.md). Issues copied from that backlog must
still be reviewed for current relevance and assigned an honest complexity level
before they are added to a Wave.

---

## Table of Contents

- [How Milestones & Issues Work on GrantFox](#how-milestones--issues-work-on-grantfox)
- [The 5-Step Contribution Pipeline](#the-5-step-contribution-pipeline)
- [Code Formatting](#code-formatting)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Style](#commit-message-style)
- [Pull Request Checklist](#pull-request-checklist)
- [Code of Conduct](#code-of-conduct)

---

## How Milestones & Issues Work on GrantFox

We track the roadmap, open issues, and funded bounties natively on the GrantFox
platform:

- **Issues** — scoped, actionable work items (bugs, improvements, new features).
- **Milestones / Bounties** — funded deliverables tied to one or more issues,
  with defined acceptance criteria and reward amounts.
- **Proposals** — larger architectural ideas. Post one in the discussions if you
  want to shape the roadmap before writing code.

A common misconception: bounty work is not "first to merge wins." It is
**reviewed on quality**, so a well-tested, well-documented PR that satisfies the
acceptance criteria wins over a faster, sloppier one.

## The 5-Step Contribution Pipeline

### What is especially useful right now

- End-to-end Stellar testnet checkout testing and better error recovery.
- Product, cart, and order improvements that make the demo feel like real commerce.
- Merchant tools for dispatching, refunding, and tracking escrow orders.
- Security rules, accessibility, automated tests, and deployment documentation.

### Step 1 — Find an open issue in the repository

Browse the open issues on GitHub (and cross-referenced GrantFox milestones).
Good first issues are usually labeled `good first issue`. If an issue is already
assigned, respect the assignee — ask before picking it up.

### Step 2 — Apply for the corresponding bounty / milestone on GrantFox

If the issue belongs to a funded milestone or bounty, **apply for it on
GrantFox first**. Applying signals intent, links your identity to the work, and
unlocks reward tracking. Don't start the implementation before your application
is acknowledged for funded work.

### Step 3 — Create a feature branch

Branch from the latest `main`. Use a short, descriptive name that matches the
work:

```bash
git checkout main
git pull origin main
git checkout -b feat/payment-retry          # a new feature
# or
git checkout -b fix/order-already-paid-race  # a bug fix
# or
git checkout -b docs/stellar-contract-readme # documentation
```

Branch naming conventions:

| Prefix   | Use for                              | Example                         |
| -------- | ------------------------------------ | ------------------------------- |
| `feat/`  | New features                         | `feat/payment-retry`            |
| `fix/`   | Bug fixes                            | `fix/wrong-total-on-mobile`     |
| `docs/`  | Documentation only                   | `docs/soroban-deploy-guide`     |
| `refactor/` | Code changes with no behavior change | `refactor/stellar-lib-modules`  |
| `test/`  | Adding or updating tests             | `test/pay-dup-order-cases`      |

### Step 4 — Write clean code with testing

- Follow the style and structure of the surrounding code.
- Add tests that cover the behavior you changed — see
  [Testing Guidelines](#testing-guidelines).
- Run the local checks below before committing. If they pass, commit.
- Never commit secrets, `.env` files, or `node_modules`.

### Step 5 — Open a Pull Request (PR) for review

```bash
git push -u origin feat/payment-retry
```

Then open a PR against `main`:

- **Title:** a short summary using a Conventional Commit prefix, e.g.
  `feat: add payment success alert`.
- **Description:** link the issue/bounty, summarize the change, list how it was
  tested, and note any acceptance criteria you satisfied.
- Reference the GrantFox milestone/bounty id in the description so reviewers can
  tie the PR back to the funded work.

Once reviewers approve, maintainers merge. For funded milestones, completion is
confirmed against the acceptance criteria on GrantFox.

---

## Code Formatting

Formatting is enforced to keep review diffs clean. Both frontend and contract
code must be formatted before pushing.

### JavaScript / TypeScript (frontend)

- **Prettier** for formatting (`npx prettier --write "app/**/*.{js,jsx,ts,tsx}" "lib/**/*.ts" "components/**/*.{js,jsx}"`).
- **ESLint** via the Next.js lint script for correctness:

```bash
npm run lint
```

- TypeScript must typecheck with zero errors:

```bash
npx tsc --noEmit
```

### Rust (contract)

- **rustfmt** for formatting:

```bash
cd contracts/checkout && cargo fmt -- --check
```

- **clippy** for lints:

```bash
cd contracts/checkout && cargo clippy --all-targets -- -D warnings
```

> `-- -D warnings` promotes every warning to an error — fix or justify each one.

## Testing Guidelines

### Smart Contract Tests (Rust)

**The contract must be tested.** The Rust contract ships with a mock-token test
suite in `contracts/checkout/src/test.rs`. Run it before every PR that touches
`contracts/`:

```bash
cd contracts/checkout && cargo test
```

- Add a test for every new contract function and every new error path.
- When behavior changes, update existing tests — don't delete coverage.
- Tests run offline against a mock token; no network or funded account needed.

### Frontend Tests (TypeScript/JavaScript)

**The frontend uses Vitest** for unit and integration tests. Run tests before every PR:

```bash
# Run all tests once
npm run test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with interactive UI
npm run test:ui
```

**Test file locations:**
- Unit tests: `tests/lib/` for library functions
- Component tests: `tests/components/` for React components
- Tests should be named `*.test.ts` or `*.test.tsx`

**What to test:**
- Utility functions (validation, formatting, etc.)
- Custom hooks
- Component behavior (user interactions, state changes)
- Error handling paths

**Example test:**

```typescript
import { describe, it, expect } from "vitest";
import { validateEmail } from "../../lib/validation";

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("test@example.com").isValid).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("not-an-email").isValid).toBe(false);
  });
});
```

### Type Safety and Build

```bash
npm run type-check   # TypeScript type checking
npm run lint         # ESLint checks
npm run build        # Production build must succeed
```

### Manual QA for Payment Changes

If your PR touches the Stellar payment flow, describe in the PR how you tested
it against testnet (Freighter + USDC faucet account). Follow the flow in the
root [README](README.md#paying-with-usdc-testnet).

## Commit Message Style

Use **Conventional Commits**. This keeps the changelog readable and lets
tooling detect releases automatically.

```
<type>(<optional scope>): <short summary>
```

| Type       | Meaning                                  |
| ---------- | ---------------------------------------- |
| `feat`     | A new user-facing feature                |
| `fix`      | A bug fix                                |
| `docs`     | Documentation only                       |
| `refactor` | Code change with no behavior change      |
| `test`     | Adding or updating tests                 |
| `chore`    | Build tooling, deps, config              |

Examples:

```bash
feat: add payment success alert
fix(checkout): reject duplicate order ids before transfer
docs: add soroban contract deployment guide
test: cover invalid-amount rejection in pay
chore: bump @stellar/stellar-sdk to 16.2.0
```

Rules:

- Imperative mood, lowercase after the type, no trailing period.
- Summary under ~72 characters. Add a body explaining *why* when it's not
  obvious.
- One logical change per commit. Prefer several focused commits over one large
  one.

## Pull Request Checklist

Before opening a PR, verify:

- [ ] Linked to the GitHub issue and GrantFox milestone/bounty id.
- [ ] Branch name follows the naming convention.
- [ ] Code formatted (`npm run format` / `cargo fmt`).
- [ ] Lints pass (`npm run lint`, `cargo clippy -- -D warnings`).
- [ ] Typecheck passes (`npm run type-check`).
- [ ] Frontend tests pass (`npm run test`).
- [ ] Contract tests pass (`cd contracts/checkout && cargo test`).
- [ ] Build succeeds (`npm run build`).
- [ ] New behavior has tests; existing tests updated where needed.
- [ ] No secrets, `.env` files, or build artifacts in the diff.
- [ ] README/docs updated if behavior or config changed.

## Code of Conduct

We are committed to providing a welcoming, collaborative environment for
everyone — regardless of experience, background, or identity.

**Our expectations:**

- **Be respectful.** Disagreement on code is normal; keep it about the code.
- **Be constructive.** In reviews, explain *why*; in replies, be open to
  alternatives.
- **Be patient.** Maintainers and contributors volunteer their time; reviews may
  take a few days.
- **Give credit.** Acknowledge prior art and the work of others.

**Unacceptable behavior** includes harassment, personal attacks, trolling,
doxxing, and any form of discrimination. Maintainers may remove comments, close
PRs, or ban individuals who violate these standards.

**Reporting:** contact the maintainers via a GitHub issue (labeled
`report`/private) or through GrantFox. All reports are taken seriously and
reviewed confidentially.

---

*Happy building — and see you on GrantFox.*

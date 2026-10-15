# Checkout contract release checklist

Use this checklist when changing the deployed Soroban checkout contract. A
frontend release and a contract release are separate operations: publishing a
new Next.js build does not change an already deployed contract, and deploying
a new contract does not move orders or escrow from the old one.

## Decide whether a contract deployment is needed

- [ ] Review the code change and identify whether it changes the on-chain WASM
  or only the frontend.
- [ ] For a frontend-only release, keep the existing contract ID and follow
  the normal frontend release process.
- [ ] For an on-chain change, plan a new contract deployment. The checkout
  contract does not expose an in-place WASM upgrade entry point, so treat the
  deployed code as immutable.
- [ ] Record the current and proposed contract IDs, network, release commit,
  approver, and reason for the change.

## Check compatibility and outstanding orders

- [ ] Review contracts/checkout/src/order.rs, storage.rs, and lib.rs for
  changes to order fields, storage keys, status values, events, and entrypoint
  arguments.
- [ ] Compare the proposed contract's read/write behavior with the deployed
  contract. A new contract has separate storage; existing orders, pending
  intents, escrow balances, and refund/dispatch rights remain on the old
  contract.
- [ ] Use the old contract's order/status reads and the admin order records
  to inventory outstanding Pending and Paid orders. Do not switch the
  storefront to a new contract while paid escrow still needs dispatch/refund.
- [ ] Agree on how existing orders will be completed on the old contract.
  There is no automatic migration or transfer of escrow to a replacement
  contract.
- [ ] Confirm the new contract supports the required token and merchant
  configuration before changing the frontend.

## Deploy and configure on testnet first

- [ ] Build and test the reviewed source using the commands in
  contracts/checkout/README.md.
- [ ] Deploy a fresh contract on testnet, initialize it once, and configure
  its token allowlist and any approval policy.
- [ ] Verify the deployed contract ID, merchant, and each allowed token with
  read calls on testnet. Verify values against the official token issuer or
  Stellar Asset List; do not copy an address from an untrusted message.
- [ ] Exercise the release checks with testnet funds and confirm the expected
  events and order transitions.

## Review and change the configured contract ID

- [ ] Get explicit maintainer review before any mainnet deployment or
  production configuration change.
- [ ] Independently verify the mainnet network, new contract ID, deployer,
  merchant, and token contract IDs. Testnet and mainnet IDs are different.
- [ ] Configure NEXT_PUBLIC_STELLAR_NETWORK=mainnet,
  NEXT_PUBLIC_CHECKOUT_CONTRACT_ID, NEXT_PUBLIC_STELLAR_RPC_URL,
  NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE, NEXT_PUBLIC_USDC_CONTRACT_ID, and
  NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID in the production environment.
  See NETWORK_CONFIGURATION.md for defaults and required values.
- [ ] Change the contract ID only as part of an approved frontend release;
  keep the prior ID and release record for support and outstanding orders.

## Post-deployment checks

- [ ] On the selected network, perform a safe read-only call such as
  merchant, is_token_allowed, or status for a known order.
- [ ] Verify the contract and token addresses in an appropriate network
  explorer and confirm the storefront points at the intended network and
  contract.
- [ ] Check event indexing and admin visibility using existing records.
- [ ] Do not make a real test purchase on mainnet. Use testnet for payment
  flow checks.
- [ ] If verification fails, stop the rollout and follow the rollback decision
  below.

## Rollback decision

Rolling the frontend back to the previous contract ID restores access to the
old contract's records, but it does not undo calls already made to the new
contract or migrate orders between contracts. Keep both IDs documented.
Before switching back, determine whether any order was registered or paid on
the new contract and have the merchant review how it will be completed or
refunded. Escalate uncertain escrow or compatibility cases to the maintainers;
never claim that a frontend rollback reversed an on-chain transaction.

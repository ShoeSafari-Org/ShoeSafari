# Testnet demo release checklist

Use this checklist before publishing a ShoeSafari demo that connects to Stellar.
All payment checks below must use Stellar testnet accounts and test assets only.

## Configuration

- [ ] Copy `.env.local.example` to `.env.local`; keep the local file out of version control.
- [ ] Set `NEXT_PUBLIC_STELLAR_NETWORK=testnet` and verify the configured network passphrase is the testnet passphrase.
- [ ] Deploy the checkout contract to testnet and set `NEXT_PUBLIC_CHECKOUT_CONTRACT_ID` to that deployment.
- [ ] Configure the testnet token addresses and confirm each token is on the same network.
- [ ] Check the app's production environment validator and confirm no production wallet seed or secret is present in browser-visible variables.

## Contract and storefront checks

- [ ] Build and test the checkout contract: `cd contracts/checkout && cargo fmt -- --check && cargo test && cargo clippy --all-targets -- -D warnings`.
- [ ] Initialize the testnet checkout contract with the intended demo merchant and allowlist only the testnet payment tokens.
- [ ] Run `npm run validate:production-env`, `npm run type-check`, `npm run lint`, and `npm test -- --run` from the repository root.
- [ ] Open the storefront using a clean browser profile; verify the network and token shown by the checkout before connecting a wallet.
- [ ] Complete one low-value testnet order and verify its transaction hash, order record, and `Paid` status.
- [ ] On a separate test order, verify the merchant dispatch path and confirm escrow reaches the merchant.
- [ ] On another test order, verify the refund path and confirm escrow returns to the buyer. Never dispatch and refund the same order.
- [ ] Check browser and server logs for errors or accidentally exposed configuration, then remove test customer data from the demo environment.

## Publish and rollback

- [ ] Confirm the demo URL, supported browser, testnet network, and test-token disclaimer are visible to testers.
- [ ] Record the contract ID, network, commit SHA, and test transaction hashes in the release notes. Do not record secret keys.
- [ ] Keep the previous demo build available until the new deployment has passed its smoke checks.
- [ ] If a check fails, disable the demo link, restore the previous build, and investigate using testnet data before re-enabling it.

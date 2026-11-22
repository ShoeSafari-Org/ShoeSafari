# SEP-41 token onboarding checklist

Use this checklist for every new checkout asset. Start on Stellar Testnet and
keep the storefront's non-custodial payment flow unchanged: the merchant
allowlist authorizes a token, while the buyer's wallet authorizes payment.

## Verify before configuration

- Record the network, token contract ID, issuer (when the asset is issued),
  and expected decimals from the token's verified source.
- Confirm the contract implements the required SEP-41 calls and that the
  contract ID, issuer, and decimals agree with a trusted explorer and the
  Testnet deployment. Do not infer decimals from an amount or ticker symbol.
- Confirm the checkout interface version and that the token is allowed only
  on the intended network. Never reuse a Testnet asset on Mainnet.
- Use a placeholder or funded Testnet account for verification; never put
  seeds, API keys, or production customer data in commands, logs, fixtures,
  or screenshots.

## Testnet-first rollout

1. Add the token to the network configuration with its contract ID, decimals,
   issuer, and display metadata.
2. Select the matching Testnet checkout contract and call `is_token_allowed`
   before attempting payment.
3. Have a test buyer create and pay a small order, then verify the raw-unit
   amount, token address, event, order status, and merchant receipt.
4. Exercise dispatch and refund, including invalid-amount and unallowed-token
   failures. Confirm no funds move on a failed simulation.
5. Run focused configuration, quote, checkout, and interface tests. Attach
   transaction links, interface version, network passphrase, decimals, and
   the exact source commit as release evidence.

## Production promotion

Promote only after Testnet evidence is reviewed. Configure a separate Mainnet
token contract, issuer, RPC endpoint, passphrase, and checkout contract.
Re-check decimals and allowlist state on Mainnet; do not copy Testnet IDs or
issuers. Update the network matrix, environment documentation, interface
manifest reference, and release checklist in the same change.

## Removal and rollback

If verification fails or a token behaves unexpectedly, stop onboarding and
remove it from frontend configuration. On the checkout contract, call
`remove_token` with the authorized merchant and verify `is_token_allowed` is
false. Do not delete historical orders or rewrite payment records.

For a deployed frontend regression, roll back to the last verified deployment
and restore the previous configuration. For a contract/configuration issue,
disable the token, preserve transaction evidence, and notify integrators
before re-enabling it. A rollback must name the network, token contract,
issuer, decimals, interface version, source commit, and approver.

## Release evidence

Record the network and passphrase, token contract and issuer, decimals,
allowlist verification, Testnet payment/dispatch/refund results, focused test
output, interface check, deployment IDs, and rollback owner. Review the record
for secrets and personal data before publishing it.

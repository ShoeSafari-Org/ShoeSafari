# Create a Stellar testnet wallet for ShoeSafari

Use this walkthrough to prepare a disposable wallet for checkout development.
It uses Stellar testnet and has no connection to real funds. Testnet assets can
be reset or become unavailable at any time.

## Before you start

- Install [Freighter](https://www.freighter.app/) and follow Stellar's guide to
  [connect Freighter to testnet](https://developers.stellar.org/docs/build/guides/freighter/connect-testnet).
  Freighter's [wallet setup help](https://help.freighter.app/) covers creating
  a wallet and selecting an account.
- Use a browser supported by the Freighter extension. The official
  [Freighter site](https://www.freighter.app/) links to its browser extension
  stores. Use a new test account or another account that contains no production
  funds.
- Read Stellar's overview of [testnet and Friendbot](https://developers.stellar.org/docs/networks).
  Friendbot creates/funds testnet accounts with test XLM only.
- If the checkout uses USDC, ask the project maintainer for the approved
  testnet USDC funding route. The account must also authorize a trustline for
  the configured testnet USDC asset. The storefront's current testnet issuer
  and contract ID are listed in [`NETWORK_CONFIGURATION.md`](NETWORK_CONFIGURATION.md).
  Stellar's guide explains [trustlines](https://developers.stellar.org/docs/build/guides/basics/verify-trustlines),
  and [Circle lists its Stellar USDC networks](https://www.circle.com/multi-chain-usdc/stellar).
  Native XLM does not need a trustline.

## Set up the wallet

1. Install Freighter only from its [official website](https://www.freighter.app/)
   or the browser extension store linked there. Create a new wallet for
   testing, or select an account reserved for testnet work.
2. Switch the Freighter network to **Testnet**. Check the network label again
   before each transaction; do not approve checkout transactions while
   Freighter is set to Mainnet.
3. Copy the account's **public address**. It starts with `G` and is safe to use
   when checking funding or sharing a testnet transaction. Never share or enter
   a secret key, recovery phrase, or wallet export in ShoeSafari, an issue, a
   support request, or a test report. The checkout only needs Freighter to
   approve a transaction.
4. Fund the account with test XLM. Use Freighter's testnet funding prompt or
   the official [Stellar Friendbot](https://friendbot.stellar.org/) with the
   public address. Wait for funding to appear in the wallet. Friendbot provides
   XLM for fees and account reserves; it does not provide USDC.
5. For a USDC checkout, follow the maintainer-approved testnet USDC process
   from the prerequisites. Verify the USDC balance and trustline in Freighter.
   For an XLM checkout, test XLM is enough, subject to the displayed amount and
   network fee.

## Make a test checkout

1. Configure the app for testnet using the
   [network setup guide](NETWORK_CONFIGURATION.md), and open a test product or
   order. The checkout contract must be deployed on testnet and the merchant
   must have allowlisted the selected token.
2. Connect the test wallet. Confirm the app and Freighter both show **Testnet**.
   Check the selected asset, amount, and fee before approving.
3. Approve the transaction in Freighter. A successful checkout shows a
   transaction hash. Verify it on a [Stellar testnet explorer](https://stellar.expert/explorer/testnet/)
   and confirm the order reached `Paid`.
4. Finish the test order through the test merchant's dispatch or refund flow so
   its escrow is released. Keep testnet hashes and public addresses only in
   development notes; never include credentials.

For contract deployment and CLI-based checkout validation, see the
[checkout contract README](../contracts/checkout/README.md) and the
[testnet checkout validation checklist](TESTNET_CHECKOUT.md).

# Testnet checkout validation

Use this checklist before merging changes to the Stellar payment flow. It uses
Stellar testnet and test assets only. Do not use a production wallet, contract,
asset, credential, or customer order.

## Configure a test environment

1. Set `NEXT_PUBLIC_STELLAR_NETWORK=testnet` and the testnet checkout contract
   ID in `.env.local`. Leave the RPC URL and passphrase unset to use the
   verified testnet defaults in `lib/stellar/config.ts`.
2. Confirm the configured checkout contract is deployed and initialized on
   testnet, and that the merchant has whitelisted the testnet USDC and native
   XLM contracts. Deployment instructions are in
   [`contracts/checkout/README.md`](../contracts/checkout/README.md).
3. In Freighter, select **Testnet** and create or select a disposable test
   account. Fund it with test XLM from Friendbot, for example:

   ```bash
   stellar keys generate shoesafari-test --network testnet --fund
   ```

   Friendbot funds XLM only. It does not provide USDC.
4. For USDC testing, obtain a testnet USDC balance and trustline using the
   project's approved testnet asset process. Confirm the trustline is
   authorized and the account has enough test tokens in Freighter. Native XLM
   needs no trustline. The checkout readiness check reports missing trustlines,
   insufficient token balance, or insufficient XLM reserve before signing.

## Run one checkout

1. Start the storefront with the testnet environment and open a disposable
   product/order. Record its order reference and selected test token.
2. Connect the test Freighter account. Confirm Freighter still shows **Testnet**
   and that the checkout's network matches it before approving.
3. Review the cart amount and estimated network fee separately. Reject any
   transaction if the wallet shows a production network or unexpected amount.
4. Sign once in Freighter. Wait for the checkout result and copy the transaction
   hash from the success receipt/explorer link. Verify it reaches `SUCCESS` on
   Stellar testnet and that the contract event matches the receipt:

   - `PaymentReceived`: `pay`, token contract, buyer, merchant, order ID;
     `amount` is the raw token integer.
   - Check the transaction hash and ledger number against the receipt.
   - Confirm the order is `Paid` and escrow is held by the checkout contract.

5. In the test merchant's admin orders page, dispatch this paid test order.
   Verify `OrderShipped` and `Shipped` status, and that the escrow amount was
   released to the configured test merchant.
6. Create a second disposable order and refund it instead of dispatching. Verify
   `OrderRefunded` and `Refunded` status, and that the amount returned to the
   recorded buyer. A paid order cannot be both dispatched and refunded.

## Recovery and cleanup

- If the browser loses the response after signing, use the checkout's pending
  payment recovery prompt to check the saved transaction hash. Do not submit a
  second payment until the first transaction has a final testnet status.
- If a transaction fails, keep its hash and error details with the test notes;
  failed transactions do not complete the order payment.
- Finish each successful test order through dispatch or refund so no test funds
  remain escrowed. Unpaid `Pending` order records hold no tokens and can be
  discarded from the test run.
- Remove test-only order data from any local fixtures or development database
  when the test is complete. Never copy production customer data into fixtures.

## Pre-merge record

Record the testnet network, token, order reference, transaction hash, final
status, and expected event fields in the PR. Redact wallet addresses if the
account is shared. Do not include seed phrases, secret keys, access tokens, or
production configuration values.

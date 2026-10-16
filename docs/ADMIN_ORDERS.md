# Merchant dispatch and refund runbook

Use this runbook to fulfil a paid order from the admin orders page. Confirm the
network before every wallet action. For a testnet rehearsal, use testnet
contracts and test assets only; do not use production funds or customer data.

## Before acting

1. Sign in with an account allowed by the admin email configuration and open
   `/admin/orders`.
2. Check the network shown on the page and compare it with the network selected
   in Freighter. Confirm the checkout contract ID is the intended deployment.
   The merchant wallet must be the initialized merchant for that contract.
3. Locate the order by its order ID. Verify the buyer, token, amount, payment
   transaction hash, and on-chain status. Only act on an order whose chain
   status is `Paid`; Firestore commerce details are supplementary context.
4. Open the payment transaction in Stellar Expert using the network shown by
   the app. Confirm it succeeded and that its `pay` event identifies the
   expected token, buyer, merchant, order ID, and raw amount.
5. Decide whether the order should be dispatched or refunded. The two outcomes
   cannot both be applied to the same paid order. The page starts wallet
   signing as soon as you select **Ship** or **Refund**, so check the row and
   action before continuing in Freighter.

## Dispatch an order

1. Select **Ship** for the verified `Paid` order.
2. Review the Freighter transaction details and confirm its network before
   signing with the merchant account. Dispatch releases the escrowed tokens to
   the merchant and permanently changes the contract status to `Shipped`.
3. Wait for the page to report success and for the order event/indexer to show
   `Shipped`. Record the dispatch transaction hash and verify its successful
   ledger entry and `dispatch` event on the matching Stellar network.
4. Communicate the fulfilment status to the customer using the normal support
   workflow. Do not promise a refund after a successful dispatch; the contract
   will reject it.

## Refund an order

1. Select **Refund** for the verified `Paid` order.
2. Review the Freighter transaction details and confirm its network before
   signing with the merchant account. Refund returns the escrowed amount to the
   buyer and permanently changes the contract status to `Refunded`.
3. Wait for the page to report success and for the order event/indexer to show
   `Refunded`. Record the refund transaction hash and verify its successful
   ledger entry and `refund` event on the matching Stellar network.
4. Tell the customer that the on-chain refund was submitted and provide the
   transaction hash. Do not refund the same order a second time.

## High-value approval policy

If a token has a high-value approval policy configured, the contract also
requires the configured approver to authorize a qualifying dispatch or refund
transaction. The current admin page asks the connected merchant wallet to
sign; it does not collect a second approval. Coordinate the required
co-signature through the configured multi-signer wallet or transaction
workflow before using the page. Do not retry a rejected transaction as a
single-signer action.

## Pending confirmation and recovery

The page submits the signed transaction and polls Stellar RPC for up to the
configured transaction timeout. If it reports a timeout, keep the transaction
hash from the wallet or explorer and check that hash on the same network. A
timeout does not prove the operation failed. Wait for a final `SUCCESS` or
`FAILED` result before attempting another action. If it succeeded, wait for
the event indexer to refresh the order. If it failed, inspect the transaction
result and resolve the cause before retrying.

The on-chain checkout contract is authoritative for payment and escrow status.
Firestore stores customer, item, and commerce data and receives an asynchronous
status mirror after a successful action. A Firestore write warning does not
reverse a confirmed chain action; verify the chain event first, then reconcile
the commerce record through the normal support process.

## Verification record

For each action, retain the order ID, network, action, token and amount, final
contract status, transaction hash, and ledger number in the approved
operations record. Share only the information needed to resolve the order; do
not record seed phrases, private keys, or production secrets.

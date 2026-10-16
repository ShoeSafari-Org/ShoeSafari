# Pending or missing payment reconciliation

Use this runbook when checkout was interrupted after submission, the browser
did not show a confirmation, or an order appears to be missing. A browser or
RPC timeout is not proof that a transaction failed. Verify the transaction on
the correct network before changing an order's status or asking the buyer to
retry.

## 1. Collect the minimum lookup details

Ask for the order ID and, if available, the 64-character transaction hash
shown by the wallet or saved by checkout. Confirm whether the buyer used
testnet or mainnet. Do not ask for a seed phrase, secret key, wallet export,
or signed transaction secret.

If a hash is unavailable, use the order ID and the expected checkout contract
to locate the transaction through the relevant network's explorer or event
history. Do not infer payment from a screenshot or an unsigned wallet prompt.

## 2. Check the correct network

Open the hash using the explorer for the network that was used:

- **Testnet:** [Stellar Expert testnet transaction lookup](https://stellar.expert/explorer/testnet/tx/)
- **Mainnet:** [Stellar Expert mainnet transaction lookup](https://stellar.expert/explorer/public/tx/)

The order page may link to the transaction when an off-chain order record
exists. Do not paste a mainnet hash into a testnet lookup or vice versa. A transaction
that is still pending or not found may need more time; repeat the lookup before
deciding it failed.

## 3. Verify before changing order records

For a successful transaction, verify all of the following on-chain:

- [ ] Transaction status is successful and the hash matches the submitted
  hash.
- [ ] Network and ledger match the expected environment.
- [ ] The invoked contract ID is the configured checkout contract for that
  network (NEXT_PUBLIC_CHECKOUT_CONTRACT_ID).
- [ ] The pay event is emitted by that contract and includes the expected
  order ID, buyer, token, merchant, and positive amount.
- [ ] The token contract and amount match the order record and the token
  configured for the selected network.
- [ ] The order's on-chain status is consistent with the event (Paid,
  Shipped, or Refunded).

lib/stellar/events.ts defines the checkout event fields and
contracts/checkout/README.md documents their topics and data. An event from
another contract, an unrelated transfer, or a create_order event alone does
not prove that funds were paid into escrow.

## 4. Decide what to do

| On-chain result | Action |
| --- | --- |
| Transaction is pending or not yet found | Wait and check again on the same network. Do not ask the buyer to submit a duplicate payment while the result is uncertain. |
| Transaction failed | Record the failed result. After confirming no successful payment exists for the order, direct the buyer through the normal checkout flow. |
| Successful matching pay event, but the app has no order | Escalate the verified transaction hash and order data to an authorized maintainer for approved off-chain reconciliation. This repository has no self-service order repair flow. Do not fabricate or manually mark payment without verification. |
| Successful transaction, but wrong contract, token, buyer, amount, or order ID | Stop and escalate for review. Do not mark the intended order as paid. |
| Matching order is already Shipped or Refunded | Preserve that terminal state. Confirm the chain status and inform the customer through the normal support process. |
| Status or evidence is ambiguous | Escalate to the maintainers before changing any order or initiating another payment. |

Only an authorized maintainer should update off-chain order data, and only
after the on-chain evidence has been recorded. Never submit dispatch or refund
transactions merely to make a UI status match.

## 5. Escalate with limited metadata

Record only what is needed to investigate: order ID, transaction hash, network,
checkout contract ID, token contract ID, expected and observed amount/status,
ledger or timestamp, and the concise error or discrepancy. Do not include
secret keys, seed phrases, full wallet exports, authentication tokens, or
unrelated customer data. Store the record only in the approved support
channel.

# Checkout confirmation timeline

The checkout page shows four ordered, timestamped states:

1. Wallet submission: the signed transaction has been handed to the network.
2. RPC accepted / pending: the network accepted the submission, but finality is
   not known yet.
3. Ledger confirmation: the payment event was matched to this order.
4. Order record saved: Firestore persistence completed, or is marked failed for
   manual reconciliation.

An uncertain RPC result keeps the transaction hash and exposes the existing
saved-payment recovery action. Refreshing the page can reload that pending
record; users must check the transaction before attempting another payment.
The timeline never displays secrets or stores additional payment data.

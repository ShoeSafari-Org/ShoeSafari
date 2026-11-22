# Admin order search

The admin order list searches locally across the safe identifiers already
loaded for the current admin view: customer reference, wallet address, order
hash, transaction hash, and the Firestore document id. Input is normalized to
trimmed lowercase and debounced briefly before filtering, so it does not issue
repeated expensive reads. Results remain limited to the authorized admin view;
no unrelated customer data is fetched for a search.

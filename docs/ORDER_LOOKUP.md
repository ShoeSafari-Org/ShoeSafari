# Bounded order lookup

Merchant tooling can call `orders_page(cursor, limit)` to enumerate order ids
in insertion order. `cursor` is a zero-based index and `limit` must be between
1 and 50; the returned cursor is `None` on the final page. The index stores
only order ids, preserving the existing order records and their uniqueness.

Each returned id is resolved through the canonical order storage, so an order
read extends its persistent TTL. Missing records are skipped, which keeps the
lookup safe if a future cleanup policy removes an order between pages.

# Order support notes

Admins can attach non-sensitive support notes to an order without changing its
immutable payment record. Each note records the order hash, admin UID/email,
creation/update timestamps, and an `open` or `resolved` status. Notes can be
resolved or reopened from the admin order row.

The separate `ShoeSafariOrderNotes` collection is admin-only. Notes must not
contain wallet secrets, signatures, or unnecessary customer personal data;
on-chain payment evidence remains the source of truth.

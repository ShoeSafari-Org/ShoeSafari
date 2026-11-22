# Account data export and deletion

The `/profile/data` page exports the authenticated user's order documents and
requires password reauthentication before deletion. Deletion creates an
admin-visible request, anonymizes the user's customer fields and ownership
link, retains immutable payment references for accounting, and then deletes
the Firebase Auth account.

Firestore rules allow owners to perform only this exact anonymization patch;
they cannot edit payment fields or delete order documents. Admins retain the
ability to process requests and review the append-only request record.

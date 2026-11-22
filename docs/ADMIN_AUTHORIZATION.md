# Admin authorization boundary

`AdminGuard` provides route-level UX, but it is not a security boundary. Every
Firestore product/order read or write and every product-image Storage mutation
is enforced by Firebase rules using the trusted `request.auth.token.admin ==
true` custom claim.

The intended negative cases are explicit: a signed-in user without the admin
claim cannot read admin orders, write/delete products, mutate orders, or create
Storage files; a signed-out user cannot use any admin collection or Storage
path. Public product reads and product-image reads are the only intentionally
open operations. Any future admin-only collection must follow the same rule
pattern and deny deletion where its records are append-only.

When adding an admin query or mutation, update the corresponding rule first and
exercise both claim states in the Firebase Rules emulator before deployment.

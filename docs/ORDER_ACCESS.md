# Order detail access

Order document ids are locators, not authorization tokens. Firestore permits a
read only when the requester has the trusted admin custom claim or the stored
`userId` equals the authenticated Firebase UID. Anonymous users cannot read
direct order details, and signed-in users cannot read another customer's order.

The detail page performs the same owner/admin check before rendering as a
defense-in-depth measure, but rules remain the actual security boundary. A
missing, malformed, or unauthorized reference is rendered as the same generic
unavailable state to avoid cross-user existence leaks.

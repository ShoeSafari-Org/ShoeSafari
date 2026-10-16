# Admin product catalog guide

Use `/admin` to add or edit products in the `ShoeSafariProducts` Firestore
collection. Only use an account authorized for admin access. The storefront
uses each product document ID as its catalog ID; do not reuse IDs or put order
or customer information in a product record.

## Add or edit a product

1. Enter the product name and its price in USD. Enter a positive amount with
   no more than two decimal places, such as `79.99`. The value is stored in
   dollars, not cents; checkout calculates and verifies the payable amount
   from the server-side catalog.
2. For a new product, select an image. For an existing product, leave the
   image field empty to keep the current image, or choose a replacement.
3. Use a JPEG, PNG, WebP, or GIF smaller than 5 MiB. The form uploads images
   under `products/` in Firebase Storage and saves the download URL as the
   product's `img` field.
4. When editing, use **Available for purchase** to control whether customers
   can buy the item. New products default to available. Existing records with
   no `available` field are also treated as available; set the checkbox off to
   make a product unavailable.
5. Submit the form and wait for its success message before navigating away.
   Check the storefront to confirm the product details and image appear as
   expected.

The current product fields are documented in the
[`ShoeSafariProducts` data model](FIRESTORE.md#shoesafariproductsproductdocumentid).
Firebase Storage accepts only admin uploads and image content types under
5 MiB; see the [Storage rules guide](STORAGE.md).

## Recover from a failed save

- **Image upload fails:** the Firestore product has not been written by the
  form. Check that the admin account has the `admin: true` Firebase claim, the
  file type and size meet the limits above, and Storage rules are deployed.
  Retry after correcting the cause.
- **Image upload succeeds but the product save fails:** the catalog document
  is not updated. Check the Firestore connection and that the account's token
  includes the trusted `admin: true` claim required by `firestore.rules`, then
  retry. An uploaded image can remain in Storage without a product record;
  remove an unused object only after confirming no product refers to it.
- **An edit fails after choosing a replacement image:** the old catalog values
  remain until the Firestore update succeeds. Verify which image URL the
  product document currently contains before cleaning up either Storage
  object.

Never put service-account credentials, customer data, or payment secrets in a
product record, image filename, or support report. Admin navigation in the UI
does not replace the Firebase Firestore and Storage rules.

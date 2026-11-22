# Accessibility testing

The CI-friendly accessibility smoke tests live in
[`e2e/accessibility.spec.tsx`](../e2e/accessibility.spec.tsx). They start the
application with the `__shoesafari_e2e` local-storage flag, stub the checkout
quote request, and run axe against the shop, login, cart-dialog, and checkout
routes. No wallet, Firebase account, or Stellar funds are needed.

The suite fails on `critical` and `serious` axe findings. Lower-impact findings
are printed to the test log so they remain visible without making the default
smoke test flaky. The cart test also verifies that opening a modal moves focus
to its close control, Escape closes it, and focus returns to the trigger.

Run it with:

```sh
npm run test:e2e:accessibility
```

There are currently no accepted accessibility exceptions. If a third-party
widget requires one, document the rule, affected route, rationale, and a
follow-up issue here instead of weakening the global axe assertion.

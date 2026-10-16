# Firebase App Check rollout

ShoeSafari's browser SDK uses Firebase Authentication, Cloud Firestore, and
Cloud Storage. App Check can help reject requests from clients that are not
registered as ShoeSafari. It complements Firebase Authentication and Firestore
Security Rules; it does not replace authorization rules. The server-side
Firebase Admin SDK used by the checkout quote route is a separate trust
boundary and is not protected by the browser App Check SDK.

## Before rollout

1. In Firebase Console, register each deployed web app under **Security → App
   Check** and configure a web provider. Firebase's web guide currently
   recommends reCAPTCHA Enterprise for new integrations; reCAPTCHA v3 is also
   supported. Add every production hostname to the provider configuration.
2. Store the provider's public site key as
   `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` in the deployment environment. The
   Firebase client initializes App Check before Auth, Firestore, or Storage
   when this value is present, and enables automatic token refresh. A web site
   key is public configuration. Never place a reCAPTCHA secret,
   service-account key, or App Check debug token in a `NEXT_PUBLIC_` variable
   or commit it to the repository.
3. For local development, leave App Check unset while the Firebase project is
   unenforced, or opt in with `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG=true`. The
   development-only debug provider prints a generated token in the browser
   console; register it only with the development Firebase app and never share
   or commit it. Production ignores the debug flag. Use the official
   [web setup guide](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
   for current provider setup and the
   [debug provider guide](https://firebase.google.com/docs/app-check/web/debug-provider)
   for local debugging. Do not add `localhost` to reCAPTCHA's allowed domains
   as a substitute for the App Check debug provider.

If a production browser has Firebase configured but the App Check site key is
missing, the client logs a diagnostic containing only the variable name. Keep
enforcement disabled until the site key and initialized client are deployed.

## Stage enforcement by service

1. Deploy the App Check-enabled client while enforcement is still off.
2. In **Firebase Console → Security → App Check → APIs**, monitor request
   metrics separately for Authentication, Cloud Firestore, and Cloud Storage.
   Check that expected production and development traffic is verified and
   investigate unverified clients before enforcing.
3. Enable enforcement for one service at a time, beginning with the service
   whose verified traffic is understood. Recheck storefront sign-in, catalog
   reads, order writes, product image reads/uploads, and local emulator use
   after each change.
4. Once metrics and support reports remain healthy, enforce the remaining
   services. Keep the development Firebase project unenforced or configure a
   separate debug provider there so local work remains usable.

App Check support and metrics are managed per Firebase product. Do not assume
that enforcement on Firestore also enforces Storage or Authentication.

## Roll back safely

If legitimate traffic fails after enforcement, disable enforcement for the
affected service in the Firebase Console, inspect the unverified request
metrics, fix the client provider or hostname configuration, and redeploy. Keep
the SDK integration in place while diagnosing so metrics remain available;
reenable enforcement after verifying expected clients. Do not loosen or remove
Firestore Security Rules as a workaround.

For Firebase's current recommendations, see the official [request metrics
guide](https://firebase.google.com/docs/app-check/monitor-metrics) and
[enforcement guide](https://firebase.google.com/docs/app-check/enable-enforcement).

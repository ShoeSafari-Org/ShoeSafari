# Environment variables

Copy `.env.local.example` to `.env.local` for local development. Leave optional
values unset to use the documented defaults. Never commit `.env.local` or paste
secret values into issues, pull requests, logs, or chat.

Variables prefixed with `NEXT_PUBLIC_` are embedded in browser code. Firebase
client settings and EmailJS identifiers are public configuration values, not
secrets; restrict them with their providers. Keep service-account credentials
and signing keys server-side without the `NEXT_PUBLIC_` prefix.

## Application configuration

| Variable | Required | Default or purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No | `testnet`; use `mainnet` only after configuring and verifying all mainnet contracts. |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | No | Testnet Soroban RPC for testnet; configure an HTTPS mainnet RPC explicitly. |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | No | Official passphrase for the selected network. Set explicitly for mainnet. |
| `NEXT_PUBLIC_CHECKOUT_CONTRACT_ID` | Yes for checkout | Deployed checkout contract ID for the selected network. |
| `NEXT_PUBLIC_USDC_CONTRACT_ID` | No | Verified testnet USDC SAC on testnet; configure and verify a mainnet token explicitly. |
| `NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID` | No | Verified testnet native XLM SAC; configure the mainnet ID explicitly. |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | Yes for email flows | EmailJS service identifier. |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | Yes for email flows | EmailJS template identifier. |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | Yes for email flows | EmailJS browser public key; restrict allowed origins and provider usage. |
| `NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL` | No | Default contact-form recipient. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase client configuration; restrict APIs and website referrers in Google Cloud. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Authentication domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase client project ID. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | No | Firebase Messaging sender ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase client app ID. |
| `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` | Before App Check enforcement | Public reCAPTCHA Enterprise site key; App Check stays off when unset. |
| `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG` | No | Set to `true` only for local development to enable Firebase's debug provider. Never enable in production. |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | Firebase Analytics measurement ID. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | No | Server-only Firebase Admin service-account JSON, used for trusted catalog reads. Never expose this value to the browser. |
| `CHECKOUT_QUOTE_SECRET` | Yes for trusted checkout quotes | Server-only random HMAC key of at least 32 characters. Keep it in the deployment secret manager. |
| `FIREBASE_PROJECT_ID` | Only for admin script | Project ID used by `scripts/set-admin-claim.mjs`; set it in the trusted admin shell. |
| `MONGO_DB_URI` | No | Optional MongoDB alternative; unused when the app uses Firestore. |

`NODE_ENV` and `CI` are supplied by Node.js and the CI provider. They are not
application settings to copy into `.env.local`.

## Safe defaults

- Local development defaults to Stellar testnet. Use test funds and verify that
  the checkout contract is deployed on that same network.
- Mainnet requires a separately deployed checkout contract and explicitly
  verified mainnet RPC, token contract IDs, and network passphrase. Do not rely
  on testnet token defaults for mainnet payments. See
  [the network configuration matrix](NETWORK_CONFIGURATION.md).
- Firebase and EmailJS client identifiers are visible to users by design;
  protect them with provider restrictions. Firebase Admin credentials and the
  checkout quote signing key must remain server-only.
- Unset optional email, analytics, and database values unless the related
  feature is configured. Never add real values to `.env.local.example`.

After changing the template or configuration code, review this table and
`.env.local.example` together so each supported key remains documented.

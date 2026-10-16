# Local development setup

This guide starts the ShoeSafari Next.js storefront from a clean checkout. It
does not deploy a contract or connect to production services. Allow about five
minutes if Node.js and npm are already installed and you have the Firebase
client settings for a development project.

## Prerequisites

- Node.js 18 or newer and npm.
- A Firebase project for development. Firebase client configuration values are
  available under **Project settings → General → Your apps**.
- EmailJS values only if you plan to use the email and OTP flows.
- A deployed Stellar testnet checkout contract only if you plan to try a
  payment. The storefront can be explored without deploying a contract.

## Start the storefront

Clone the repository and install its locked dependencies:

```bash
git clone https://github.com/ShoeSafari-Org/ShoeSafari.git
cd ShoeSafari
npm ci
```

Create a local environment file from the maintained template:

```bash
cp .env.local.example .env.local
```

Fill in the Firebase browser configuration values in `.env.local`:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=your-development-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

These `NEXT_PUBLIC_FIREBASE_*` values are client configuration, not service
account credentials. Do not put service-account JSON, private keys, or wallet
secrets in these variables. The storefront uses testnet by default; leave
`NEXT_PUBLIC_STELLAR_NETWORK=testnet`. Leave
`NEXT_PUBLIC_CHECKOUT_CONTRACT_ID` empty until you deploy a testnet checkout
contract; payment will remain unavailable without one.

Start Next.js:

```bash
npm run dev
```

Open <http://localhost:3000>. Catalog and authenticated Firebase features need
the development Firebase values above. Email, trusted checkout quotes, and
payments also need their related values from `.env.local.example`; keep
`FIREBASE_SERVICE_ACCOUNT_JSON` and `CHECKOUT_QUOTE_SECRET` server-only. For
these optional flows, consult the
[environment variable reference](ENVIRONMENT_VARIABLES.md),
[testnet walkthrough](TESTNET_WALLET_WALKTHROUGH.md), and
[checkout validation guide](TESTNET_CHECKOUT.md).

## Useful commands

The scripts below are defined in `package.json`:

```bash
npm run lint
npm run type-check
npm run test
```

For the full configuration list and testnet defaults, see the
[environment variables reference](ENVIRONMENT_VARIABLES.md) and
[network configuration matrix](NETWORK_CONFIGURATION.md).

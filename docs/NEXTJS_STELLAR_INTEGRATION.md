# Integrate Stellar checkout into a Next.js app

This guide shows how to adapt ShoeSafari's Stellar helpers for a Next.js App
Router application. The helpers in this repository are app source code, not a
published npm package: copy the required `lib/stellar/` modules and adapt the
checkout quote route, product model, and order persistence to your application.
Use Stellar testnet while developing.

## 1. Prepare a testnet checkout

You need Node.js 18 or newer, a Next.js App Router project, a Freighter wallet
configured for testnet, a testnet Soroban checkout contract initialized with
the merchant address, and the token allowlisted on that contract. The
[ShoeSafari testnet wallet walkthrough](TESTNET_WALLET_WALKTHROUGH.md) covers
creating and funding a disposable wallet. Native XLM does not need a trustline;
USDC does.

In your Next.js project, install the Stellar browser SDKs:

```bash
npm install @stellar/stellar-sdk @stellar/freighter-api
```

Copy the helper modules from `lib/stellar/` into your app. The payment entry
point is `lib/stellar/checkout.ts`; it uses the wallet, configuration,
simulation, and event helpers in the same directory. Review the
[API reference](STELLAR_API.md) before adapting those modules.

## 2. Configure the network

Set public network configuration in `.env.local`:

```dotenv
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_CHECKOUT_CONTRACT_ID=YOUR_TESTNET_CONTRACT_ID
NEXT_PUBLIC_USDC_CONTRACT_ID=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

The contract ID must belong to the same network as the RPC and passphrase.
Never put a wallet secret, seed phrase, or signing key in a `NEXT_PUBLIC_`
variable. See the [network configuration matrix](NETWORK_CONFIGURATION.md)
for token IDs and mainnet cautions.

## 3. Issue a trusted checkout quote on the server

Do not calculate a payable total from browser-submitted prices. Add a Next.js
Route Handler such as `app/api/checkout/quote/route.ts` that accepts product
IDs and quantities, reloads prices from your trusted catalog, and signs a
short-lived quote with a server-only HMAC key. The ShoeSafari example is
[`app/api/checkout/quote/route.ts`](../app/api/checkout/quote/route.ts), with
signing and verification in [`lib/checkoutQuote.ts`](../lib/checkoutQuote.ts).

Keep the signing key on the server:

```dotenv
CHECKOUT_QUOTE_SECRET=replace-with-a-random-secret-of-at-least-32-characters
```

The quote should bind the order ID, server-calculated total, selected token,
raw token amount, and expiry. Add a verification route and call it again
immediately before wallet signing. A browser can modify its own request body;
only the signed server quote should authorize the amount sent to the contract.

## 4. Connect the wallet and submit the payment

Call the helpers from a client component after your server has returned a
signed quote. Keep the order ID and amount from that verified quote:

```tsx
"use client";

import { useState } from "react";
import { connectWallet } from "@/lib/stellar/freighter";
import { defaultToken } from "@/lib/stellar/config";
import { payWithStellar } from "@/lib/stellar/checkout";

export function PayButton({
  orderId,
  quoteToken,
  amountUsd,
}: {
  orderId: string;
  quoteToken: string;
  amountUsd: number;
}) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handlePay() {
    setError("");
    try {
      const publicKey = await connectWallet();
      const result = await payWithStellar({
        orderId,
        quoteToken,
        amountUsd,
        publicKey,
        token: defaultToken(),
        onStatus: setStatus,
        onSubmitted: (transactionHash) => {
          // Save this public hash for recovery if confirmation is delayed.
          sessionStorage.setItem(`payment:${orderId}`, transactionHash);
        },
      });

      if (result.status !== "SUCCESS" || !result.receipt) {
        throw new Error("The payment did not return a confirmed checkout receipt.");
      }
      setStatus("Payment confirmed.");
      // Persist only after comparing the receipt to the verified quote.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment failed.");
    }
  }

  return (
    <div>
      <button type="button" onClick={handlePay}>
        Pay with Stellar
      </button>
      <p role="status">{status}</p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

The sample is intentionally small. In a real page, disable duplicate submits,
show `onStatus` to the buyer, handle typed wallet errors, and preserve the
transaction hash when confirmation times out. Only persist the order after
checking the successful receipt's order hash, buyer, token, and raw amount
against the verified quote. See the [receipt fields and order flow](STELLAR_API.md#transaction-events-and-indexing).

## 5. Test on testnet

Start the application with your normal Next.js development command. Select a
test product, connect a testnet Freighter account, and confirm the displayed
asset and amount before approving. Verify the returned transaction hash in a
[Stellar testnet explorer](https://stellar.expert/explorer/testnet/). Use only
testnet assets. The contract must have the chosen token allowlisted or
simulation will fail before Freighter asks for a signature.

For a full deployment path, see the [checkout contract guide](../contracts/checkout/README.md).

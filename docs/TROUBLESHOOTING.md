# Troubleshooting Guide

Common issues and solutions for ShoeSafari development and production.

## Table of Contents

- [Development Setup](#development-setup)
- [Wallet Connection](#wallet-connection)
- [Payment Issues](#payment-issues)
- [Admin Panel](#admin-panel)
- [Contract Deployment](#contract-deployment)
- [Build & Deploy](#build--deploy)

---

## Development Setup

### `npm install` fails

**Symptoms:** Error during dependency installation

**Solutions:**

1. Clear npm cache:

   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check Node.js version (requires 18+):

   ```bash
   node --version
   ```

3. On Mac, install Xcode tools:
   ```bash
   xcode-select --install
   ```

### Environment variables not loading

**Symptoms:** App shows "Missing configuration" errors

**Solutions:**

1. Ensure `.env.local` exists (copy from `.env.local.example`)
2. Restart the dev server after changing env vars
3. Verify variable names start with `NEXT_PUBLIC_` for client-side access
4. Check for typos in variable names

### Firebase connection errors

**Symptoms:** "Firebase: Error" messages in console

**Solutions:**

1. Verify Firebase config in `.env.local`
2. Check Firebase project exists and is active
3. Ensure Firestore rules allow read/write
4. Check Firebase API key restrictions

---

## Wallet Connection

### Freighter not detected

**Symptoms:** "Please install Freighter" message

**Solutions:**

1. Install Freighter from [freighter.app](https://freighter.app)
2. Enable the extension in browser settings
3. Refresh the page
4. Try a different browser (Chrome/Firefox)

### Wrong network error

**Symptoms:** "Please switch to testnet/mainnet"

**Solutions:**

1. Open Freighter → Settings → Network
2. Select the correct network (Testnet or Mainnet)
3. Refresh the page

### Transaction signing fails

**Symptoms:** Freighter popup doesn't appear or closes immediately

**Solutions:**

1. Ensure popup blockers are disabled
2. Check Freighter is unlocked
3. Verify the account has XLM for fees
4. Check the transaction isn't malformed (look at console)

### "Account not funded" error

**Symptoms:** Error when trying to pay on testnet

**Solutions:**

1. Testnet: The app auto-funds via Friendbot, wait a moment
2. If Friendbot fails, manually fund at https://friendbot.stellar.org
3. Check account status:
   ```bash
   stellar account info --network testnet <YOUR_PUBLIC_KEY>
   ```

---

## Payment Issues

### "Token not allowed" error

**Symptoms:** Payment fails with TokenNotAllowed

**Solutions:**

1. Verify the token is whitelisted in the contract:
   ```bash
   stellar contract invoke --id <CONTRACT_ID> --network testnet -- \
     is_token_allowed --token <TOKEN_CONTRACT_ID>
   ```
2. Add the token if missing:
   ```bash
   stellar contract invoke --id <CONTRACT_ID> --source-account <MERCHANT> --network testnet -- \
     add_token --token <TOKEN_CONTRACT_ID>
   ```

### "Insufficient balance" error

**Symptoms:** Payment simulation fails with balance error

**Solutions:**

1. Ensure user has enough tokens for the payment
2. User needs XLM for transaction fees (~1 XLM recommended)
3. For USDC, user needs a trustline (app creates automatically)

### Transaction times out

**Symptoms:** "Transaction timed out" after 60 seconds

**Solutions:**

1. Check Stellar network status: https://status.stellar.org
2. Try a different RPC endpoint
3. Increase timeout in `lib/stellar/config.ts`
4. Check if transaction is actually pending on explorer

### Payment succeeded but UI doesn't update

**Symptoms:** Funds moved but checkout stuck

**Solutions:**

1. Check transaction on Stellar Expert
2. Refresh the page
3. Event indexer may be behind - wait a few seconds
4. Check browser console for event polling errors

---

## Admin Panel

### "Access Denied" when accessing /admin

**Symptoms:** Logged in but can't access admin

**Solutions:**

1. Verify your email is in `NEXT_PUBLIC_ADMIN_EMAILS`:
   ```
   NEXT_PUBLIC_ADMIN_EMAILS=your@email.com,other@admin.com
   ```
2. Emails are case-insensitive but check for typos
3. Restart the app after changing admin emails

### Products not loading

**Symptoms:** Admin panel shows loading or empty

**Solutions:**

1. Check Firestore rules allow read access
2. Verify `ShoeSafariProducts` collection exists
3. Check browser console for Firebase errors
4. Ensure Firebase Storage has images

### Can't dispatch/refund orders

**Symptoms:** Action buttons fail with error

**Solutions:**

1. Connect Freighter with the **merchant wallet** (the one used to initialize contract)
2. Check order status is "Paid" (can only dispatch/refund paid orders)
3. Verify you're on the correct network (testnet/mainnet)

---

## Contract Deployment

### Build fails

**Symptoms:** `stellar contract build` or `cargo build` errors

**Solutions:**

1. Install wasm target:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
2. Update Rust:
   ```bash
   rustup update
   ```
3. Clean and rebuild:
   ```bash
   cd contracts/checkout
   cargo clean
   cargo build --target wasm32-unknown-unknown --release
   ```

### Deploy fails with "account not found"

**Symptoms:** Deployment fails with account error

**Solutions:**

1. Ensure deployer account is funded:
   ```bash
   stellar keys generate alice --network testnet --fund
   ```
2. Check account exists:
   ```bash
   stellar account info --network testnet --source-account alice
   ```

### Initialize fails

**Symptoms:** "AlreadyInitialized" or authorization error

**Solutions:**

1. Contract can only be initialized once
2. The merchant address must sign the initialization
3. For a fresh start, deploy a new contract instance

---

## Build & Deploy

### Next.js build fails

**Symptoms:** `npm run build` errors

**Solutions:**

1. Check TypeScript errors:
   ```bash
   npm run type-check
   ```
2. Fix ESLint issues:
   ```bash
   npm run lint:fix
   ```
3. Ensure all env vars are set (even placeholder values)

### Vercel deployment fails

**Symptoms:** Build or deploy errors on Vercel

**Solutions:**

1. Check all environment variables are set in Vercel dashboard
2. Verify Node.js version in `package.json` engines
3. Check build logs for specific errors
4. Try local build first: `npm run build`

### Images not loading in production

**Symptoms:** Product images 404 or broken

**Solutions:**

1. Check Firebase Storage CORS settings
2. Verify storage bucket name in env vars
3. Ensure images are uploaded to correct paths
4. Check Firebase Storage security rules

---

## Getting Help

If you can't resolve an issue:

1. **Search existing issues:** [ShoeSafari GitHub Issues](https://github.com/ShoeSafari-Org/ShoeSafari/issues)
2. **Check Stellar docs:** [developers.stellar.org](https://developers.stellar.org)
3. **Ask in Discord:** [Stellar Discord](https://discord.gg/stellar)
4. **Open a new issue** with:
   - Error message
   - Steps to reproduce
   - Environment (OS, Node version, browser)
   - Relevant logs

---

## Debug Mode

Enable verbose logging:

```javascript
// In browser console
localStorage.setItem("debug", "shoesafari:*");
```

Check Stellar transaction details:

```bash
stellar tx details <TX_HASH> --network testnet
```

Monitor contract events:

```bash
stellar events --id <CONTRACT_ID> --network testnet --start-ledger <LEDGER>
```

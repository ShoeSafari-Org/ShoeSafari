# Mainnet Deployment Guide

This guide walks you through deploying ShoeSafari to the Stellar mainnet for production use.

> **Warning:** Mainnet transactions use real funds. Triple-check all addresses and amounts before submitting transactions.

## Prerequisites

Before deploying to mainnet, ensure you have:

- [ ] Completed testnet testing with no critical bugs
- [ ] Performed a security audit of the smart contract
- [ ] Set up monitoring and alerting
- [ ] Prepared incident response procedures
- [ ] Configured proper backup and recovery processes

## Step 1: Prepare Your Mainnet Wallet

### Create a Secure Merchant Wallet

1. **Generate a new keypair** for your merchant wallet:
   ```bash
   stellar keys generate merchant-mainnet
   ```

2. **Back up your secret key** securely (hardware wallet, encrypted storage, etc.)

3. **Fund your account** with at least 10 XLM for reserves and deployment fees:
   - Purchase XLM from an exchange
   - Transfer to your new merchant address

4. **Verify the account is funded:**
   ```bash
   stellar account info --network mainnet --source-account merchant-mainnet
   ```

### Security Recommendations

- Use a hardware wallet (Ledger) for the merchant key
- Enable multi-signature if managing significant funds
- Never share or commit your secret key
- Store backups in multiple secure locations

## Step 2: Build the Contract for Production

```bash
cd contracts/checkout

# Build with release optimizations
stellar contract build

# The optimized wasm is at:
# target/wasm32-unknown-unknown/release/shoesafari_checkout.wasm
```

### Verify the Build

```bash
# Run all tests before deployment
cargo test

# Check the wasm size (should be under 64KB)
ls -la target/wasm32-unknown-unknown/release/shoesafari_checkout.wasm
```

## Step 3: Deploy to Mainnet

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/shoesafari_checkout.wasm \
  --source-account merchant-mainnet \
  --network mainnet
```

Save the returned contract ID (starts with `C`).

## Step 4: Initialize the Contract

Initialize with your merchant wallet address:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account merchant-mainnet \
  --network mainnet \
  -- \
  initialize \
  --merchant <YOUR_MERCHANT_PUBLIC_KEY>
```

### Verify Initialization

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network mainnet \
  -- \
  merchant
```

Should return your merchant address.

## Step 5: Whitelist Payment Tokens

### Add Mainnet USDC

Get the mainnet USDC contract ID from [Circle's documentation](https://developers.circle.com/stablecoins/docs/usdc-on-stellar) or the Stellar Asset List.

```bash
# Mainnet USDC (verify this address before using!)
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account merchant-mainnet \
  --network mainnet \
  -- \
  add_token \
  --token <MAINNET_USDC_CONTRACT_ID>
```

### Add Native XLM

```bash
# Mainnet native XLM SAC
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account merchant-mainnet \
  --network mainnet \
  -- \
  add_token \
  --token CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA
```

### Verify Token Whitelist

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network mainnet \
  -- \
  is_token_allowed \
  --token <TOKEN_CONTRACT_ID>
```

## Step 6: Configure the Frontend

Update your `.env.local` (or production environment variables):

```bash
# Switch to mainnet
NEXT_PUBLIC_STELLAR_NETWORK=mainnet

# Mainnet RPC endpoint (use a reliable provider)
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-rpc.mainnet.stellar.gateway.fm

# Mainnet passphrase
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015

# Your deployed mainnet contract
NEXT_PUBLIC_CHECKOUT_CONTRACT_ID=<YOUR_MAINNET_CONTRACT_ID>

# Mainnet USDC contract ID
NEXT_PUBLIC_USDC_CONTRACT_ID=<MAINNET_USDC_CONTRACT_ID>

# Mainnet native XLM SAC
NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID=CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA
```

## Step 7: Deploy the Frontend

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in the Vercel dashboard
3. Deploy

### Other Platforms

Build and deploy the Next.js app:

```bash
npm run build
npm start
```

## Step 8: Post-Deployment Verification

Contract deployments are immutable releases with separate order storage. Do
not change the production contract ID until outstanding orders on the prior
contract have a reviewed completion plan. Use
[CONTRACT_RELEASE.md](CONTRACT_RELEASE.md) for compatibility review,
maintainer approval, safe verification, and rollback decisions.

### Test the Full Flow

1. Use testnet for payment, dispatch, and refund flow checks.
2. On mainnet, limit verification to safe read calls and explorer inspection;
   do not create a real test purchase.

### Monitor Contract Activity

Use [Stellar Expert](https://stellar.expert) or [StellarChain](https://stellarchain.io) to monitor:

- Contract invocations
- Token transfers
- Event emissions

## Security Checklist

Before going live, verify:

- [ ] Contract is initialized with correct merchant address
- [ ] Only intended tokens are whitelisted
- [ ] Merchant wallet is securely stored
- [ ] Admin emails are correctly configured
- [ ] Rate limiting is in place
- [ ] Error monitoring is configured (e.g., Sentry)
- [ ] Backup procedures are documented
- [ ] Incident response plan is ready

## Common Issues

### Transaction Fails with "Insufficient Balance"

- Ensure the user has enough tokens plus XLM for fees
- Check that the user has a trustline for USDC

### Contract Invocation Fails

- Verify the contract ID is correct
- Check that the token is whitelisted
- Ensure the merchant wallet is the one that initialized the contract

### Wallet Connection Issues

- Freighter must be set to "Mainnet"
- User must have XLM for transaction fees

## Emergency Procedures

### If a Bug is Discovered

1. **Do NOT process new orders** (disable checkout)
2. Document the issue
3. Assess impact on existing orders
4. Decide on manual refunds if needed
5. Deploy a fix or migrate to a new contract

### Changing the Merchant Wallet

Only the current merchant can transfer ownership:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account merchant-mainnet \
  --network mainnet \
  -- \
  set_merchant \
  --new_merchant <NEW_MERCHANT_ADDRESS>
```

## Support

For issues specific to:
- **ShoeSafari:** Open a GitHub issue
- **Stellar/Soroban:** [Stellar Discord](https://discord.gg/stellar)
- **Freighter:** [Freighter Support](https://freighter.app)

---

**Remember:** Mainnet is production. Test thoroughly on testnet first, and start with small transaction amounts when going live.

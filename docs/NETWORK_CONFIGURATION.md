# Stellar network configuration matrix

This page records the current behavior of `lib/stellar/config.ts` and the
server-side defaults in `lib/env.ts`. Set network variables explicitly for a
deployment; the frontend and server-side loaders currently have different
mainnet RPC and token fallbacks.

| Setting | Testnet | Mainnet |
| --- | --- | --- |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Optional; defaults to `testnet` | Set to `mainnet` explicitly |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Defaults to `https://soroban-testnet.stellar.org` | Set an HTTPS mainnet Soroban RPC explicitly. `config.ts` falls back to `https://soroban-rpc.stellar.org`; `env.ts` falls back to `https://soroban-rpc.mainnet.stellar.gateway.fm` |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | Defaults to `Networks.TESTNET` (`Test SDF Network ; September 2015`) | Defaults to `Networks.PUBLIC` (`Public Global Stellar Network ; September 2015`); set explicitly to avoid mismatched network configuration |
| `NEXT_PUBLIC_CHECKOUT_CONTRACT_ID` | Required; deploy and initialize a testnet checkout contract | Required; deploy and initialize a separate mainnet checkout contract |
| `NEXT_PUBLIC_USDC_CONTRACT_ID` | Defaults to the testnet USDC SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` | Must be set to a verified mainnet USDC SAC; `config.ts` otherwise falls back to the testnet ID while `env.ts` has no mainnet default |
| `NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID` | Defaults to the verified testnet native XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | Set the mainnet native XLM SAC explicitly. `config.ts` has `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA` as a fallback; `env.ts` has no mainnet default |
| USDC trustline issuer | Uses the testnet issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` | The frontend currently still uses the testnet issuer. Mainnet USDC readiness is therefore not supported by changing only the token contract ID; the issuer selection must also be made network-aware and verified first |
| Friendbot | Enabled only for `testnet` with the official testnet passphrase | Disabled |

## Safe configuration

- Testnet defaults are intended for development with test funds. The checkout
  contract ID and deployment configuration still need to point to testnet.
- Mainnet requires a separately deployed checkout contract, an explicitly
  configured mainnet USDC contract, native XLM contract, HTTPS RPC endpoint,
  and matching passphrase. Never use a testnet token ID or testnet issuer on
  mainnet.
- The built-in mainnet native contract ID is documented in the source as
  needing live RPC verification before first use. Verify the selected token's
  contract ID, decimals, issuer/trustline behavior, and merchant allowlist
  before enabling payments. Mainnet USDC is not ready for the frontend until
  its issuer is selected from mainnet configuration too.
- `isFriendbotAllowed()` fails closed unless both the selected network and
  passphrase match official testnet values. Friendbot must never be used for
  mainnet accounts.

## Keeping this matrix current

When changing network names, RPC URLs, passphrases, token IDs, issuers, or
Friendbot behavior, update this matrix in the same change. Review it against
both `lib/stellar/config.ts` and `lib/env.ts`, and check the README environment
table and `.env.local.example`. Add or update a focused configuration test when
the code changes a default or supported combination; reviewers should request
those updates before merging a configuration change.

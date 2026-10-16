import { Networks } from "@stellar/stellar-sdk";

// ---------------------------------------------------------------------------
// Network + contract configuration.
// Keep docs/NETWORK_CONFIGURATION.md in sync with these defaults.
//
// Set these in `.env.local` (see `.env.local.example`):
//   NEXT_PUBLIC_STELLAR_NETWORK        = "testnet" | "mainnet"
//   NEXT_PUBLIC_STELLAR_RPC_URL        = RPC endpoint
//   NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = network passphrase
//   NEXT_PUBLIC_CHECKOUT_CONTRACT_ID   = deployed checkout contract id (C...)
//   NEXT_PUBLIC_USDC_CONTRACT_ID       = USDC token contract id (C...)
//   NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID = native XLM SAC contract id (C...)
// ---------------------------------------------------------------------------

export type StellarNetwork = "testnet" | "mainnet";

export function isStellarNetwork(value: string): value is StellarNetwork {
  return value === "testnet" || value === "mainnet";
}

export function expectedNetworkPassphrase(network: StellarNetwork): string {
  return network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}

/** Return a safe diagnostic when the raw environment would otherwise be hidden by defaults. */
export function networkConfigurationError(): string | null {
  const configuredNetwork =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.trim() || "testnet";
  if (!isStellarNetwork(configuredNetwork)) {
    return "NEXT_PUBLIC_STELLAR_NETWORK must be either testnet or mainnet.";
  }

  const configuredPassphrase =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE?.trim();
  if (
    configuredPassphrase &&
    configuredPassphrase !== expectedNetworkPassphrase(configuredNetwork)
  ) {
    return `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE does not match ${configuredNetwork}.`;
  }

  return null;
}

const configuredNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";
export const NETWORK: StellarNetwork = isStellarNetwork(configuredNetwork)
  ? configuredNetwork
  : "testnet";
export const IS_MAINNET = NETWORK === "mainnet";

export const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
  (IS_MAINNET ? "https://soroban-rpc.stellar.org" : "https://soroban-testnet.stellar.org");

const expectedPassphrase = expectedNetworkPassphrase(NETWORK);
const configuredPassphrase =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE?.trim();
export const NETWORK_PASSPHRASE =
  configuredPassphrase === expectedPassphrase
    ? configuredPassphrase
    : expectedPassphrase;

// Deployed checkout contract (see contracts/checkout + README).
export const CHECKOUT_CONTRACT_ID = process.env.NEXT_PUBLIC_CHECKOUT_CONTRACT_ID ?? "";

// USDC via the Stellar Asset Contract.
export const TESTNET_USDC_CONTRACT_ID = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
// Set NEXT_PUBLIC_USDC_CONTRACT_ID to the mainnet USDC SAC contract id.
export const USDC_CONTRACT_ID =
  process.env.NEXT_PUBLIC_USDC_CONTRACT_ID ?? TESTNET_USDC_CONTRACT_ID;

// Testnet USDC is issued by Circle's classic testnet issuer (trustline only
// needed for non-native assets; native XLM needs no trustline).
export const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

// Native XLM Stellar Asset Contract ids.
//
// Testnet value is empirically verified (balance/decimals simulated against
// soroban-testnet.stellar.org; see docs/ARCHITECTURE.md). The mainnet value
// comes from the stellar-cli `native` built-in alias table and should be
// confirmed against the live mainnet RPC before first use.
export const TESTNET_NATIVE_ASSET_CONTRACT_ID =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
export const MAINNET_NATIVE_ASSET_CONTRACT_ID =
  "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
export const NATIVE_ASSET_CONTRACT_ID =
  process.env.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID ??
  (IS_MAINNET ? MAINNET_NATIVE_ASSET_CONTRACT_ID : TESTNET_NATIVE_ASSET_CONTRACT_ID);

// All tokens accepted by the checkout contract's whitelist. The merchant adds
// each token on-chain via `add_token`; the frontend uses this registry for
// trustline/balance checks and for building `pay` invocations.
export interface TokenConfig {
  contractId: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Native XLM needs no trustline. */
  isNative?: boolean;
  /** Classic asset code + issuer used for trustline checks. */
  assetCode?: string;
  assetIssuer?: string;
}

export const SUPPORTED_TOKENS: TokenConfig[] = [
  {
    contractId: USDC_CONTRACT_ID,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 7,
    assetCode: "USDC",
    assetIssuer: TESTNET_USDC_ISSUER,
  },
  {
    contractId: NATIVE_ASSET_CONTRACT_ID,
    symbol: "XLM",
    name: "Stellar Lumens",
    decimals: 7,
    isNative: true,
  },
];

/** Default payment token (used by the checkout flow unless overridden). */
export function defaultToken(): TokenConfig {
  return SUPPORTED_TOKENS[0];
}

/** Find the supported token configuration for a Stellar contract ID. */
export function tokenForContract(contractId: string): TokenConfig | undefined {
  return SUPPORTED_TOKENS.find((t) => t.contractId === contractId);
}

/** Resolve a contract address to a safe display label without guessing USDC. */
export function tokenSymbolForContract(contractId?: string | null): string {
  if (!contractId) return "Unknown token";
  return tokenForContract(contractId)?.symbol ?? "Unknown token";
}

/**
 * Format raw token units using the decimals registered for that contract.
 * Unknown tokens are kept in raw units because their decimal precision cannot
 * be inferred safely.
 */
export function formatTokenAmount(amountRaw: bigint | string, contractId?: string | null): string {
  const amount = BigInt(amountRaw);
  const decimals = contractId ? tokenForContract(contractId.toUpperCase())?.decimals : undefined;
  if (decimals === undefined) return amount.toString();

  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimals, "0");
  const trimmedFraction = fraction.replace(/0+$/, "");

  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
}

// USDC uses 7 decimals (nativeToScVal / i128 amounts are raw units).
export const USDC_DECIMALS = 7;

// How many seconds to wait for a transaction to reach a final state.
export const TX_TIMEOUT_SECONDS = 60;
// How many seconds between getTransaction polls.
export const TX_POLL_INTERVAL_MS = 2500;

// Meridian / friendbot for funding testnet accounts.
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

/**
 * Whether testnet funding via friendbot is available.
 *
 * Fail-closed: true only when the app is explicitly configured for the
 * Stellar testnet AND the passphrase matches the official testnet
 * passphrase. Mainnet, unknown network values, or a mismatched
 * network/passphrase combination all return false — friendbot must never
 * be called in those cases.
 */
export function isFriendbotAllowed(): boolean {
  return NETWORK === "testnet" && NETWORK_PASSPHRASE === Networks.TESTNET;
}

// Event indexing (lib/stellar/indexer.ts).
export const EVENT_POLL_INTERVAL_MS = 4000;
// How many ledgers behind the tip to start scanning on first connect.
export const EVENT_START_LEDGER_BACKFILL = 100;

// Pre-flight simulation (lib/stellar/simulate.ts).
// Safety buffer added on top of the simulated resource fee so the tx has
// headroom to cover fees that drift between simulation and inclusion.
export const FEE_BUFFER_STROOPS = BigInt(500000);

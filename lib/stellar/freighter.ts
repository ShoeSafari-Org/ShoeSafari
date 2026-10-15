import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

import { NETWORK, NETWORK_PASSPHRASE } from "./config";

// ---------------------------------------------------------------------------
// Freighter wallet helpers.
// ---------------------------------------------------------------------------

export class WalletError extends Error {
  code: string;
  transactionHash?: string;

  constructor(message: string, code = "WALLET_ERROR", transactionHash?: string) {
    super(message);
    this.name = "WalletError";
    this.code = code;
    this.transactionHash = transactionHash;
  }
}

/** Return whether the Freighter browser extension is connected and available. */
export async function freighterAvailable(): Promise<boolean> {
  try {
    const res = await isConnected();
    return Boolean(res.isConnected);
  } catch {
    return false;
  }
}

/** Request wallet access and return the selected Stellar public key. */
export async function connectWallet(): Promise<string> {
  if (!(await freighterAvailable())) {
    throw new WalletError(
      "Freighter is not installed. Install the Freighter wallet extension to pay with USDC.",
      "FREIGHTER_NOT_FOUND"
    );
  }
  const res = await requestAccess();
  if (res.error) {
    throw new WalletError(res.error.toString(), "FREIGHTER_REQUEST_DENIED");
  }
  return res.address;
}

/** Read the currently authorized public key without opening a wallet prompt. */
export async function currentAddress(): Promise<string | null> {
  if (!(await freighterAvailable())) return null;
  const res = await getAddress();
  if (res.error || !res.address) return null;
  return res.address;
}

/** Verify Freighter is set to the application's configured Stellar network. */
export async function ensureNetwork(): Promise<string> {
  const res = await getNetwork();
  if (res.error) {
    throw new WalletError(res.error.toString(), "FREIGHTER_NETWORK_ERROR");
  }
  const detected = res.network;
  // Freighter reports networks as "TESTNET" / "PUBLIC" / "STANDALONE".
  if (
    (NETWORK === "testnet" && detected.toUpperCase() !== "TESTNET") ||
    (NETWORK === "mainnet" && detected.toUpperCase() !== "PUBLIC")
  ) {
    throw new WalletError(
      `Freighter is on "${detected}" but this store expects "${NETWORK}". ` +
        "Switch your Freighter network and try again.",
      "WRONG_NETWORK"
    );
  }
  return detected;
}

/** Sign a transaction XDR with Freighter for the supplied public key. */
export async function signWithFreighter(
  transactionXdr: string,
  publicKey: string
): Promise<string> {
  const res = await signTransaction(transactionXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: publicKey,
  });
  if (res.error) {
    throw new WalletError(res.error.toString(), "FREIGHTER_SIGN_ERROR");
  }
  if (!res.signedTxXdr) {
    throw new WalletError("Freighter did not return a signed transaction.", "FREIGHTER_SIGN_ERROR");
  }
  return res.signedTxXdr;
}

/** Shorten a public key for compact UI display while keeping both ends visible. */
export function shortAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2 + 3) return address ?? "";
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

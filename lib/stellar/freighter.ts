import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

import {
  NETWORK,
  NETWORK_PASSPHRASE,
  networkConfigurationError,
} from "./config";

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

export type WalletProvider = "freighter" | "xbull";
type XBullWallet = {
  isConnected?: () => Promise<boolean> | boolean;
  connect: () => Promise<string | { publicKey?: string }>;
  getPublicKey?: () => Promise<string>;
  getNetwork?: () => Promise<string>;
  signTransaction: (xdr: string, options?: { networkPassphrase?: string; address?: string }) => Promise<string | { signedTxXdr?: string }>;
};

let activeProvider: WalletProvider = "freighter";

function xBullWallet(): XBullWallet | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { xBullWallet?: XBullWallet }).xBullWallet || null;
}

export function setWalletProvider(provider: WalletProvider): void {
  activeProvider = provider;
}

export function selectedWalletProvider(): WalletProvider {
  return activeProvider;
}

export async function xBullAvailable(): Promise<boolean> {
  const wallet = xBullWallet();
  if (!wallet) return false;
  try {
    return wallet.isConnected ? Boolean(await wallet.isConnected()) : true;
  } catch {
    return false;
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
export async function connectWallet(provider: WalletProvider = activeProvider): Promise<string> {
  setWalletProvider(provider);
  if (provider === "xbull") {
    const wallet = xBullWallet();
    if (!wallet) throw new WalletError("xBull Wallet is not installed.", "XBULL_NOT_FOUND");
    const result = await wallet.connect();
    const address = typeof result === "string" ? result : result.publicKey;
    if (!address) throw new WalletError("xBull Wallet did not return an address.", "XBULL_CONNECT_ERROR");
    return address;
  }
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
  if (activeProvider === "xbull") {
    const wallet = xBullWallet();
    if (!wallet || !(await xBullAvailable())) return null;
    return wallet.getPublicKey ? await wallet.getPublicKey() : null;
  }
  if (!(await freighterAvailable())) return null;
  const res = await getAddress();
  if (res.error || !res.address) return null;
  return res.address;
}

/** Verify Freighter is set to the application's configured Stellar network. */
export async function ensureNetwork(): Promise<string> {
  const configurationError = networkConfigurationError();
  if (configurationError) {
    throw new WalletError(configurationError, "NETWORK_CONFIG_ERROR");
  }

  if (activeProvider === "xbull") {
    const network = await xBullWallet()?.getNetwork?.();
    if (!network) throw new WalletError("xBull Wallet network could not be verified.", "XBULL_NETWORK_ERROR");
    const expected = NETWORK === "testnet" ? "TESTNET" : "PUBLIC";
    if (network.toUpperCase() !== expected) throw new WalletError(`xBull Wallet is on "${network}" but this store expects "${NETWORK}".`, "WRONG_NETWORK");
    return network;
  }
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
  if (activeProvider === "xbull") {
    const wallet = xBullWallet();
    if (!wallet) throw new WalletError("xBull Wallet is not installed.", "XBULL_NOT_FOUND");
    const result = await wallet.signTransaction(transactionXdr, { networkPassphrase: NETWORK_PASSPHRASE, address: publicKey });
    const signedTxXdr = typeof result === "string" ? result : result.signedTxXdr;
    if (!signedTxXdr) throw new WalletError("xBull Wallet did not return a signed transaction.", "XBULL_SIGN_ERROR");
    return signedTxXdr;
  }
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

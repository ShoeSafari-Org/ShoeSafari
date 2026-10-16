import { NETWORK, type StellarNetwork } from "./config";

/** Build a Stellar Expert transaction URL for the selected network. */
export function transactionExplorerUrl(
  transactionHash: string | null | undefined,
  network: StellarNetwork = NETWORK,
): string | null {
  const hash = transactionHash?.trim();
  if (!hash) return null;

  const explorerNetwork = network === "mainnet" ? "public" : "testnet";
  const encodedHash = encodeURIComponent(hash);
  return `https://stellar.expert/explorer/${explorerNetwork}/tx/${encodedHash}`;
}

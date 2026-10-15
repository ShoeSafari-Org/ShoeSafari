import { rpc, TransactionBuilder } from "@stellar/stellar-sdk";

import {
  CHECKOUT_CONTRACT_ID,
  NETWORK_PASSPHRASE,
  RPC_URL,
  TokenConfig,
  defaultToken,
  USDC_DECIMALS,
} from "./config";
import { ensureNetwork, signWithFreighter, WalletError } from "./freighter";
import { decodePaymentEvent, PaymentReceipt, waitForTransaction } from "./events";
import { addressToScVal, bytes32ToScVal, hashOrderId, i128ToScVal } from "./scval";
import { assertPaymentReady } from "./account";
import { buildInvocationTransaction, budgetFee, prepareAndReport } from "./simulate";

export { fundTestnetAccount } from "./account";

export interface PayOptions {
  /** Price in dollars (USD), converted to token raw units internally. */
  amountUsd: number;
  /** Human-readable order id (any string), hashed to 32 bytes for the contract. */
  orderId: string;
  /** Buyer's Freighter public key. */
  publicKey: string;
  /** Token to pay with (defaults to the first supported token, USDC). */
  token?: TokenConfig;
  /** Called with human-readable progress updates. */
  onStatus?: (status: string) => void;
}

export interface PayResult {
  hash: string;
  status: string;
  receipt: PaymentReceipt | null;
  amountUsd: number;
  amountRaw: bigint;
  /** Pre-flight simulation details (see lib/stellar/simulate.ts). */
  simulation: {
    minResourceFeeStroops: string;
    recommendedInclusionFeeStroops: string;
    instructions: number;
  };
}

function status(s: string): void {
  console.log(`[stellar] ${s}`);
}

/**
 * Convert a USD amount to raw token units (7 decimals).
 * e.g. 12.34 -> 123_400_000
 */
export function usdToRawUnits(amountUsd: number): bigint {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new WalletError("Invalid amount to pay.", "INVALID_AMOUNT");
  }
  const raw = Math.round(amountUsd * 10 ** USDC_DECIMALS);
  return BigInt(raw);
}

/**
 * Round-trip an order id string through its 32-byte hash (hex) so callers can
 * cross-check on-chain order ids with their own order numbers.
 */
export async function orderIdHash(orderId: string): Promise<string> {
  return hexOf(await hashOrderId(orderId));
}

function hexOf(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Main flow: connect wallet -> readiness checks -> simulate -> prepare ->
 * sign -> submit -> wait -> decode event.
 */
export async function payWithStellar(options: PayOptions): Promise<PayResult> {
  const { amountUsd, orderId, publicKey, onStatus = status } = options;
  const token = options.token ?? defaultToken();

  if (!CHECKOUT_CONTRACT_ID) {
    throw new WalletError(
      "Checkout contract is not configured. Set NEXT_PUBLIC_CHECKOUT_CONTRACT_ID in .env.local.",
      "CONTRACT_NOT_CONFIGURED"
    );
  }

  const amountRaw = usdToRawUnits(amountUsd);
  const orderBytes = await hashOrderId(orderId);

  // 1. Network guard.
  onStatus("Checking Freighter network…");
  await ensureNetwork();

  const server = new rpc.Server(RPC_URL);

  // 2. Account readiness: funded, trustline present, balance sufficient.
  onStatus("Checking account readiness…");
  const readiness = await assertPaymentReady(server, publicKey, {
    token,
    requiredRaw: amountRaw,
    strict: true,
  });

  // 3. Build the invocation.
  onStatus("Building payment transaction…");
  const args = [
    addressToScVal(token.contractId),
    addressToScVal(publicKey),
    bytes32ToScVal(orderBytes),
    i128ToScVal(amountRaw),
  ];
  const tx = buildInvocationTransaction(readiness.account!, CHECKOUT_CONTRACT_ID, "pay", args);

  // 4. Pre-flight simulation (surfaces errors early) + prepare.
  onStatus("Simulating transaction…");
  const { tx: prepared, report } = await prepareAndReport(server, tx);
  if (!report.ok || !readiness.account) {
    throw new WalletError(
      `Transaction simulation failed: ${report.error?.message ?? "unknown error"}`,
      "TX_SIMULATION_ERROR"
    );
  }
  const fee = await budgetFee(server, report);
  onStatus(
    `Estimated fee: ${report.minResourceFee?.toString() ?? "?"} stroops resource + ${fee} stroops total`
  );

  // 5. Sign with Freighter.
  onStatus("Waiting for Freighter signature…");
  const signedXdr = await signWithFreighter(prepared.toXDR(), publicKey);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const signedTransactionHash = signedTx.hash().toString("hex");

  // 6. Submit.
  onStatus("Submitting transaction…");
  let sendResponse;
  try {
    sendResponse = await server.sendTransaction(signedTx);
  } catch (error) {
    throw new WalletError(
      error instanceof Error ? error.message : String(error),
      "RPC_UNAVAILABLE",
      signedTransactionHash
    );
  }

  if (sendResponse.status === "ERROR") {
    throw new WalletError(
      `Transaction rejected: ${sendResponse.errorResult?.toXDR("base64") ?? "unknown error"}`,
      "TX_SEND_ERROR",
      sendResponse.hash || signedTransactionHash
    );
  }
  if (sendResponse.status === "PENDING" || sendResponse.status === "DUPLICATE") {
    onStatus("Confirming transaction…");
  }

  // 7. Wait for final state and decode the payment event.
  let txResult;
  try {
    txResult = await waitForTransaction(sendResponse.hash);
  } catch (error) {
    const diagnosticMessage = error instanceof Error ? error.message : String(error);
    const code = /timeout|did not reach a final state/i.test(diagnosticMessage)
      ? "TX_CONFIRMATION_TIMEOUT"
      : /transaction failed on ledger/i.test(diagnosticMessage)
        ? "TX_FAILED"
        : "RPC_UNAVAILABLE";
    throw new WalletError(diagnosticMessage, code, sendResponse.hash || signedTransactionHash);
  }
  const receipt = decodePaymentEvent(txResult);

  return {
    hash: sendResponse.hash,
    status: txResult.status,
    receipt,
    amountUsd,
    amountRaw,
    simulation: {
      minResourceFeeStroops: report.minResourceFee?.toString() ?? "0",
      recommendedInclusionFeeStroops: fee,
      instructions: report.instructions ?? 0,
    },
  };
}

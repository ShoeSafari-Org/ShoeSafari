import { checkTransactionStatus } from "../stellar/events";
import { payWithStellar, type PayResult } from "../stellar/checkout";
import type { TokenConfig } from "../stellar/config";
import {
  PaymentAdapterError,
  type PaymentAdapter,
  type PaymentAmount,
  type PaymentRequest,
} from "./adapter";

export interface StellarPaymentRequest extends PaymentRequest {
  quoteToken: string;
  publicKey: string;
  token: TokenConfig;
}

function amountFor(request: StellarPaymentRequest): PaymentAmount {
  return {
    currency: request.amount.currency,
    value: request.amount.value,
    minorUnits: request.amount.minorUnits,
  };
}

function receiptFromResult(request: StellarPaymentRequest, result: PayResult) {
  return {
    reference: result.hash,
    orderId: request.orderId,
    amount: amountFor(request),
    assetId: request.assetId,
    metadata: result.receipt
      ? {
          ledger: String(result.receipt.ledger),
          buyer: result.receipt.buyer ?? "",
        }
      : undefined,
  };
}

/** Adapt the existing Soroban checkout flow to the rail-neutral payment API. */
export function createStellarPaymentAdapter(): PaymentAdapter<StellarPaymentRequest> {
  return {
    id: "stellar-soroban",
    displayName: "Stellar",
    capabilities: { customerAction: true, reconciliation: true, refunds: true },

    async pay(request, onStatus) {
      try {
        const result = await payWithStellar({
          amountUsd: Number(request.amount.value),
          orderId: request.orderId,
          quoteToken: request.quoteToken,
          publicKey: request.publicKey,
          token: request.token,
          amountRaw: BigInt(request.amount.minorUnits),
          onStatus,
        });
        return {
          status: "succeeded",
          reference: result.hash,
          receipt: receiptFromResult(request, result),
        };
      } catch (error) {
        const reference =
          error instanceof Error && "transactionHash" in error
            ? String((error as { transactionHash?: string }).transactionHash || "")
            : undefined;
        const code =
          error instanceof Error && "code" in error
            ? String((error as { code?: string }).code || "PAYMENT_FAILED")
            : "PAYMENT_FAILED";
        const message = error instanceof Error ? error.message : String(error);

        // A hash plus a transport/confirmation error means the network may
        // have accepted the payment. Preserve it as pending so callers can
        // reconcile the same attempt instead of creating a duplicate.
        if (reference && code !== "TX_FAILED") {
          return {
            status: "pending",
            reference,
            failure: { code, message, retryable: false },
          };
        }
        if (code === "TX_FAILED") {
          return {
            status: "failed",
            reference,
            failure: { code, message, retryable: false },
          };
        }
        throw new PaymentAdapterError(code, message, { retryable: true });
      }
    },

    async getStatus(reference) {
      if (!reference || !/^[a-f0-9]{64}$/i.test(reference)) {
        throw new PaymentAdapterError(
          "INVALID_REFERENCE",
          "A valid Stellar transaction hash is required."
        );
      }
      const result = await checkTransactionStatus(reference);
      if (result.status === "SUCCESS") {
        return { status: "succeeded", reference, receipt: undefined };
      }
      if (result.status === "FAILED") return { status: "failed", reference };
      return { status: "pending", reference };
    },
  };
}

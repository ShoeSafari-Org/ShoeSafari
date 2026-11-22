/**
 * Rail-neutral payment boundary.
 *
 * Adapters own provider-specific authentication, submission, and reconciliation.
 * Callers should persist only the returned reference and use getStatus to
 * recover an attempt; an unknown result must never be treated as a failure.
 */

export type PaymentStatus = "pending" | "succeeded" | "failed";

export interface PaymentAmount {
  /** ISO-4217 currency or a provider-defined asset code, e.g. USD or USDC. */
  currency: string;
  /** Decimal display amount, retained for receipts and provider requests. */
  value: string;
  /** Exact integer amount in the asset's smallest unit. */
  minorUnits: string;
}

export interface PaymentRequest {
  /** Stable merchant order reference. Adapters must not generate this value. */
  orderId: string;
  amount: PaymentAmount;
  /** Stable identifier for the selected payment asset or method. */
  assetId: string;
  /** Non-sensitive rail-specific context. Never put credentials or secrets here. */
  metadata?: Readonly<Record<string, string>>;
}

export interface PaymentReceipt {
  reference: string;
  orderId: string;
  amount: PaymentAmount;
  assetId: string;
  settledAt?: string;
  metadata?: Readonly<Record<string, string>>;
}

export interface PaymentFailure {
  code: string;
  message: string;
  retryable: boolean;
}

export interface PaymentAttempt {
  status: PaymentStatus;
  /** Provider reference, including when confirmation is still pending. */
  reference?: string;
  receipt?: PaymentReceipt;
  failure?: PaymentFailure;
}

export interface PaymentAdapterCapabilities {
  /** Whether pay may require an interactive customer step (wallet, redirect, OTP). */
  customerAction: boolean;
  /** Whether getStatus can reconcile an attempt after the original call ends. */
  reconciliation: boolean;
  /** Whether this adapter can return funds after settlement. */
  refunds: boolean;
}

export interface PaymentAdapter<TRequest extends PaymentRequest = PaymentRequest> {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: Readonly<PaymentAdapterCapabilities>;

  /** Submit one payment. Implementations must not silently retry a submission. */
  pay(request: TRequest, onStatus?: (message: string) => void): Promise<PaymentAttempt>;

  /** Check the same provider reference without creating another payment. */
  getStatus(reference: string): Promise<PaymentAttempt>;
}

export class PaymentAdapterError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly reference?: string;

  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean; reference?: string }
  ) {
    super(message);
    this.name = "PaymentAdapterError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.reference = options?.reference;
  }
}

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return status === "succeeded" || status === "failed";
}

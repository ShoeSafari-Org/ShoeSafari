const PENDING_PAYMENT_KEY = "shoesafari:stellar-pending-payment";

export interface PendingPayment {
  hash: string;
  orderId: string;
}

/** Store only the public transaction hash and its non-sensitive order reference. */
export function savePendingPayment(payment: PendingPayment): void {
  localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(payment));
}

/** Load and validate the saved transaction hash and order reference. */
export function loadPendingPayment(): PendingPayment | null {
  const stored = localStorage.getItem(PENDING_PAYMENT_KEY);
  if (!stored) return null;

  try {
    const payment = JSON.parse(stored);
    if (
      typeof payment.hash === "string" &&
      /^[a-f0-9]{64}$/i.test(payment.hash) &&
      typeof payment.orderId === "string" &&
      payment.orderId.length > 0
    ) {
      return { hash: payment.hash, orderId: payment.orderId };
    }
  } catch {
    // Invalid recovery data is discarded below.
  }

  clearPendingPayment();
  return null;
}

/** Remove the saved pending-payment reference from local storage. */
export function clearPendingPayment(): void {
  localStorage.removeItem(PENDING_PAYMENT_KEY);
}

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StellarCheckoutButton from "../../components/StellarCheckoutButton";

const mocks = vi.hoisted(() => ({
  payWithStellar: vi.fn(),
}));

vi.mock("../../lib/stellar/checkout", () => ({
  orderIdHash: vi.fn(),
  payWithStellar: mocks.payWithStellar,
  usdToRawUnits: vi.fn(() => 100),
}));
vi.mock("../../lib/stellar/freighter", () => ({
  connectWallet: vi.fn().mockResolvedValue("G" + "A".repeat(55)),
  currentAddress: vi.fn().mockResolvedValue("G" + "A".repeat(55)),
}));
vi.mock("../../lib/errors", () => ({
  parseError: (error) => ({ userMessage: String(error) }),
}));
vi.mock("../../lib/stellar/config", () => ({
  CHECKOUT_CONTRACT_ID: "checkout-contract",
  NETWORK: "testnet",
  defaultToken: () => ({ contractId: "usdc-contract" }),
}));
vi.mock("../../components/Notification", () => ({
  useNotification: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock("../../lib/stellar/events", () => ({ checkTransactionStatus: vi.fn() }));
vi.mock("../../lib/stellar/recovery", () => ({
  clearPendingPayment: vi.fn(),
  loadPendingPayment: vi.fn(() => null),
  savePendingPayment: vi.fn(),
}));

describe("StellarCheckoutButton", () => {
  beforeEach(() => {
    mocks.payWithStellar.mockReset();
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ quote: { expiresAt: Date.now() + 60_000, totalUsd: 1 } }),
      }),
    );
  });

  it("starts only one payment for rapid repeated clicks", async () => {
    let finishPayment;
    mocks.payWithStellar.mockImplementation(
      () => new Promise((resolve) => { finishPayment = resolve; }),
    );
    render(
      <StellarCheckoutButton
        amountUsd={1}
        orderId="order-1"
        quoteToken="quote-token"
      />,
    );

    const button = await screen.findByRole("button", { name: /Pay with USDC/ });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(mocks.payWithStellar).toHaveBeenCalledTimes(1));
    finishPayment({ hash: "tx-hash", receipt: { ledger: 1 }, amountUsd: 1 });
  });
});

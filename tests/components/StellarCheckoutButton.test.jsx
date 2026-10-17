import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StellarCheckoutButton from "../../components/StellarCheckoutButton";

const mocks = vi.hoisted(() => ({
  payWithStellar: vi.fn(),
  checkTransactionStatus: vi.fn(),
  errorNotification: vi.fn(),
  pendingPayment: null,
}));

vi.mock("../../lib/stellar/checkout", () => ({
  orderIdHash: vi.fn(async (id) => `hashed:${id}`),
  payWithStellar: mocks.payWithStellar,
  usdToRawUnits: vi.fn(() => 100),
}));
vi.mock("../../lib/stellar/freighter", () => ({
  connectWallet: vi.fn().mockResolvedValue("G" + "A".repeat(55)),
  currentAddress: vi.fn().mockResolvedValue("G" + "A".repeat(55)),
}));
vi.mock("../../lib/errors", () => ({
  parseError: (error) => ({
    code: error?.code || "UNKNOWN",
    userMessage: error?.message || String(error),
    transactionHash: error?.transactionHash,
  }),
}));
vi.mock("../../lib/stellar/config", () => ({
  CHECKOUT_CONTRACT_ID: "checkout-contract",
  formatTokenAmount: vi.fn(() => "1"),
  tokenForContract: vi.fn(() => ({ contractId: "usdc-contract", symbol: "USDC" })),
}));
vi.mock("../../components/Notification", () => ({
  useNotification: () => ({ success: vi.fn(), error: mocks.errorNotification }),
}));
vi.mock("../../lib/stellar/events", () => ({
  checkTransactionStatus: mocks.checkTransactionStatus,
}));
vi.mock("../../lib/stellar/recovery", () => ({
  clearPendingPayment: vi.fn(() => { mocks.pendingPayment = null; }),
  loadPendingPayment: vi.fn(() => mocks.pendingPayment),
  savePendingPayment: vi.fn((payment) => { mocks.pendingPayment = payment; }),
}));

const HASH = "a".repeat(64);
const pending = {
  hash: HASH,
  orderId: "order-1",
  buyerWallet: "G" + "A".repeat(55),
  tokenContract: "usdc-contract",
  checkoutContractId: "checkout-contract",
  amountRaw: "100",
  amountUsd: 1,
};

function verifiedQuoteResponse() {
  return {
    ok: true,
    json: async () => ({
      quote: {
        expiresAt: Date.now() + 60_000,
        totalUsd: 1,
        orderId: "order-1",
        payment: { tokenContractId: "usdc-contract", asset: "USDC", amountRaw: "100" },
      },
    }),
  };
}

describe("StellarCheckoutButton", () => {
  beforeEach(() => {
    mocks.payWithStellar.mockReset();
    mocks.checkTransactionStatus.mockReset();
    mocks.errorNotification.mockReset();
    mocks.pendingPayment = null;
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(verifiedQuoteResponse()));
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
    finishPayment({ hash: HASH, receipt: { ledger: 1 }, amountUsd: 1 });
  });

  it("keeps a submitted timeout pending and offers status recovery instead of another payment", async () => {
    mocks.payWithStellar.mockImplementation(async ({ onSubmitted }) => {
      onSubmitted(HASH);
      throw Object.assign(new Error("confirmation timed out"), {
        code: "TX_CONFIRMATION_TIMEOUT",
        transactionHash: HASH,
      });
    });
    render(
      <StellarCheckoutButton
        amountUsd={1}
        orderId="order-1"
        quoteToken="quote-token"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Pay with USDC/ }));

    expect(await screen.findByRole("button", { name: "Check saved payment status" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Pay with USDC/ })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/pending or unknown/i);
    expect(mocks.errorNotification).not.toHaveBeenCalled();
  });

  it("checks the saved transaction hash without submitting a second payment", async () => {
    mocks.pendingPayment = pending;
    mocks.checkTransactionStatus.mockResolvedValue({ status: "NOT_FOUND", transaction: null });
    render(
      <StellarCheckoutButton
        amountUsd={1}
        orderId="order-1"
        quoteToken="quote-token"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Check saved payment status" }));

    await waitFor(() => expect(mocks.checkTransactionStatus).toHaveBeenCalledWith(HASH));
    expect(mocks.payWithStellar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Pay with USDC/ })).toBeDisabled();
  });

  it("allows a new payment only after recovery reports a terminal failure", async () => {
    mocks.pendingPayment = pending;
    mocks.checkTransactionStatus.mockResolvedValue({ status: "FAILED", transaction: {} });
    render(
      <StellarCheckoutButton
        amountUsd={1}
        orderId="order-1"
        quoteToken="quote-token"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Check saved payment status" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Pay with USDC/ })).toBeEnabled();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/network confirmed.*failed/i);
    expect(mocks.payWithStellar).not.toHaveBeenCalled();
  });
});

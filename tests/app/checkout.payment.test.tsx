import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Checkout from "../../app/checkout/page";

const mocks = vi.hoisted(() => ({
  saveStellarOrder: vi.fn(),
}));

vi.mock("../../lib/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "customer-1" } }),
}));

vi.mock("../../lib/orderStore", () => ({
  saveStellarOrder: mocks.saveStellarOrder,
  validateStellarOrderReceipt: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../components/Toast", () => ({
  default: ({ message, show }) => (show ? <div role="status">{message}</div> : null),
}));

vi.mock("../../components/StellarWalletButton", () => ({
  default: () => <button type="button">Connect Freighter</button>,
}));

vi.mock("../../components/StellarOrderWatch", () => ({
  default: () => null,
}));

vi.mock("../../components/StellarCheckoutButton", () => ({
  default: ({ disabled, onSuccess }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        onSuccess({
          amountUsd: 79.99,
          amountRaw: BigInt(799900000),
          hash: "stellar-transaction-hash",
          receipt: { token: "USDC", orderId: "stellar-order-1", amount: "799900000" },
          orderId: "stellar-order-1",
          items: [],
        })
      }
    >
      Pay with Stellar (USDC)
    </button>
  ),
}));

describe("Checkout Stellar payment", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("cartItems", JSON.stringify([{ id: "shoe-1", price: 79.99 }]));
    mocks.saveStellarOrder.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          quote: { totalUsd: 79.99, expiresAt: Date.now() + 60_000 },
          quoteToken: "signed-checkout-quote",
        }),
      }),
    );
  });

  it("keeps delivery details and Stellar payment without card or OTP fields", () => {
    render(<Checkout />);

    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Delivery address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Freighter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay with Stellar (USDC)" })).toBeDisabled();
    expect(screen.queryByLabelText(/card number|expiry date|security code|otp/i)).toBeNull();
    expect(screen.queryByText(/confirm otp|otp was sent/i)).toBeNull();
    expect(screen.queryByText(/visa|mastercard|paypal|apple pay|klarna/i)).toBeNull();
  });

  it("pays directly with Stellar after delivery details are entered", async () => {
    render(<Checkout />);

    fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Delivery address"), {
      target: { value: "1 Example Street" },
    });

    const payButton = screen.getByRole("button", { name: "Pay with Stellar (USDC)" });
    await waitFor(() => expect(payButton).toBeEnabled());
    fireEvent.click(payButton);

    expect(await screen.findByText("Order Completed.")).toBeInTheDocument();
    expect(mocks.saveStellarOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          address: "1 Example Street",
        },
        userId: "customer-1",
      }),
    );
  });
});

"use client";
import { useState, useEffect } from "react";
import Toast from "../../components/Toast";
import Link from "next/link";
import StellarCheckoutButton from "../../components/StellarCheckoutButton";
import StellarWalletButton from "../../components/StellarWalletButton";
import StellarOrderWatch from "../../components/StellarOrderWatch";
import { SiStellar } from "react-icons/si";
import { saveStellarOrder, validateStellarOrderReceipt } from "../../lib/orderStore";
import { useAuth } from "../../lib/AuthContext";
import {
  formatTokenAmount,
  tokenSymbolForContract,
  USDC_CONTRACT_ID,
} from "../../lib/stellar/config";
import { logClientError } from "../../lib/safeLogging";
import { isShippingAddressComplete } from "../../lib/shippingAddress";

const Checkout = () => {
  const { user } = useAuth();

  const [totalPrice, setTotalPrice] = useState(0);
  const [quoteToken, setQuoteToken] = useState("");
  const [quoteExpiresAt, setQuoteExpiresAt] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState("");
  const [paymentHash, setPaymentHash] = useState("");
  const [orderSaveFailed, setOrderSaveFailed] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [stage, setStage] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: {
      addressLine1: "",
      addressLine2: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
    },
  });

  const showToast = (message: string) => {
    setToast({ show: true, message });
  };

  const [orderId] = useState(() => `SS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);

  const handleStellarSuccess = async (result: {
    amountUsd: number | string;
    amountRaw: bigint;
    hash: string;
    receipt: {
      ledger?: number;
      buyer?: string;
      token?: string;
      orderId?: string;
      amount?: string;
    } | null;
    orderId?: string;
    items?: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPriceUsd: number;
      totalUsd: number;
    }>;
    expectedPayment?: {
      buyerWallet?: string;
      tokenContract?: string;
      checkoutContractId?: string;
      amountRaw?: string;
    };
  }) => {
    const completedOrderId = result.orderId || orderId;
    setPaymentHash(result.hash);
    setOrderSaveFailed(false);
    let orderSaved = true;
    try {
      const storedItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
      await validateStellarOrderReceipt({
        orderId: completedOrderId,
        result,
        expectedPayment: result.expectedPayment,
      });
      await saveStellarOrder({
        orderId: completedOrderId,
        result,
        expectedPayment: result.expectedPayment,
        customer: formData,
        userId: user?.uid || null,
        items: result.items || (Array.isArray(storedItems) ? storedItems : []),
      });
    } catch (error) {
      orderSaved = false;
      setOrderSaveFailed(true);
      logClientError(
        "Stellar payment succeeded but order persistence failed",
        error,
        result.hash
      );
    }

    const tokenContract = result.receipt?.token;
    const tokenSymbol = tokenSymbolForContract(tokenContract);
    const amountLabel =
      tokenContract === USDC_CONTRACT_ID
        ? `$${Number(result.amountUsd).toFixed(2)} USDC`
        : result.receipt?.amount
          ? `${formatTokenAmount(result.receipt.amount, tokenContract)} ${tokenSymbol}`
          : tokenSymbol;

    showToast(
      orderSaved
        ? `${amountLabel} payment received ✓ · order ${completedOrderId}`
        : `Payment received ✓, but we could not save the order record. Transaction: ${result.hash}`
    );
    setStage(2);
    localStorage.removeItem("totalPrice");
    localStorage.removeItem("itemCount");
    localStorage.removeItem("cartItems");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (
      ["addressLine1", "addressLine2", "city", "region", "postalCode", "country"].includes(name)
    ) {
      setFormData((prevData) => ({
        ...prevData,
        address: { ...prevData.address, [name]: value },
      }));
      return;
    }
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const customerDetailsComplete =
    Boolean(formData.firstName.trim()) &&
    Boolean(formData.lastName.trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) &&
    isShippingAddressComplete(formData.address);

  useEffect(() => {
    let active = true;

    const createQuote = async () => {
      setQuoteLoading(true);
      setQuoteError("");
      setQuoteToken("");
      try {
        const storedItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
        if (!Array.isArray(storedItems)) throw new Error("Your cart is invalid.");

        const quantities = new Map<string, number>();
        for (const item of storedItems) {
          if (typeof item?.id !== "string" || !item.id) {
            throw new Error("A cart item is missing its product reference.");
          }
          quantities.set(item.id, (quantities.get(item.id) || 0) + 1);
        }

        const response = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            items: [...quantities].map(([productId, quantity]) => ({
              productId,
              quantity,
            })),
          }),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "Could not confirm current product prices.");
        if (!active) return;

        setTotalPrice(body.quote.totalUsd);
        setQuoteExpiresAt(body.quote.expiresAt);
        setQuoteToken(body.quoteToken);
      } catch (error) {
        if (active) {
          setQuoteError(
            error instanceof Error ? error.message : "Could not confirm product prices."
          );
          setTotalPrice(0);
        }
      } finally {
        if (active) setQuoteLoading(false);
      }
    };

    void createQuote();
    return () => {
      active = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (stage === 2) {
      localStorage.removeItem("totalPrice");
      localStorage.removeItem("itemCount");
      localStorage.removeItem("cartItems");
    }
  }, [stage]);

  return (
    <>
      <nav
        aria-label="Checkout progress"
        className="flex justify-center items-center space-x-2 my-4 sm:mx-0 mx-4 mt-16"
      >
        <ol className="flex items-center space-x-2">
          <li
            aria-current={stage === 1 ? "step" : undefined}
            className="flex items-center space-x-2"
          >
            <span
              aria-hidden="true"
              className={`flex justify-center items-center w-8 h-8 sm:w-10 sm:h-10 border border-red-700 rounded-full ${
                stage >= 1 ? "bg-red-700 text-white" : "bg-white"
              }`}
            >
              1
            </span>
            <span className="sr-only">Step 1: Delivery and payment</span>
            <span
              aria-hidden="true"
              className={`w-20 h-1 sm:w-96 ${stage >= 2 ? "bg-red-700" : "bg-gray-200"}`}
            ></span>
          </li>
          <li aria-current={stage === 2 ? "step" : undefined}>
            <span
              aria-hidden="true"
              className={`flex justify-center items-center w-8 h-8 sm:w-10 sm:h-10 border border-red-700 rounded-full ${
                stage >= 2 ? "bg-red-700 text-white" : "bg-white"
              }`}
            >
              2
            </span>
            <span className="sr-only">Step 2: Order complete</span>
          </li>
        </ol>
      </nav>

      <div className="container mx-auto my-5 w-full max-w-6xl rounded-md border-2 border-red-700 bg-red-400 px-3 py-3 sm:my-10 sm:px-4 sm:py-4">
        <div className="flex flex-col md:flex-row">
          <div className="order-2 mb-2 flex w-full flex-col items-center justify-center gap-3 rounded-md p-3 text-center md:order-1 md:mb-0 md:w-1/2 md:p-4">
            <SiStellar className="h-12 w-12 text-red-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Pay with Stellar</h2>
            <p className="max-w-sm text-sm text-gray-800">
              Connect Freighter and pay in USDC. Card payments are not currently supported.
            </p>
          </div>
          <div className="order-1 w-full rounded-md p-1 sm:p-4 md:order-2 md:w-1/2">
            {stage === 1 && (
              <section aria-labelledby="checkout-details-title" className="bg-white p-4 rounded shadow-md">
                <h2 id="checkout-details-title" className="text-2xl mb-4 text-center">
                  Delivery details
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label htmlFor="checkout-first-name" className="block text-gray-700">
                      First Name
                    </label>
                    <input
                      id="checkout-first-name"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="min-h-11 w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-last-name" className="block text-gray-700">
                      Last Name
                    </label>
                    <input
                      id="checkout-last-name"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="min-h-11 w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-email" className="block text-gray-700">
                      Email
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="min-h-11 w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-address-line1" className="block text-gray-700">
                      Address line 1
                    </label>
                    <input
                      id="checkout-address-line1"
                      type="text"
                      name="addressLine1"
                      value={formData.address.addressLine1}
                      onChange={handleChange}
                      required
                      autoComplete="address-line1"
                      className="min-h-11 w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-address-line2" className="block text-gray-700">
                      Address line 2 (optional)
                    </label>
                    <input
                      id="checkout-address-line2"
                      type="text"
                      name="addressLine2"
                      value={formData.address.addressLine2}
                      onChange={handleChange}
                      autoComplete="address-line2"
                      className="min-h-11 w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-city" className="block text-gray-700">City</label>
                    <input
                      id="checkout-city"
                      type="text"
                      name="city"
                      value={formData.address.city}
                      onChange={handleChange}
                      required
                      autoComplete="address-level2"
                      className="min-h-11 w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-region" className="block text-gray-700">
                      State / region
                    </label>
                    <input
                      id="checkout-region"
                      type="text"
                      name="region"
                      value={formData.address.region}
                      onChange={handleChange}
                      required
                      autoComplete="address-level1"
                      className="min-h-11 w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-postal-code" className="block text-gray-700">
                      Postal code
                    </label>
                    <input
                      id="checkout-postal-code"
                      type="text"
                      name="postalCode"
                      value={formData.address.postalCode}
                      onChange={handleChange}
                      required
                      autoComplete="postal-code"
                      className="min-h-11 w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-country" className="block text-gray-700">
                      Country
                    </label>
                    <input
                      id="checkout-country"
                      type="text"
                      name="country"
                      value={formData.address.country}
                      onChange={handleChange}
                      required
                      autoComplete="country-name"
                      className="min-h-11 w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>
                {!customerDetailsComplete && (
                  <p className="text-sm text-gray-600" role="status">
                    Enter your name, email, street, city, region, postal code, and country to continue to payment.
                  </p>
                )}
              </section>
            )}
            {stage === 1 && (
              <div className="mt-4 bg-white p-4 rounded shadow-md flex flex-col gap-3">
                {quoteLoading && <p role="status">Confirming current catalog prices…</p>}
                {quoteError && (
                  <p className="text-red-700" role="alert">
                    {quoteError}
                  </p>
                )}
                {quoteToken && quoteExpiresAt && (
                  <p
                    className="text-sm text-gray-700"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    Server-confirmed checkout total: ${totalPrice.toFixed(2)} USDC. Quote expires at{" "}
                    {new Date(quoteExpiresAt).toLocaleTimeString()}.
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-gray-300" />
                  <span className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <SiStellar size={16} className="text-red-600" />
                    Pay with Stellar (USDC)
                  </span>
                  <span className="h-px flex-1 bg-gray-300" />
                </div>
                <StellarWalletButton />
                <StellarCheckoutButton
                  amountUsd={totalPrice}
                  orderId={orderId}
                  quoteToken={quoteToken}
                  disabled={!customerDetailsComplete || totalPrice <= 0 || quoteLoading || !quoteToken}
                  onSuccess={handleStellarSuccess}
                  validateBeforePay={() =>
                    customerDetailsComplete
                      ? ""
                      : "Complete your delivery details before signing the payment."
                  }
                />
                <StellarOrderWatch orderId={orderId} enabled={stage === 1} />
                <p className="text-[11px] text-gray-700 text-center">
                  Order #{orderId} · USDC (testnet) is escrowed by a Soroban smart contract until we
                  ship, then released to our merchant wallet. Refunds go straight back on-chain. Payment is completed through Freighter.
                </p>
              </div>
            )}
            {stage === 2 && (
              <div className="bg-white p-4 rounded shadow-md h-full flex flex-col justify-center items-center">
                <h2 className="text-6xl mb-4 text-center">Order Completed.</h2>
                <p className="text-center">Your order has been placed successfully.</p>
                {orderSaveFailed && paymentHash && (
                  <p className="mt-3 max-w-xl break-all text-center text-sm text-red-800" role="alert">
                    Payment was confirmed, but its order record could not be saved. Keep this
                    transaction hash for reconciliation: {paymentHash}
                  </p>
                )}
                <span className="text-center">Thanks for Shopping with us 🥰🥰🥰</span>
                <Link
                  href="/shop"
                  className="mt-8 inline-flex min-h-11 items-center justify-center rounded-md bg-red-700 px-4 py-2 text-center hover:bg-red-500"
                >
                  Back to Shop
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: "" })}
        time={4000}
      />
    </>
  );
};

export default Checkout;

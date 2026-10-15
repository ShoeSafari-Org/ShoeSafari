"use client";
import { useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";

import Toast from "../../components/Toast";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { MdArrowBack } from "react-icons/md";
import Link from "next/link";
import {
  FaCcVisa,
  FaCcMastercard,
  FaCcPaypal,
  FaCcStripe,
  FaCcApplePay,
  FaCcAmex,
  FaCcDiscover,
  FaGooglePay,
  FaCcAmazonPay,
  FaCreditCard,
} from "react-icons/fa";
import { BsBank, BsCalendarDate } from "react-icons/bs";
import { SiKlarna } from "react-icons/si";
import sendMail from "../../lib/sendmail";
import StellarCheckoutButton from "../../components/StellarCheckoutButton";
import StellarWalletButton from "../../components/StellarWalletButton";
import StellarOrderWatch from "../../components/StellarOrderWatch";
import { SiStellar } from "react-icons/si";
import { saveStellarOrder } from "../../lib/orderStore";
import { useAuth } from "../../lib/AuthContext";
import {
  formatTokenAmount,
  tokenSymbolForContract,
  USDC_CONTRACT_ID,
} from "../../lib/stellar/config";
import { logClientError } from "../../lib/safeLogging";

const Checkout = () => {
  const { user } = useAuth();

  const [otp, setOtp] = useState(Math.floor(Math.random() * 1000000) + 1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [quoteToken, setQuoteToken] = useState("");
  const [quoteExpiresAt, setQuoteExpiresAt] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "" });
  const [stage, setStage] = useState(1);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    subject: "YOUR ORDER CONFIRMATION",
  });

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 5000);
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
  }) => {
    const completedOrderId = result.orderId || orderId;
    let orderSaved = true;
    try {
      const storedItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
      await saveStellarOrder({
        orderId: completedOrderId,
        result,
        customer: formData,
        userId: user?.uid || null,
        items: result.items || (Array.isArray(storedItems) ? storedItems : []),
      });
    } catch (error) {
      orderSaved = false;
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
    setStage(3);
    localStorage.removeItem("totalPrice");
    localStorage.removeItem("itemCount");
    localStorage.removeItem("cartItems");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredOtp(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sendMail({
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        message: `You are about to checkout your cart on ShoeSafari. Your OTP is: ${otp}`,
        recipientEmail: formData.email,
        subject: formData.subject,
      });

      setStage(2);
      showToast("Form submitted successfully. OTP has been sent to your email.");
    } catch (error) {
      setIsSubmitting(false);
      showToast("Failed to send OTP. Please try again.");
    }
  };

  const handleEmailConfirmationSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsOtpSending(true);
    if (parseInt(enteredOtp) === otp) {
      setStage(3);
      localStorage.clear();
      showToast("OTP confirmed successfully.");
    } else {
      setIsOtpSending(false);
      showToast("Incorrect OTP. Please try again.");
    }
  };

  const handleGoBack = () => {
    if (stage > 1) {
      setStage(stage - 1);
      setIsSubmitting(false);
    }
  };

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
    if (stage === 3) {
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
            <span className="sr-only">Step 1: Customer details</span>
            <span
              aria-hidden="true"
              className={`w-20 h-1 sm:w-96 ${stage >= 2 ? "bg-red-700" : "bg-gray-200"}`}
            ></span>
          </li>
          <li
            aria-current={stage === 2 ? "step" : undefined}
            className="flex items-center space-x-2"
          >
            <span
              aria-hidden="true"
              className={`flex justify-center items-center w-8 h-8 sm:w-10 sm:h-10 border border-red-700 rounded-full ${
                stage >= 2 ? "bg-red-700 text-white" : "bg-white"
              }`}
            >
              2
            </span>
            <span className="sr-only">Step 2: Confirm email</span>
            <span
              aria-hidden="true"
              className={`w-20 h-1 sm:w-96 ${stage >= 3 ? "bg-red-700" : "bg-gray-200"}`}
            ></span>
          </li>
          <li aria-current={stage === 3 ? "step" : undefined}>
            <span
              aria-hidden="true"
              className={`flex justify-center items-center w-8 h-8 sm:w-10 sm:h-10 border border-red-700 rounded-full ${
                stage >= 3 ? "bg-red-700 text-white" : "bg-white"
              }`}
            >
              3
            </span>
            <span className="sr-only">Step 3: Order complete</span>
          </li>
        </ol>
      </nav>

      <div className="container mx-auto my-5 w-full max-w-6xl rounded-md border-2 border-red-700 bg-red-400 px-3 py-3 sm:my-10 sm:px-4 sm:py-4">
        <div className="flex flex-col md:flex-row">
          <div className="order-2 mb-2 grid w-full grid-cols-4 items-center justify-items-center gap-y-4 rounded-md p-3 md:order-1 md:mb-0 md:w-1/2 md:grid-cols-3 md:p-4">
            <FaCcVisa
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
            <FaCcMastercard
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
            <FaCcPaypal
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
            <FaCcStripe
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
            <BsBank
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
            <FaCcAmex
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
            <FaCcDiscover
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
            <FaCcApplePay
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
            <FaGooglePay
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
            <FaCcAmazonPay
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
            <SiKlarna
              className="h-7 w-7 sm:h-10 sm:w-10 md:h-[70px] md:w-[70px]"
              aria-hidden="true"
            />
          </div>
          <div className="order-1 w-full rounded-md p-1 sm:p-4 md:order-2 md:w-1/2">
            {stage === 1 && (
              <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow-md">
                <h2 className="text-2xl mb-4 text-center">Checkout</h2>
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
                    <label htmlFor="checkout-address" className="block text-gray-700">
                      Address
                    </label>
                    <input
                      id="checkout-address"
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      className="min-h-11 w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-card-number" className="block text-gray-700">
                      Card Number
                    </label>
                    <div className="relative flex justify-center items-center">
                      <input
                        id="checkout-card-number"
                        type="text"
                        name="cardNumber"
                        autoComplete="cc-number"
                        inputMode="numeric"
                        value={formData.cardNumber}
                        onChange={(e) => {
                          let { value } = e.target;
                          if (value.length > 16) {
                            value = value.slice(0, 16);
                          }
                          setFormData((prevData) => ({
                            ...prevData,
                            cardNumber: value,
                          }));
                        }}
                        maxLength={16}
                        required
                        className="min-h-11 w-full px-3 py-2 border rounded"
                      />
                      <FaCreditCard
                        aria-hidden="true"
                        className="absolute top-1/2 right-8 transform -translate-y-1/2 text-gray-500"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="checkout-expiry" className="block text-gray-700">
                      Expiry Date
                    </label>
                    <div className="relative flex justify-center items-center">
                      <input
                        id="checkout-expiry"
                        type="text"
                        name="expiryDate"
                        autoComplete="cc-exp"
                        inputMode="numeric"
                        value={formData.expiryDate}
                        onChange={(e) => {
                          let { value } = e.target;
                          value = value.replace(/[^0-9]/g, "");
                          if (value.length > 6) {
                            value = value.slice(0, 6);
                          }
                          setFormData((prevData) => ({
                            ...prevData,
                            expiryDate: value,
                          }));
                        }}
                        placeholder="DD/MM/YY"
                        maxLength={6}
                        className="min-h-11 w-full px-3 py-2 border rounded"
                        required
                      />
                      <BsCalendarDate
                        aria-hidden="true"
                        className="absolute top-1/2 right-8 transform -translate-y-1/2 text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="checkout-cvv" className="block text-gray-700">
                      Security code
                    </label>
                    <div className="relative flex justify-center items-center">
                      <input
                        id="checkout-cvv"
                        type="text"
                        name="cvv"
                        autoComplete="cc-csc"
                        inputMode="numeric"
                        value={formData.cvv}
                        onChange={(e) => {
                          let { value } = e.target;
                          if (value.length > 3) {
                            value = value.slice(0, 3);
                          }
                          setFormData((prevData) => ({
                            ...prevData,
                            cvv: value,
                          }));
                        }}
                        maxLength={3}
                        required
                        className="min-h-11 w-full px-3 py-2 border rounded"
                      />
                      <FaCreditCard
                        aria-hidden="true"
                        className="absolute top-1/2 right-8 transform -translate-y-1/2 text-gray-500"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="min-h-11 w-full flex justify-center items-center bg-red-700 text-white py-2 rounded hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 transition-colors disabled:cursor-wait"
                >
                  {isSubmitting ? (
                    <>
                      <AiOutlineLoading3Quarters aria-hidden="true" className="animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </form>
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
                    or pay with Stellar (USDC)
                  </span>
                  <span className="h-px flex-1 bg-gray-300" />
                </div>
                <StellarWalletButton />
                <StellarCheckoutButton
                  amountUsd={totalPrice}
                  orderId={orderId}
                  quoteToken={quoteToken}
                  disabled={isSubmitting || totalPrice <= 0 || quoteLoading || !quoteToken}
                  onSuccess={handleStellarSuccess}
                />
                <StellarOrderWatch orderId={orderId} enabled={stage === 1} />
                <p className="text-[11px] text-gray-700 text-center">
                  Order #{orderId} · USDC (testnet) is escrowed by a Soroban smart contract until we
                  ship, then released to our merchant wallet. Refunds go straight back on-chain. No
                  card needed.
                </p>
              </div>
            )}
            {stage === 2 && (
              <form
                onSubmit={handleEmailConfirmationSubmit}
                className="bg-white p-4 rounded shadow-md h-full space-y-12"
              >
                <h2 className="text-2xl mb-4 text-center">Confirm OTP</h2>
                <span className="text-md">An OTP was sent to your email</span>
                <div className="mb-4">
                  <label htmlFor="checkout-otp" className="block text-gray-700">
                    Please confirm OTP
                  </label>
                  <input
                    id="checkout-otp"
                    type="text"
                    name="otpConfirmation"
                    value={enteredOtp}
                    onChange={handleOtpChange}
                    required
                    placeholder="OTP"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="min-h-11 w-full max-w-xs px-3 py-2 border rounded"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isOtpSending}
                  aria-busy={isOtpSending}
                  className="min-h-11 w-full bg-red-700 text-white flex justify-center items-center py-2 rounded hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 transition-colors disabled:cursor-wait"
                >
                  {isOtpSending ? (
                    <>
                      <AiOutlineLoading3Quarters aria-hidden="true" className="animate-spin mr-2" />
                      Confirming...
                    </>
                  ) : (
                    "Confirm"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="min-h-11 w-full flex justify-center items-center bg-gray-300 text-black py-2 rounded mt-4 hover:bg-gray-500 transition-colors"
                >
                  <MdArrowBack className="mr-2" />
                  Go Back
                </button>
              </form>
            )}
            {stage === 3 && (
              <div className="bg-white p-4 rounded shadow-md h-full flex flex-col justify-center items-center">
                <h2 className="text-6xl mb-4 text-center">Order Completed.</h2>
                <p className="text-center">Your order has been placed successfully.</p>
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

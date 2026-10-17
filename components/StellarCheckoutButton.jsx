"use client";
import { useEffect, useMemo, useRef, useState } from "react";

import { orderIdHash, payWithStellar } from "../lib/stellar/checkout";
import { connectWallet, currentAddress } from "../lib/stellar/freighter";
import { parseError } from "../lib/errors";
import {
  CHECKOUT_CONTRACT_ID,
  formatTokenAmount,
  tokenForContract,
} from "../lib/stellar/config";
import { transactionExplorerUrl } from "../lib/stellar/explorer";
import { useNotification } from "./Notification";
import { checkTransactionStatus } from "../lib/stellar/events";
import {
  clearPendingPayment,
  loadPendingPayment,
  savePendingPayment,
} from "../lib/stellar/recovery";

/**
 * Pay the current cart total with the selected Stellar asset (via Freighter).
 */
const StellarCheckoutButton = ({ amountUsd, orderId, quoteToken, paymentAsset = "USDC", onSuccess, validateBeforePay, disabled = false }) => {
  const { success, error: notifyError } = useNotification();
  const [publicKey, setPublicKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [feeEstimate, setFeeEstimate] = useState("");
  const [error, setError] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [result, setResult] = useState(null);
  const [recovery, setRecovery] = useState(null);
  const [recoveryLoaded, setRecoveryLoaded] = useState(false);
  const submissionInFlight = useRef(false);

  const generatedOrderId = useMemo(() => `SS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, []);
  const effectiveOrderId = recovery?.orderId || orderId || generatedOrderId;
  const confirmedAmount = result?.receipt?.amount
    ? `${formatTokenAmount(result.receipt.amount, result.receipt.token)} ${tokenForContract(result.receipt.token)?.symbol || "token"}`
    : result
      ? `${Number(result.amountUsd).toFixed(2)} USD`
      : "";

  useEffect(() => {
    let cancelled = false;
    currentAddress().then((addr) => {
      if (!cancelled && addr) setPublicKey(addr);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pending = loadPendingPayment();
    if (pending) {
      setRecovery(pending);
      setTransactionHash(pending.hash);
      setMessage("A submitted payment is ready to check.");
    }
    setRecoveryLoaded(true);
  }, []);

  const handlePay = async () => {
    // State updates disable the button on the next render; the ref closes the
    // same-render window where multiple clicks could start two payments.
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;

    const e2eMode =
      process.env.NODE_ENV !== "production" &&
      window.localStorage.getItem("__shoesafari_e2e") === "1";
    setError("");
    setFeeEstimate("");
    setTransactionHash("");
    setResult(null);
    const validationMessage = validateBeforePay?.();
    if (validationMessage) {
      setError(validationMessage);
      setBusy(false);
      submissionInFlight.current = false;
      return;
    }
    setBusy(true);
    setMessage("Connecting wallet…");

    let key = publicKey;
    if (!key) {
      try {
        key = e2eMode ? "G" + "A".repeat(55) : await connectWallet();
        setPublicKey(key);
        if (!e2eMode) success("Your Freighter wallet is connected.", "Wallet connected");
      } catch (e) {
        submissionInFlight.current = false;
        setBusy(false);
        const message = parseError(e).userMessage;
        setError(message);
        notifyError(message, "Wallet connection failed");
        return;
      }
    }

    try {
      if (!quoteToken) throw new Error("A trusted checkout quote is required.");
      const quoteResponse = await fetch("/api/checkout/quote/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteToken }),
      });
      const quoteBody = await quoteResponse.json();
      if (!quoteResponse.ok) {
        throw new Error(quoteBody.error || "The checkout quote could not be verified.");
      }
      const quote = quoteBody.quote;
      if (quote.expiresAt <= Date.now()) {
        throw new Error("This checkout quote has expired. Return to your cart and try again.");
      }
      const token = tokenForContract(quote.payment?.tokenContractId);
      if (!token || quote.payment.asset !== paymentAsset || !/^\d+$/.test(quote.payment.amountRaw)) {
        throw new Error("The selected payment asset no longer matches the checkout quote. Request a fresh quote.");
      }
      const amountRaw = BigInt(quote.payment.amountRaw);
      if (amountRaw <= 0n) throw new Error("The quoted payment amount is invalid. Request a fresh quote.");

      if (e2eMode) {
        const mockResult = {
          hash: "a".repeat(64),
          status: "SUCCESS",
          receipt: {
            ledger: 123456,
            buyer: key,
            contractId: CHECKOUT_CONTRACT_ID,
            token: token.contractId,
            orderId: await orderIdHash(quote.orderId),
            amount: amountRaw.toString(),
            txHash: "a".repeat(64),
          },
          amountRaw,
          amountUsd: Number(quote.totalUsd),
          expectedPayment: {
            buyerWallet: key,
            tokenContract: token.contractId,
            checkoutContractId: CHECKOUT_CONTRACT_ID,
            amountRaw: amountRaw.toString(),
          },
        };
        setResult(mockResult);
        setMessage("");
        success("Your payment was successful.", "Payment complete");
        if (onSuccess) onSuccess({ ...mockResult, orderId: quote.orderId, items: quote.items });
        return;
      }

      const res = await payWithStellar({
        amountUsd: quote.totalUsd,
        orderId: quote.orderId,
        quoteToken,
        publicKey: key,
        token,
        amountRaw,
        onStatus: (msg) => setMessage(msg),
        onFeeEstimate: (estimate) => setFeeEstimate(estimate),
        onSubmitted: (hash) => {
          const pending = {
            hash,
            orderId: quote.orderId,
            buyerWallet: key,
            tokenContract: token.contractId,
            checkoutContractId: CHECKOUT_CONTRACT_ID,
            amountRaw: amountRaw.toString(),
            amountUsd: Number(quote.totalUsd),
            tokenContractId: token.contractId,
          };
          savePendingPayment(pending);
          setRecovery(pending);
          setTransactionHash(hash);
        },
      });
      res.expectedPayment = {
        buyerWallet: key,
        tokenContract: token.contractId,
        checkoutContractId: CHECKOUT_CONTRACT_ID,
        amountRaw: amountRaw.toString(),
      };
      clearPendingPayment();
      setRecovery(null);
      setResult(res);
      setMessage("");
      success("Your payment was confirmed on Stellar.", "Payment complete");
      if (onSuccess) onSuccess({ ...res, orderId: quote.orderId, items: quote.items });
    } catch (e) {
      const appError = parseError(e);
      const savedPayment = loadPendingPayment();
      const submittedPaymentIsUnresolved =
        Boolean(appError.transactionHash) &&
        savedPayment?.hash === appError.transactionHash &&
        appError.code !== "TX_FAILED";

      if (submittedPaymentIsUnresolved) {
        setRecovery(savedPayment);
        setTransactionHash(savedPayment.hash);
        setMessage("");
        setError(
          "Payment was submitted, but confirmation is still pending or unknown. Check this transaction's status before trying again.",
        );
      } else if (savedPayment?.hash === appError.transactionHash && appError.code === "TX_FAILED") {
        clearPendingPayment();
        setRecovery(null);
        setError("The Stellar network confirmed that this payment failed. You can start a new attempt.");
        notifyError("The Stellar network confirmed that this payment failed. You can start a new attempt.", "Payment failed");
        setTransactionHash(appError.transactionHash || "");
      } else {
        setError(appError.userMessage);
        notifyError(appError.userMessage, "Payment failed");
        setTransactionHash(appError.transactionHash || "");
      }
    } finally {
      submissionInFlight.current = false;
      setBusy(false);
    }
  };

  const handleCheckRecovery = async () => {
    if (!recovery) return;
    setBusy(true);
    setError("");
    setMessage("Checking submitted transaction…");

    try {
      const checked = await checkTransactionStatus(recovery.hash);
      if (checked.status === "SUCCESS") {
        const receipt = checked.receipt;
        if (!receipt || receipt.orderId !== (await orderIdHash(recovery.orderId))) {
          throw new Error("The saved transaction does not match this order.");
        }
        const amountRaw = BigInt(receipt.amount || "0");
        const recoveredResult = {
          hash: recovery.hash,
          orderId: recovery.orderId,
          status: checked.status,
          receipt,
          amountRaw,
          amountUsd: recovery.amountUsd ?? Number(amountRaw) / 10 ** 7,
          expectedPayment: {
            buyerWallet: recovery.buyerWallet,
            tokenContract: recovery.tokenContract,
            checkoutContractId: recovery.checkoutContractId,
            amountRaw: recovery.amountRaw,
          },
        };
        clearPendingPayment();
        setRecovery(null);
        setResult(recoveredResult);
        setMessage("");
        success("Your submitted payment was confirmed.", "Payment complete");
        if (onSuccess) onSuccess(recoveredResult);
      } else if (checked.status === "FAILED") {
        clearPendingPayment();
        setRecovery(null);
        setMessage("");
        setError("The Stellar network confirmed that this payment failed. You can start a new attempt.");
        notifyError("The Stellar network confirmed that this payment failed. You can start a new attempt.", "Payment failed");
      } else {
        setMessage("The transaction is not final yet. Check again shortly.");
      }
    } catch (checkError) {
      const message = parseError(checkError).userMessage;
      setError(message);
      notifyError(message, "Could not check payment");
      setMessage("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={handlePay}
        disabled={disabled || busy || Boolean(result) || Boolean(recovery) || !recoveryLoaded}
        aria-busy={busy}
        className={`w-full flex flex-col items-center justify-center gap-1 py-3 rounded transition-colors disabled:opacity-60 ${
          result ? "bg-green-700 text-white" : "bg-red-700 hover:bg-red-800 text-white"
        }`}
      >
        {busy ? (
          <>
            <span className="flex items-center gap-2 font-semibold">
              <span
                aria-hidden="true"
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              />
              {message || "Processing…"}
            </span>
          </>
        ) : result ? (
          <>
            <span className="font-semibold">Payment confirmed ✓</span>
            <span className="text-xs text-white/80">
              {confirmedAmount} · order {effectiveOrderId}
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold">
              Pay with {paymentAsset}{amountUsd ? ` · $${Number(amountUsd).toFixed(2)}` : ""}
            </span>
            <span className="text-xs text-white/80">From your Stellar wallet (Freighter)</span>
          </>
        )}
      </button>

      {message && !busy && (
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-gray-800">
          {message}
        </p>
      )}

      {feeEstimate && (
        <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-gray-700">
          {feeEstimate}
        </p>
      )}

      {recovery && (
        <button
          type="button"
          onClick={handleCheckRecovery}
          disabled={busy}
          aria-busy={busy}
          className="min-h-11 w-full rounded border border-blue-700 px-3 py-2 text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 disabled:opacity-60"
        >
          {busy ? message || "Checking…" : "Check saved payment status"}
        </button>
      )}

      {error && (
        <div className="text-xs text-red-600 text-center" role="alert" aria-live="polite">
          <p>{error}</p>
          {transactionHash && (
            <a
              className="mt-1 inline-flex min-h-11 items-center justify-center px-2 underline"
              href={transactionExplorerUrl(transactionHash) || undefined}
              target="_blank"
              rel="noreferrer"
            >
              Check transaction status ({transactionHash.slice(0, 12)}…)
            </a>
          )}
        </div>
      )}

      {result && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-xs text-green-800 bg-green-50 border border-green-200 rounded p-2 text-center"
        >
          Paid on ledger {result.receipt ? result.receipt.ledger : "—"} · tx{" "}
          <a
            href={transactionExplorerUrl(result.hash) || undefined}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {result.hash.slice(0, 12)}…
          </a>
          {result.simulation && (
            <div className="mt-1 text-[11px] text-green-800/80">
              Preflight: {result.simulation.instructions.toLocaleString()} CPU instr · min resource
              fee {result.simulation.minResourceFeeStroops} stroops · total budget{" "}
              {result.simulation.recommendedInclusionFeeStroops} stroops
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StellarCheckoutButton;

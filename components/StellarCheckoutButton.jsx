import { useEffect, useMemo, useState } from "react";

import { orderIdHash, payWithStellar } from "../lib/stellar/checkout";
import { connectWallet, currentAddress } from "../lib/stellar/freighter";
import { parseError } from "../lib/errors";
import { NETWORK } from "../lib/stellar/config";
import { checkTransactionStatus } from "../lib/stellar/events";
import {
  clearPendingPayment,
  loadPendingPayment,
  savePendingPayment,
} from "../lib/stellar/recovery";

/**
 * Pay the current cart total with USDC on Stellar (via Freighter).
 */
const StellarCheckoutButton = ({ amountUsd, orderId, quoteToken, onSuccess, disabled = false }) => {
  const [publicKey, setPublicKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [result, setResult] = useState(null);
  const [recovery, setRecovery] = useState(null);
  const [recoveryLoaded, setRecoveryLoaded] = useState(false);

  const generatedOrderId = useMemo(() => `SS-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, []);
  const effectiveOrderId = recovery?.orderId || orderId || generatedOrderId;

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
    setError("");
    setTransactionHash("");
    setResult(null);
    setBusy(true);
    setMessage("Connecting wallet…");

    let key = publicKey;
    if (!key) {
      try {
        key = await connectWallet();
        setPublicKey(key);
      } catch (e) {
        setBusy(false);
        setError(parseError(e).userMessage);
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

      const res = await payWithStellar({
        amountUsd: quote.totalUsd,
        orderId: quote.orderId,
        quoteToken,
        publicKey: key,
        onStatus: (msg) => setMessage(msg),
        onSubmitted: (hash) => {
          const pending = { hash, orderId: quote.orderId };
          savePendingPayment(pending);
          setRecovery(pending);
          setTransactionHash(hash);
        },
      });
      clearPendingPayment();
      setRecovery(null);
      setResult(res);
      setMessage("");
      if (onSuccess) onSuccess({ ...res, orderId: quote.orderId, items: quote.items });
    } catch (e) {
      const appError = parseError(e);
      setError(appError.userMessage);
      setTransactionHash(appError.transactionHash || "");
    } finally {
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
          amountUsd: Number(amountRaw) / 10 ** 7,
        };
        clearPendingPayment();
        setRecovery(null);
        setResult(recoveredResult);
        setMessage("");
        if (onSuccess) onSuccess(recoveredResult);
      } else if (checked.status === "FAILED") {
        clearPendingPayment();
        setRecovery(null);
        setMessage("");
        setError("The saved payment failed on the Stellar network. You can try again.");
      } else {
        setMessage("The transaction is not final yet. Check again shortly.");
      }
    } catch (checkError) {
      setError(parseError(checkError).userMessage);
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
              ${Number(result.amountUsd).toFixed(2)} USDC · order {effectiveOrderId}
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold">
              Pay with USDC{amountUsd ? ` · $${Number(amountUsd).toFixed(2)}` : ""}
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
              href={`https://stellar.expert/explorer/${NETWORK === "mainnet" ? "public" : "testnet"}/tx/${transactionHash}`}
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
            href={`https://stellar.expert/explorer/${NETWORK === "mainnet" ? "public" : "testnet"}/tx/${result.hash}`}
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

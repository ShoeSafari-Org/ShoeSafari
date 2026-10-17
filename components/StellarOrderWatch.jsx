"use client";
import { useEffect, useRef, useState } from "react";

import { PaymentEventIndexer } from "../lib/stellar/indexer";
import { bytesToHex, hashOrderId } from "../lib/stellar/scval";
import { useNotification } from "./Notification";

/**
 * Live on-chain order monitor.
 *
 * Starts a `getEvents`-based indexer for the checkout contract and watches for
 * the `pay` event matching `orderId`. Shows a decoded, real-time confirmation
 * the moment the payment lands on-chain (independent of the classic
 * getTransaction polling used during submission).
 */
const StellarOrderWatch = ({ orderId, enabled = true, onEvent = null }) => {
  const { success, error: notifyError } = useNotification();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [matched, setMatched] = useState(null);
  const [waitingTooLong, setWaitingTooLong] = useState(false);
  const indexerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !orderId) return undefined;

    let cancelled = false;
    let indexer = null;
    let timeoutId = null;
    setWaitingTooLong(false);

    const start = async () => {
      const bytes = await hashOrderId(orderId);
      if (cancelled) return;
      const expected = bytesToHex(bytes).toLowerCase();

      indexer = new PaymentEventIndexer();
      indexerRef.current = indexer;

      timeoutId = window.setTimeout(() => {
        if (!cancelled) setWaitingTooLong(true);
      }, 60_000);

      indexer.start({
        onStatus: (s) => {
          setConnected(s.running);
          if (s.lastError) setError(s.lastError);
        },
        onError: (err) => {
          setError(err.message);
          notifyError(err.message, "Order updates unavailable");
        },
        onEvent: (event) => {
          if (event.symbol !== "pay") return;
          const orderHex = (event.fields.topic4 || "").toLowerCase();
          if (orderHex !== expected) return;
          if (timeoutId) window.clearTimeout(timeoutId);
          setMatched(event);
          success(`Payment update received for order ${orderId}.`, "Order updated");
          if (onEvent) onEvent(event);
          indexer.stop();        },
      });
    };

    void start();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      if (indexer) indexer.stop();
      indexerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, orderId]);

  return (
    <div className="w-full text-xs bg-white/70 border border-red-600/30 rounded-md p-3">
      <div className="flex items-center gap-2 font-semibold text-red-600">
        <span
          className={`w-2 h-2 rounded-full ${
            matched ? "bg-green-500" : connected ? "bg-red-600 animate-pulse" : "bg-gray-400"
          }`}
        />
        Stellar order monitor
      </div>

      {matched ? (
        <div className="mt-2 text-green-700 bg-green-50 border border-green-200 rounded p-2">
          <span className="font-semibold">Payment detected on-chain ✓</span>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span>Ledger</span>
            <span className="text-right font-mono">{matched.ledger}</span>
            <span>Amount</span>
            <span className="text-right font-mono">{matched.fields.amount ?? "—"}</span>
            <span>Token</span>
            <span className="text-right font-mono truncate">{matched.fields.topic1 ?? "—"}</span>
            <span>Tx</span>
            <span className="text-right font-mono truncate">{matched.txHash}</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2 text-gray-600">
          {waitingTooLong ? (
            <span>
              Still waiting for confirmation for order {orderId}. A timeout does not confirm
              failure; check the transaction before trying another payment.
            </span>
          ) : connected ? (
            <>
              <span className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              Listening for on-chain events for order {orderId}…
            </>
          ) : (
            "Starting…"
          )}
        </div>
      )}

      {error && (
        <div className="mt-2 text-amber-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default StellarOrderWatch;

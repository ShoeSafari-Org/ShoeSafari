import { useEffect, useState } from "react";

import { currentAddress, freighterAvailable, WalletError } from "../lib/stellar/freighter";
import { shortAddress } from "../lib/stellar/freighter";

/**
 * Connect / disconnect a Freighter wallet and show the connected address.
 */
const StellarWalletButton = ({ onConnect = null }) => {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    freighterAvailable().then((available) => {
      if (cancelled) return;
      if (available) {
        currentAddress().then((addr) => {
          if (cancelled || !addr) return;
          setConnected(true);
          setAddress(addr);
          if (onConnect) onConnect(addr);
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [onConnect]);

  const handleConnect = async () => {
    setError("");
    setLoading(true);
    try {
      const addr = await connectWallet();
      setConnected(true);
      setAddress(addr);
      if (onConnect) onConnect(addr);
    } catch (e) {
      if (e instanceof WalletError) {
        setError(e.message);
      } else {
        setError("Could not connect to Freighter.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setAddress("");
    setError("");
  };

  return (
    <div className="flex flex-col items-stretch gap-1 w-full">
      {!connected ? (
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 border-2 border-red-600 text-red-600 bg-white py-2 rounded hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <span className="animate-pulse">Connecting…</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2l2.5 5.5L20 9l-4 3.5 1.2 5.5L12 15.5 6.8 18 8 12.5 4 9l5.5-1.5L12 2z"
                  fill="#dc2626"
                />
              </svg>
              Connect Freighter
            </>
          )}
        </button>
      ) : (
        <div className="w-full flex items-center justify-between gap-2 bg-white border border-gray-200 rounded px-3 py-2">
          <span className="text-sm font-medium text-gray-700" title={address}>
            {shortAddress(address)}
          </span>
          <button
            type="button"
            onClick={handleDisconnect}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
      {error && <span className="text-xs text-red-600 text-center">{error}</span>}
    </div>
  );
};

export default StellarWalletButton;

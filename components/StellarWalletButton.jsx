"use client";
import { useEffect, useState } from "react";
import {
  connectWallet,
  currentAddress,
  setWalletProvider,
  shortAddress,
  WalletError,
} from "../lib/stellar/freighter";
import { useNotification } from "./Notification";

const StellarWalletButton = ({ onConnect = null }) => {
  const { success, error: notifyError, info } = useNotification();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [provider, setProvider] = useState("freighter");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    currentAddress().then((addr) => {
      if (!cancelled && addr) { setConnected(true); setAddress(addr); if (onConnect) onConnect(addr); }
    });
    return () => { cancelled = true; };
  }, [onConnect]);

  const handleConnect = async (selectedProvider) => {
    setError(""); setLoading(true); setProvider(selectedProvider);
    try {
      const addr = await connectWallet(selectedProvider);
      setConnected(true); setAddress(addr);
      success(`Your ${selectedProvider === "xbull" ? "xBull" : "Freighter"} wallet is connected.`, "Wallet connected");
      if (onConnect) onConnect(addr);
    } catch (e) {
      const message = e instanceof WalletError ? e.message : "Could not connect to the selected wallet.";
      setError(message); notifyError(message, "Wallet connection failed");
    } finally { setLoading(false); }
  };

  const handleDisconnect = () => {
    setConnected(false); setAddress(""); setError(""); setWalletProvider("freighter");
    info("Your wallet was disconnected.", "Wallet disconnected");
  };

  if (connected) return (
    <div className="w-full flex items-center justify-between gap-2 bg-white border border-gray-200 rounded px-3 py-2">
      <span className="text-sm font-medium text-gray-700" title={address}>{shortAddress(address)} ({provider === "xbull" ? "xBull" : "Freighter"})</span>
      <button type="button" onClick={handleDisconnect} className="min-h-11 min-w-11 px-3 text-xs text-gray-500 hover:text-red-600">Disconnect</button>
    </div>
  );

  return (
    <div className="flex flex-col items-stretch gap-2 w-full">
      <button type="button" onClick={() => handleConnect("freighter")} disabled={loading} className="min-h-11 w-full border-2 border-red-600 text-red-600 bg-white py-2 rounded disabled:opacity-60">
        {loading && provider === "freighter" ? "Connecting…" : "Connect Freighter"}
      </button>
      <button type="button" onClick={() => handleConnect("xbull")} disabled={loading} className="min-h-11 w-full border-2 border-gray-600 text-gray-700 bg-white py-2 rounded disabled:opacity-60">
        {loading && provider === "xbull" ? "Connecting…" : "Connect xBull"}
      </button>
      {error && <span className="text-xs text-red-600 text-center">{error}</span>}
    </div>
  );
};

export default StellarWalletButton;

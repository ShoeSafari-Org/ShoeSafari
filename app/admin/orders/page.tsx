"use client";
import React, { useState, useEffect, useCallback } from "react";
import AdminGuard from "../../../components/AdminGuard";
import StellarWalletButton from "../../../components/StellarWalletButton";
import { PaymentEventIndexer, IndexedEvent } from "../../../lib/stellar/indexer";
import {
  dispatchOrder,
  refundOrder,
  OrderEvent,
  eventToOrder,
  OrderStatus,
} from "../../../lib/stellar/orders";
import { currentAddress } from "../../../lib/stellar/freighter";
import { CHECKOUT_CONTRACT_ID } from "../../../lib/stellar/config";
import { transactionExplorerUrl } from "../../../lib/stellar/explorer";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import {
  MdRefresh,
  MdCheckCircle,
  MdLocalShipping,
  MdPayment,
  MdPending,
  MdCancel,
} from "react-icons/md";
import { SiStellar } from "react-icons/si";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebaseConfig";
import {
  addOrderSupportNote,
  anonymizeStellarOrderPersonalData,
  recordStellarOrderAction,
  updateOrderSupportNote,
  updateStellarOrderStatus,
} from "../../../lib/orderStore";
import { isOrderRetentionDue } from "../../../lib/orderRetention";
import { logClientError } from "../../../lib/safeLogging";
import { formatShippingAddress } from "../../../lib/shippingAddress";

// Status badge component
const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const statusConfig: Record<
    OrderStatus,
    { bg: string; text: string; icon: React.ReactNode }
  > = {
    Pending: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      icon: <MdPending className="mr-1" />,
    },
    Paid: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      icon: <MdPayment className="mr-1" />,
    },
    Shipped: {
      bg: "bg-green-100",
      text: "text-green-800",
      icon: <MdLocalShipping className="mr-1" />,
    },
    Refunded: {
      bg: "bg-red-100",
      text: "text-red-800",
      icon: <MdCancel className="mr-1" />,
    },
    Unknown: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      icon: null,
    },
  };

  const config = statusConfig[status] || statusConfig.Unknown;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.icon}
      {status}
    </span>
  );
};

// Format timestamp
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Truncate address for display
const truncateAddress = (address: string) => {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

type SupportNote = {
  id: string;
  orderIdHash: string;
  note: string;
  resolutionStatus: "open" | "resolved";
  authorEmail?: string | null;
};

// Order row component
const OrderRow = ({
  order,
  onDispatch,
  onRefund,
  onAnonymize,
  supportNotes,
  onAddSupportNote,
  onUpdateSupportNote,
  isProcessing,
}: {
  order: OrderEvent;
  onDispatch: (orderId: string) => void;
  onRefund: (orderId: string) => void;
  onAnonymize: (orderId: string, customerRequest: boolean) => void;
  supportNotes: SupportNote[];
  onAddSupportNote: (orderId: string) => void;
  onUpdateSupportNote: (orderId: string, noteId: string, status: "open" | "resolved") => void;
  isProcessing: boolean;
}) => {
  const canDispatch = order.status === "Paid";
  const canRefund = order.status === "Paid";
  const completed = order.status === "Shipped" || order.status === "Refunded";
  const hasCustomerData = Boolean(
    order.commerce?.customer?.firstName ||
      order.commerce?.customer?.lastName ||
      order.commerce?.customer?.email ||
      order.commerce?.customer?.address ||
      order.commerce?.userId ||
      order.commerce?.buyerWallet
  );
  const canApplyRetention =
    completed && hasCustomerData && isOrderRetentionDue(order.commerce);

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-4 px-4">
        <div className="font-mono text-xs text-gray-600">
          {truncateAddress(order.orderId)}
        </div>
        {order.commerce?.customer &&
          (order.commerce.customer.firstName ||
            order.commerce.customer.lastName ||
            order.commerce.customer.email) && (
            <div className="mt-1 text-xs text-gray-500">
              {order.commerce.customer.firstName} {order.commerce.customer.lastName}
              {order.commerce.customer.email && <div>{order.commerce.customer.email}</div>}
              {order.commerce.customer.address && (
                <div>{formatShippingAddress(order.commerce.customer.address)}</div>
              )}
            </div>
          )}
        <div className="mt-2 max-w-sm space-y-1">
          {supportNotes.map((supportNote) => (
            <div key={supportNote.id} className="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
              <div>{supportNote.note}</div>
              <div className="mt-1 flex items-center justify-between gap-2 text-gray-500">
                <span>{supportNote.resolutionStatus} · {supportNote.authorEmail || "admin"}</span>
                <button
                  type="button"
                  className="text-blue-700 underline"
                  onClick={() => onUpdateSupportNote(order.orderId, supportNote.id, supportNote.resolutionStatus === "open" ? "resolved" : "open")}
                >
                  {supportNote.resolutionStatus === "open" ? "Resolve" : "Reopen"}
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="text-xs text-blue-700 underline" onClick={() => onAddSupportNote(order.orderId)}>
            Add support note
          </button>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="font-mono text-xs text-gray-600">
          {truncateAddress(order.buyer)}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="font-semibold">
          {order.amount} {order.tokenSymbol}
        </div>
      </td>
      <td className="py-4 px-4">
        <StatusBadge status={order.status} />
      </td>
      <td className="py-4 px-4 text-sm text-gray-500">
        {formatDate(order.timestamp)}
      </td>
      <td className="py-4 px-4 text-sm">
        <a
          href={transactionExplorerUrl(order.txHash) || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline font-mono text-xs"
        >
          {truncateAddress(order.txHash)}
        </a>
      </td>
      <td className="py-4 px-4">
        <div className="flex gap-2">
          {canDispatch && (
            <button
              onClick={() => onDispatch(order.orderId)}
              disabled={isProcessing}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isProcessing ? (
                <AiOutlineLoading3Quarters className="animate-spin" />
              ) : (
                <MdLocalShipping />
              )}
              Ship
            </button>
          )}
          {canRefund && (
            <button
              onClick={() => onRefund(order.orderId)}
              disabled={isProcessing}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isProcessing ? (
                <AiOutlineLoading3Quarters className="animate-spin" />
              ) : (
                <MdCancel />
              )}
              Refund
            </button>
          )}
          {canApplyRetention && (
            <button
              onClick={() => onAnonymize(order.orderId, false)}
              disabled={isProcessing}
              className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50"
            >
              Anonymize after retention
            </button>
          )}
          {completed && hasCustomerData && (
            <button
              onClick={() => onAnonymize(order.orderId, true)}
              disabled={isProcessing}
              className="px-3 py-1 text-sm border border-gray-500 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Honor verified request
            </button>
          )}
          {!canDispatch && !canRefund && (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </div>
      </td>
    </tr>
  );
};

// Main orders management content
const OrdersManagementContent = () => {
  const [orders, setOrders] = useState<Map<string, OrderEvent>>(new Map());
  const [supportNotes, setSupportNotes] = useState<Map<string, SupportNote[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [indexerStatus, setIndexerStatus] = useState<{
    running: boolean;
    eventsSeen: number;
  }>({ running: false, eventsSeen: 0 });
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim().toLowerCase()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  const [statusFilter, setStatusFilter] = useState(() =>
    typeof window === "undefined"
      ? "All"
      : new URLSearchParams(window.location.search).get("status") || "All"
  );
  const [tokenFilter, setTokenFilter] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("token") || ""
  );
  const [fromDate, setFromDate] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("from") || ""
  );
  const [toDate, setToDate] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("to") || ""
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (tokenFilter) params.set("token", tokenFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [statusFilter, tokenFilter, fromDate, toDate]);

  const mergeCommerceOrders = useCallback(async () => {
    if (!db) return;
    const [snapshot, notesSnapshot] = await Promise.all([
      getDocs(collection(db, "ShoeSafariOrders")),
      getDocs(collection(db, "ShoeSafariOrderNotes")),
    ]);
    const commerceOrders = new Map(
      snapshot.docs.map((orderDoc) => [orderDoc.data().orderId, {
        documentId: orderDoc.id,
        customer: orderDoc.data().customer,
        items: orderDoc.data().items,
        userId: orderDoc.data().userId,
        buyerWallet: orderDoc.data().buyerWallet,
        status: orderDoc.data().status,
        completedAt: orderDoc.data().completedAt,
        updatedAt: orderDoc.data().updatedAt,
        personalDataAnonymizedAt: orderDoc.data().personalDataAnonymizedAt,
      }])
    );

    setOrders((previous) => {
      const merged = new Map(previous);
      for (const [orderId, commerce] of commerceOrders) {
        const existing = merged.get(orderId);
        if (existing) merged.set(orderId, { ...existing, commerce });
      }
      return merged;
    });
    const notes = new Map<string, SupportNote[]>();
    notesSnapshot.docs.forEach((noteDoc) => {
      const data = noteDoc.data();
      const status = data.resolutionStatus === "resolved" ? "resolved" : "open";
      const note: SupportNote = {
        id: noteDoc.id,
        orderIdHash: data.orderIdHash,
        note: data.note,
        resolutionStatus: status,
        authorEmail: data.authorEmail || null,
      };
      const existing = notes.get(note.orderIdHash) || [];
      notes.set(note.orderIdHash, [...existing, note]);
    });
    setSupportNotes(notes);
  }, []);

  const handleAddSupportNote = useCallback(async (orderId: string) => {
    const note = window.prompt("Add a non-sensitive support note for this order:");
    if (!note?.trim()) return;
    try {
      const created = await addOrderSupportNote({ orderIdHash: orderId, note });
      setSupportNotes((previous) => {
        const updated = new Map(previous);
        updated.set(orderId, [...(updated.get(orderId) || []), created]);
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save support note.");
    }
  }, []);

  const handleUpdateSupportNote = useCallback(async (
    orderId: string,
    noteId: string,
    status: "open" | "resolved"
  ) => {
    try {
      await updateOrderSupportNote(noteId, status);
      setSupportNotes((previous) => {
        const updated = new Map(previous);
        updated.set(orderId, (updated.get(orderId) || []).map((note) =>
          note.id === noteId ? { ...note, resolutionStatus: status } : note
        ));
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update support note.");
    }
  }, []);

  // Initialize event indexer
  useEffect(() => {
    const indexer = new PaymentEventIndexer();

    indexer.start({
      onEvent: (event: IndexedEvent) => {
        const order = eventToOrder(event);
        if (order) {
          setOrders((prev) => {
            const newMap = new Map(prev);
            // Update existing order or add new one
            const existing = newMap.get(order.orderId);
            if (existing) {
              // Update status if the new event is more recent
              if (event.ledger > (existing.ledger || 0)) {
                newMap.set(order.orderId, { ...existing, ...order });
              }
            } else {
              newMap.set(order.orderId, order);
            }
            return newMap;
          });
        }
      },
      onStatus: (status) => {
        setIndexerStatus({
          running: status.running,
          eventsSeen: status.eventsSeen,
        });
        setIsLoading(false);
      },
      onError: (err) => {
        setError(err.message);
        setIsLoading(false);
      },
    });

    void mergeCommerceOrders().catch((loadError) => {
      // The chain remains authoritative; Firestore adds optional commerce
      // context and should not hide on-chain orders if it is unavailable.
      logClientError("Could not load commerce order details", loadError);
    });

    // Stop after 2 seconds of loading to show UI
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => {
      indexer.stop();
      clearTimeout(loadingTimeout);
    };
  }, [mergeCommerceOrders]);

  // Handle dispatch order
  const handleDispatch = useCallback(async (orderId: string) => {
    const order = orders.get(orderId);
    if (!order) return;
    if (!window.confirm([
      "Confirm dispatch: release escrow to the merchant?",
      `Order: ${order.orderId}`,
      `Buyer: ${order.buyer}`,
      `Token: ${order.token} (${order.tokenSymbol})`,
      `Amount: ${order.amount}`,
      `Current status: ${order.status}`,
      "Destination: merchant wallet configured on-chain",
    ].join("\n"))) return;
    const operatorWallet = await currentAddress().catch(() => null);
    void recordStellarOrderAction({ orderId, action: "dispatch", phase: "attempted", operatorWallet })
      .catch((auditError) => logClientError("Could not record dispatch attempt", auditError));
    setProcessingOrderId(orderId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await dispatchOrder(orderId);

      if (result.success) {
        void recordStellarOrderAction({
          orderId,
          action: "dispatch",
          phase: "succeeded",
          operatorWallet,
          txHash: result.txHash,
          ledger: result.ledger,
        }).catch((auditError) => logClientError("Could not record dispatch success", auditError));
        setSuccessMessage(
          `Order ${truncateAddress(orderId)} dispatched successfully. Transaction: ${result.txHash || "confirmed"}`
        );
        // Update local state
        setOrders((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(orderId);
          if (existing) {
            newMap.set(orderId, {
              ...existing,
              status: "Shipped",
              txHash: result.txHash || existing.txHash,
              ledger: result.ledger || existing.ledger,
            });
          }
          return newMap;
        });
        const commerce = orders.get(orderId)?.commerce;
        if (commerce) {
          void updateStellarOrderStatus(commerce.documentId, "Shipped").catch((statusError) =>
            logClientError("Could not sync shipped status to Firestore", statusError)
          );
        }
      } else {
        void recordStellarOrderAction({
          orderId,
          action: "dispatch",
          phase: "failed",
          operatorWallet,
          reason: result.error,
        }).catch((auditError) => logClientError("Could not record dispatch failure", auditError));
        setError(result.error || "Failed to dispatch order");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setProcessingOrderId(null);
    }
  }, [orders]);

  const handleAnonymize = useCallback(
    async (orderId: string, customerRequest: boolean) => {
      const confirmation = customerRequest
        ? "Confirm that the customer’s identity and deletion request have been verified. This removes direct customer details from the Firestore order record."
        : "Anonymize direct customer details now? This action is available only after the one-year retention period.";
      if (!window.confirm(confirmation)) return;

      const commerce = orders.get(orderId)?.commerce;
      if (!commerce) return;
      setProcessingOrderId(orderId);
      setError(null);
      setSuccessMessage(null);

      try {
        await anonymizeStellarOrderPersonalData(commerce.documentId, { customerRequest });
        setOrders((previous) => {
          const updated = new Map(previous);
          const current = updated.get(orderId);
          if (current?.commerce) {
            updated.set(orderId, {
              ...current,
              commerce: {
                ...current.commerce,
                userId: null,
                buyerWallet: null,
                customer: { firstName: "", lastName: "", email: "", address: "" },
                personalDataAnonymizedAt: { toMillis: () => Date.now() },
              },
            });
          }
          return updated;
        });
        setSuccessMessage(
          `Customer details for order ${truncateAddress(orderId)} were anonymized.`
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not anonymize customer details.");
      } finally {
        setProcessingOrderId(null);
      }
    },
    [orders]
  );

  // Handle refund order
  const handleRefund = useCallback(async (orderId: string) => {
    const order = orders.get(orderId);
    if (!order) return;
    if (!window.confirm([
      "Confirm refund: return escrow to the buyer?",
      `Order: ${order.orderId}`,
      `Buyer: ${order.buyer}`,
      `Token: ${order.token} (${order.tokenSymbol})`,
      `Amount: ${order.amount}`,
      `Current status: ${order.status}`,
      "This action cannot be undone.",
    ].join("\n"))) return;
    const operatorWallet = await currentAddress().catch(() => null);
    void recordStellarOrderAction({ orderId, action: "refund", phase: "attempted", operatorWallet })
      .catch((auditError) => logClientError("Could not record refund attempt", auditError));
    setProcessingOrderId(orderId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await refundOrder(orderId);

      if (result.success) {
        void recordStellarOrderAction({
          orderId,
          action: "refund",
          phase: "succeeded",
          operatorWallet,
          txHash: result.txHash,
          ledger: result.ledger,
        }).catch((auditError) => logClientError("Could not record refund success", auditError));
        setSuccessMessage(
          `Order ${truncateAddress(orderId)} refunded successfully. Transaction: ${result.txHash || "confirmed"}`
        );
        // Update local state
        setOrders((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(orderId);
          if (existing) {
            newMap.set(orderId, {
              ...existing,
              status: "Refunded",
              txHash: result.txHash || existing.txHash,
              ledger: result.ledger || existing.ledger,
            });
          }
          return newMap;
        });
        const commerce = orders.get(orderId)?.commerce;
        if (commerce) {
          void updateStellarOrderStatus(commerce.documentId, "Refunded").catch((statusError) =>
            logClientError("Could not sync refunded status to Firestore", statusError)
          );
        }
      } else {
        void recordStellarOrderAction({
          orderId,
          action: "refund",
          phase: "failed",
          operatorWallet,
          reason: result.error,
        }).catch((auditError) => logClientError("Could not record refund failure", auditError));
        setError(result.error || "Failed to refund order");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setProcessingOrderId(null);
    }
  }, [orders]);

  // Sort orders by timestamp (newest first)
  const sortedOrders = Array.from(orders.values()).sort(
    (a, b) => b.timestamp - a.timestamp
  );

  const visibleOrders = sortedOrders.filter((order) => {
    if (searchTerm && ![order.orderId, order.buyer, order.txHash, order.commerce?.orderReference || "", order.commerce?.documentId || ""].some((value) => value.toLowerCase().includes(searchTerm))) return false;
    if (statusFilter !== "All" && order.status !== statusFilter) return false;
    if (tokenFilter && order.tokenSymbol.toLowerCase() !== tokenFilter.toLowerCase()) return false;
    if (fromDate && order.timestamp < new Date(`${fromDate}T00:00:00`).getTime()) return false;
    if (toDate && order.timestamp > new Date(`${toDate}T23:59:59.999`).getTime()) return false;
    return true;
  });

  // Stats
  const stats = {
    total: visibleOrders.length,
    pending: visibleOrders.filter((o) => o.status === "Pending").length,
    paid: visibleOrders.filter((o) => o.status === "Paid").length,
    shipped: visibleOrders.filter((o) => o.status === "Shipped").length,
    refunded: visibleOrders.filter((o) => o.status === "Refunded").length,
  };
  const tokenOptions = Array.from(new Set(sortedOrders.map((order) => order.tokenSymbol))).sort();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Order Management</h1>
          <p className="text-gray-500 mt-1">
            Manage Stellar escrow orders - dispatch or refund payments
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StellarWalletButton />
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Back to Products
          </Link>
        </div>
      </div>

      {/* Network Info */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
        <SiStellar className="text-red-600 text-xl" />
        <div>
          <span className="font-medium text-red-800">
            Stellar {NETWORK.toUpperCase()}
          </span>
          <span className="text-red-600 ml-2 text-sm">
            Contract: {truncateAddress(CHECKOUT_CONTRACT_ID)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-red-600">
          <span
            className={`w-2 h-2 rounded-full ${
              indexerStatus.running ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {indexerStatus.eventsSeen} events indexed
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
          <MdCheckCircle className="text-green-500" />
          {successMessage}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Total Orders</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-yellow-600 text-sm flex items-center gap-1">
            <MdPending /> Pending
          </div>
          <div className="text-2xl font-bold text-yellow-800">
            {stats.pending}
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-blue-600 text-sm flex items-center gap-1">
            <MdPayment /> Paid (Escrow)
          </div>
          <div className="text-2xl font-bold text-blue-800">{stats.paid}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-green-600 text-sm flex items-center gap-1">
            <MdLocalShipping /> Shipped
          </div>
          <div className="text-2xl font-bold text-green-800">
            {stats.shipped}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <div className="text-red-600 text-sm flex items-center gap-1">
            <MdCancel /> Refunded
          </div>
          <div className="text-2xl font-bold text-red-800">
            {stats.refunded}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Orders</h2>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:text-gray-800"
          >
            <MdRefresh /> Refresh
          </button>
        </div>

        <div className="px-6 py-4 border-b bg-gray-50">
          <label className="block max-w-xl text-sm text-gray-700">
            <span className="block mb-1 font-medium">Search reference, wallet, or transaction hash</span>
            <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search identifiers" className="w-full rounded border border-gray-300 bg-white px-3 py-2" aria-describedby="order-search-help" />
            <span id="order-search-help" className="sr-only">Search is applied after a short delay.</span>
          </label>
        </div>
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2"
              >
                <option value="All">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Shipped">Shipped</option>
                <option value="Refunded">Refunded</option>
              </select>
            </label>
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">Token</span>
              <select
                value={tokenFilter}
                onChange={(event) => setTokenFilter(event.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2"
              >
                <option value="">All tokens</option>
                {tokenOptions.map((token) => <option key={token} value={token}>{token}</option>)}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">From</span>
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" />
            </label>
            <label className="text-sm text-gray-700">
              <span className="block mb-1 font-medium">To</span>
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" />
            </label>
            <button
              type="button"
              onClick={() => { setStatusFilter("All"); setTokenFilter(""); setFromDate(""); setToDate(""); }}
              className="rounded border border-gray-400 px-3 py-2 text-sm text-gray-700 hover:bg-white"
            >
              Clear filters
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-600" role="status" aria-live="polite">
            Showing {visibleOrders.length} of {sortedOrders.length} orders
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <AiOutlineLoading3Quarters className="animate-spin text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading orders from blockchain...</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="p-12 text-center">
            <SiStellar className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No orders found</p>
            <p className="text-gray-400 text-sm">
              Orders will appear here when customers pay with Stellar USDC
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TX Hash
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <OrderRow
                    key={order.orderId}
                    order={order}
                    onDispatch={handleDispatch}
                    onRefund={handleRefund}
                    onAnonymize={handleAnonymize}
                    supportNotes={supportNotes.get(order.orderId) || []}
                    onAddSupportNote={handleAddSupportNote}
                    onUpdateSupportNote={handleUpdateSupportNote}
                    isProcessing={processingOrderId === order.orderId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-700 mb-3">How it works:</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <MdPayment className="text-blue-500 mt-0.5" />
            <span>
              <strong>Paid (Escrow):</strong> Customer has paid and funds are
              held in the smart contract escrow
            </span>
          </li>
          <li className="flex items-start gap-2">
            <MdLocalShipping className="text-green-500 mt-0.5" />
            <span>
              <strong>Ship:</strong> Release the escrowed funds to your merchant
              wallet when you ship the order
            </span>
          </li>
          <li className="flex items-start gap-2">
            <MdCancel className="text-red-500 mt-0.5" />
            <span>
              <strong>Refund:</strong> Return the escrowed funds to the
              customer's wallet (e.g., if item is out of stock)
            </span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-gray-500">
          Note: Only the merchant wallet that deployed the contract can
          dispatch/refund orders. Make sure you're connected with the correct
          Freighter wallet.
        </p>
      </div>
    </div>
  );
};

// Wrap with AdminGuard
const OrdersManagement = () => {
  return (
    <AdminGuard>
      <OrdersManagementContent />
    </AdminGuard>
  );
};

export default OrdersManagement;

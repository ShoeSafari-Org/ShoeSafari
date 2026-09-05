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
import { NETWORK, CHECKOUT_CONTRACT_ID } from "../../../lib/stellar/config";
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
import { updateStellarOrderStatus } from "../../../lib/orderStore";

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

// Order row component
const OrderRow = ({
  order,
  onDispatch,
  onRefund,
  isProcessing,
}: {
  order: OrderEvent;
  onDispatch: (orderId: string) => void;
  onRefund: (orderId: string) => void;
  isProcessing: boolean;
}) => {
  const canDispatch = order.status === "Paid";
  const canRefund = order.status === "Paid";

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-4 px-4">
        <div className="font-mono text-xs text-gray-600">
          {truncateAddress(order.orderId)}
        </div>
        {order.commerce?.customer && (
          <div className="mt-1 text-xs text-gray-500">
            {order.commerce.customer.firstName} {order.commerce.customer.lastName}
            {order.commerce.customer.email && <div>{order.commerce.customer.email}</div>}
          </div>
        )}
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
          href={`https://stellar.expert/explorer/${NETWORK}/tx/${order.txHash}`}
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

  const mergeCommerceOrders = useCallback(async () => {
    if (!db) return;
    const snapshot = await getDocs(collection(db, "ShoeSafariOrders"));
    const commerceOrders = new Map(
      snapshot.docs.map((orderDoc) => [orderDoc.data().orderId, {
        documentId: orderDoc.id,
        customer: orderDoc.data().customer,
        items: orderDoc.data().items,
        userId: orderDoc.data().userId,
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
      console.warn("Could not load commerce order details", loadError);
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
    setProcessingOrderId(orderId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await dispatchOrder(orderId);

      if (result.success) {
        setSuccessMessage(
          `Order ${truncateAddress(orderId)} dispatched successfully!`
        );
        // Update local state
        setOrders((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(orderId);
          if (existing) {
            newMap.set(orderId, { ...existing, status: "Shipped" });
          }
          return newMap;
        });
        const commerce = orders.get(orderId)?.commerce;
        if (commerce) {
          void updateStellarOrderStatus(commerce.documentId, "Shipped").catch((statusError) =>
            console.warn("Could not sync shipped status to Firestore", statusError)
          );
        }
      } else {
        setError(result.error || "Failed to dispatch order");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setProcessingOrderId(null);
    }
  }, [orders]);

  // Handle refund order
  const handleRefund = useCallback(async (orderId: string) => {
    setProcessingOrderId(orderId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await refundOrder(orderId);

      if (result.success) {
        setSuccessMessage(
          `Order ${truncateAddress(orderId)} refunded successfully!`
        );
        // Update local state
        setOrders((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(orderId);
          if (existing) {
            newMap.set(orderId, { ...existing, status: "Refunded" });
          }
          return newMap;
        });
        const commerce = orders.get(orderId)?.commerce;
        if (commerce) {
          void updateStellarOrderStatus(commerce.documentId, "Refunded").catch((statusError) =>
            console.warn("Could not sync refunded status to Firestore", statusError)
          );
        }
      } else {
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

  // Stats
  const stats = {
    total: sortedOrders.length,
    pending: sortedOrders.filter((o) => o.status === "Pending").length,
    paid: sortedOrders.filter((o) => o.status === "Paid").length,
    shipped: sortedOrders.filter((o) => o.status === "Shipped").length,
    refunded: sortedOrders.filter((o) => o.status === "Refunded").length,
  };

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

        {isLoading ? (
          <div className="p-12 text-center">
            <AiOutlineLoading3Quarters className="animate-spin text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading orders from blockchain...</p>
          </div>
        ) : sortedOrders.length === 0 ? (
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
                {sortedOrders.map((order) => (
                  <OrderRow
                    key={order.orderId}
                    order={order}
                    onDispatch={handleDispatch}
                    onRefund={handleRefund}
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

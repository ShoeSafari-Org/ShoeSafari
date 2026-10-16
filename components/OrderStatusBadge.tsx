import type { OrderStatus } from "../lib/stellar/orders";
import type { ReactNode } from "react";
import {
  MdCancel,
  MdLocalShipping,
  MdPayment,
  MdPending,
} from "react-icons/md";

type Props = { status: OrderStatus };

const statusConfig: Record<
  OrderStatus,
  { bg: string; text: string; icon: ReactNode }
> = {
  Pending: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    icon: <MdPending className="mr-1" aria-hidden="true" />,
  },
  Paid: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: <MdPayment className="mr-1" aria-hidden="true" />,
  },
  Shipped: {
    bg: "bg-green-100",
    text: "text-green-800",
    icon: <MdLocalShipping className="mr-1" aria-hidden="true" />,
  },
  Refunded: {
    bg: "bg-red-100",
    text: "text-red-800",
    icon: <MdCancel className="mr-1" aria-hidden="true" />,
  },
  Unknown: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    icon: null,
  },
};

export default function OrderStatusBadge({ status }: Props) {
  const config = statusConfig[status] || statusConfig.Unknown;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.icon}
      {status}
    </span>
  );
}

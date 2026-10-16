import { render, screen } from "@testing-library/react";
import OrderStatusBadge from "../../components/OrderStatusBadge";
import type { OrderStatus } from "../../lib/stellar/orders";

describe("OrderStatusBadge", () => {
  it.each<OrderStatus>(["Pending", "Paid", "Shipped", "Refunded", "Unknown"])(
    "renders the %s order status",
    (status) => {
      render(<OrderStatusBadge status={status} />);

      expect(screen.getByText(status)).toBeInTheDocument();
    }
  );
});

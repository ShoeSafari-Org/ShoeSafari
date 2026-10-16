import { render, screen } from "@testing-library/react";
import EmptyState from "../../components/EmptyState";

describe("EmptyState", () => {
  it("renders the heading and description as real text", () => {
    render(
      <EmptyState
        illustration="cart"
        title="Your cart is empty"
        description="Explore the store and find your next favorite pair."
      />
    );

    expect(
      screen.getByRole("heading", { name: "Your cart is empty" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Explore the store and find your next favorite pair.")
    ).toBeInTheDocument();
  });

  it("marks the illustration as decorative (hidden from assistive tech)", () => {
    const { container } = render(<EmptyState title="No orders yet" />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    // No accessible image role should be exposed.
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders a CTA link when actionHref and actionLabel are provided", () => {
    render(
      <EmptyState
        illustration="orders"
        title="No orders yet"
        actionHref="/shop"
        actionLabel="Browse the shop"
      />
    );

    const link = screen.getByRole("link", { name: "Browse the shop" });
    expect(link).toHaveAttribute("href", "/shop");
  });

  it("renders custom action children instead of the default CTA", () => {
    render(
      <EmptyState title="No matching products">
        <button type="button">Clear search</button>
      </EmptyState>
    );

    expect(
      screen.getByRole("button", { name: "Clear search" })
    ).toBeInTheDocument();
  });

  it("exposes a status role when requested for live regions", () => {
    render(<EmptyState role="status" title="No matching products" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

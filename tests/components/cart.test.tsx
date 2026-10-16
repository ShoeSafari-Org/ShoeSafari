import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "../../context/CartContext";

const boots = [
  { id: "trail-boot", name: "Trail boot", img: "/trail-boot.png", price: 49.99 },
  { id: "city-sneaker", name: "City sneaker", img: "/city-sneaker.png", price: 20 },
  {
    id: "unavailable-boot",
    name: "Unavailable boot",
    img: "/unavailable-boot.png",
    price: 75,
    available: false,
  },
];

function CartHarness() {
  const { cartItems, itemCount, totalPrice, addToCart, removeFromCart, clearCart } = useCart();

  return (
    <section>
      <p aria-label="Cart item count">{itemCount}</p>
      <p aria-label="Checkout total">${totalPrice.toFixed(2)}</p>
      <ul aria-label="Cart items">
        {cartItems.map((item, index) => (
          <li key={`${item.id}-${index}`}>
            {item.name}
            <button type="button" onClick={() => removeFromCart(item)}>
              Remove {item.name}
            </button>
          </li>
        ))}
      </ul>
      {boots.map((boot) => (
        <button type="button" key={boot.id} onClick={() => addToCart(boot)}>
          Add {boot.name}
        </button>
      ))}
      <button type="button" onClick={clearCart}>
        Clear cart
      </button>
    </section>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <CartHarness />
    </CartProvider>,
  );
}

describe("shopping cart behavior", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("adds products and keeps the checkout total in sync with the cart", async () => {
    renderCart();

    fireEvent.click(screen.getByRole("button", { name: "Add Trail boot" }));
    fireEvent.click(screen.getByRole("button", { name: "Add City sneaker" }));

    expect(screen.getByLabelText("Cart item count")).toHaveTextContent("2");
    expect(screen.getByLabelText("Checkout total")).toHaveTextContent("$69.99");
    expect(screen.getByRole("list", { name: "Cart items" })).toHaveTextContent("Trail boot");
    expect(screen.getByRole("list", { name: "Cart items" })).toHaveTextContent("City sneaker");

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("cartItems") ?? "[]")).toHaveLength(2);
      expect(Number(window.localStorage.getItem("itemCount"))).toBe(2);
      expect(Number(window.localStorage.getItem("totalPrice"))).toBeCloseTo(69.99, 2);
    });
  });

  it("removes only the selected item and recalculates the checkout total", () => {
    renderCart();
    fireEvent.click(screen.getByRole("button", { name: "Add Trail boot" }));
    fireEvent.click(screen.getByRole("button", { name: "Add City sneaker" }));

    fireEvent.click(screen.getByRole("button", { name: "Remove Trail boot" }));

    expect(screen.getByLabelText("Cart item count")).toHaveTextContent("1");
    expect(screen.getByLabelText("Checkout total")).toHaveTextContent("$20.00");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("listitem")).toHaveTextContent("City sneaker");
  });

  it("does not add unavailable products and clears cart state", () => {
    renderCart();
    fireEvent.click(screen.getByRole("button", { name: "Add Unavailable boot" }));

    expect(screen.getByLabelText("Cart item count")).toHaveTextContent("0");
    expect(screen.getByLabelText("Checkout total")).toHaveTextContent("$0.00");

    fireEvent.click(screen.getByRole("button", { name: "Add Trail boot" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear cart" }));

    expect(screen.getByLabelText("Cart item count")).toHaveTextContent("0");
    expect(screen.getByLabelText("Checkout total")).toHaveTextContent("$0.00");
    expect(window.localStorage.getItem("cartItems")).toBeNull();
    expect(window.localStorage.getItem("itemCount")).toBeNull();
    expect(window.localStorage.getItem("totalPrice")).toBeNull();
  });
});

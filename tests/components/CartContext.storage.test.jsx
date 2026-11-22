import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CartProvider, useCart } from "../../context/CartContext";

const CartSummary = () => {
  const { cartItems, itemCount, totalPrice } = useCart();
  return (
    <output>
      {itemCount}|{totalPrice}|{cartItems.map((item) => item.id).join(",")}
    </output>
  );
};

const renderCart = () =>
  render(
    <CartProvider>
      <CartSummary />
    </CartProvider>,
  );

const dispatchCartStorageEvent = (key, newValue) => {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key,
      newValue,
      storageArea: window.localStorage,
    }),
  );
};

describe("CartProvider storage synchronization", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows items added in another tab", async () => {
    renderCart();
    const items = [{ id: "shoe-1", price: 79.99 }];

    act(() => {
      window.localStorage.setItem("cartItems", JSON.stringify(items));
      dispatchCartStorageEvent("cartItems", JSON.stringify(items));
    });

    expect(await screen.findByText("1|79.99|shoe-1")).toBeInTheDocument();
  });

  it("shows items removed in another tab", async () => {
    const remainingItems = [{ id: "shoe-1", price: 79.99 }];
    window.localStorage.setItem(
      "cartItems",
      JSON.stringify([...remainingItems, { id: "shoe-2", price: 120 }]),
    );
    renderCart();

    act(() => {
      window.localStorage.setItem("cartItems", JSON.stringify(remainingItems));
      dispatchCartStorageEvent("cartItems", JSON.stringify(remainingItems));
    });

    expect(await screen.findByText("1|79.99|shoe-1")).toBeInTheDocument();
  });

  it("clears the cart when another tab clears local storage", async () => {
    window.localStorage.setItem(
      "cartItems",
      JSON.stringify([{ id: "shoe-1", price: 79.99 }]),
    );
    renderCart();

    act(() => {
      window.localStorage.clear();
      dispatchCartStorageEvent(null, null);
    });

    expect(await screen.findByText("0|0|")).toBeInTheDocument();
  });

  it("ignores malformed cart data without losing the current state", async () => {
    const items = [{ id: "shoe-1", price: 79.99 }];
    window.localStorage.setItem("cartItems", JSON.stringify(items));
    renderCart();

    act(() => {
      window.localStorage.setItem("cartItems", "not-json");
      dispatchCartStorageEvent("cartItems", "not-json");
    });

    expect(await screen.findByText("1|79.99|shoe-1")).toBeInTheDocument();
  });
});

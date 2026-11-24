import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import Cart from "../../components/Cart";
import Modal from "../../components/Modal";

/**
 * Keyboard and accessibility coverage for the cart flow (#336).
 *
 * Cart.jsx and Modal.jsx are tested together rather than separately because the
 * behaviour that matters is the pair: the trigger must advertise what it opens,
 * and the dialog must trap focus, close on Escape, and hand focus back to the
 * element that opened it.
 */

function CartFlow({ initialItems = 2 }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(
    Array.from({ length: initialItems }, (_, i) => ({
      id: i + 1,
      name: `Shoe ${i + 1}`,
    }))
  );

  return (
    <>
      <Cart itemCount={items.length} onClick={() => setOpen(true)} isOpen={open} />
      <Modal show={open} onClose={() => setOpen(false)} ariaLabel="Shopping cart">
        <p role="status" aria-live="polite" className="sr-only">
          {items.length === 0
            ? "Your cart is empty"
            : `${items.length} ${items.length === 1 ? "item" : "items"} in cart`}
        </p>
        <ul aria-label="Cart items">
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.name}</span>
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
                aria-label={`Remove ${item.name} from cart`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <button type="button">Checkout</button>
      </Modal>
    </>
  );
}

beforeAll(() => {
  // jsdom reports zero-size boxes, so the focus trap's visibility filter would
  // drop every element and the trap would look broken.
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => 1,
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 1,
  });
});

afterAll(() => {
  delete HTMLElement.prototype.offsetWidth;
  delete HTMLElement.prototype.offsetHeight;
});

describe("cart accessibility (#336)", () => {
  it("advertises the dialog on the trigger before it is opened", () => {
    render(<CartFlow />);
    const trigger = screen.getByRole("button", { name: /open shopping cart/i });

    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("flips aria-expanded once the dialog is open", async () => {
    render(<CartFlow />);
    const trigger = screen.getByRole("button", { name: /open shopping cart/i });

    fireEvent.click(trigger);

    await screen.findByRole("dialog", { name: "Shopping cart" });
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
  });

  it("exposes the count in the trigger's accessible name", () => {
    render(<CartFlow initialItems={2} />);
    expect(
      screen.getByRole("button", { name: "Open shopping cart, 2 items" })
    ).toBeInTheDocument();
  });

  it("uses the singular form for one item", () => {
    render(<CartFlow initialItems={1} />);
    expect(
      screen.getByRole("button", { name: "Open shopping cart, 1 item" })
    ).toBeInTheDocument();
  });

  it("gives every remove button a unique accessible name", async () => {
    render(<CartFlow />);
    fireEvent.click(screen.getByRole("button", { name: /open shopping cart/i }));

    await screen.findByRole("dialog", { name: "Shopping cart" });

    // Without per-row aria-labels every button would be named "Remove" and a
    // screen-reader user could not tell which row they are on.
    expect(
      screen.getByRole("button", { name: "Remove Shoe 1 from cart" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Shoe 2 from cart" })
    ).toBeInTheDocument();
  });

  it("moves focus into the dialog and restores it to the trigger on close", async () => {
    render(<CartFlow />);
    const trigger = screen.getByRole("button", { name: /open shopping cart/i });

    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Shopping cart" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus()
    );

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(dialog).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<CartFlow />);
    fireEvent.click(screen.getByRole("button", { name: /open shopping cart/i }));

    const dialog = await screen.findByRole("dialog", { name: "Shopping cart" });
    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it("keeps Tab inside the dialog", async () => {
    render(<CartFlow />);
    fireEvent.click(screen.getByRole("button", { name: /open shopping cart/i }));

    const close = await screen.findByRole("button", { name: "Close dialog" });
    const last = screen.getByRole("button", { name: "Checkout" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(close).toHaveFocus();

    close.focus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("announces the cart contents through a live region", async () => {
    render(<CartFlow />);
    fireEvent.click(screen.getByRole("button", { name: /open shopping cart/i }));

    await screen.findByRole("dialog", { name: "Shopping cart" });

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("2 items in cart");
  });

  it("updates the live region after an item is removed", async () => {
    render(<CartFlow />);
    fireEvent.click(screen.getByRole("button", { name: /open shopping cart/i }));
    await screen.findByRole("dialog", { name: "Shopping cart" });

    fireEvent.click(screen.getByRole("button", { name: "Remove Shoe 1 from cart" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("1 item in cart")
    );
  });

  it("announces an empty cart once the last item is removed", async () => {
    render(<CartFlow initialItems={1} />);
    fireEvent.click(screen.getByRole("button", { name: /open shopping cart/i }));
    await screen.findByRole("dialog", { name: "Shopping cart" });

    fireEvent.click(screen.getByRole("button", { name: "Remove Shoe 1 from cart" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Your cart is empty")
    );
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import Modal from "../../components/Modal";

function ModalConsumer() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setShow(true)}>
        Open cart
      </button>
      <Modal show={show} onClose={() => setShow(false)} ariaLabel="Shopping cart">
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Modal>
    </>
  );
}

beforeAll(() => {
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

describe("Modal", () => {
  it("moves focus into the labeled dialog and restores it after close", async () => {
    render(<ModalConsumer />);
    const opener = screen.getByRole("button", { name: "Open cart" });
    opener.focus();
    fireEvent.click(opener);

    const dialog = await screen.findByRole("dialog", { name: "Shopping cart" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
    });

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(dialog).not.toBeInTheDocument();
  });

  it("cycles Tab and Shift+Tab between the first and last controls", async () => {
    render(<ModalConsumer />);
    fireEvent.click(screen.getByRole("button", { name: "Open cart" }));

    const first = await screen.findByRole("button", { name: "Close dialog" });
    const last = screen.getByRole("button", { name: "Last action" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("closes on Escape", async () => {
    render(<ModalConsumer />);
    fireEvent.click(screen.getByRole("button", { name: "Open cart" }));
    const dialog = await screen.findByRole("dialog", { name: "Shopping cart" });

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });
});

import { trapFocus } from "../../lib/accessibility";

describe("trapFocus", () => {
  it("keeps Tab and Shift+Tab on the dialog when there are no focusable children", () => {
    const container = document.createElement("div");
    container.tabIndex = -1;
    document.body.appendChild(container);

    const releaseFocus = trapFocus(container);
    expect(container).toHaveFocus();

    const forwardTab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(forwardTab);
    expect(forwardTab.defaultPrevented).toBe(true);
    expect(container).toHaveFocus();

    const backwardTab = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(backwardTab);
    expect(backwardTab.defaultPrevented).toBe(true);
    expect(container).toHaveFocus();

    releaseFocus();
    container.remove();
  });
});

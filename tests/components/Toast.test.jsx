import { act, fireEvent, render, screen } from "@testing-library/react";
import Toast from "../../components/Toast";

describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces its message and can be dismissed with Escape", () => {
    const onClose = vi.fn();
    render(<Toast message="Saved" show onClose={onClose} />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByText("Saved")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("provides a labeled button for keyboard and pointer dismissal", () => {
    const onClose = vi.fn();
    render(<Toast message="Saved" show onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("resets its timer when the message is replaced", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { rerender } = render(<Toast message="First" show onClose={onClose} time={1000} />);

    act(() => vi.advanceTimersByTime(750));
    rerender(<Toast message="Second" show onClose={onClose} time={1000} />);
    act(() => vi.advanceTimersByTime(750));
    expect(onClose).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(550));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clears dismissal timers when unmounted", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { unmount } = render(<Toast message="Saved" show onClose={onClose} time={1000} />);

    unmount();
    act(() => vi.advanceTimersByTime(2000));
    expect(onClose).not.toHaveBeenCalled();
  });
});

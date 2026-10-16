import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "../../components/Navbar";

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../lib/AuthContext", () => ({
  useAuth: () => ({
    user: { displayName: "Customer", photoURL: null },
  }),
}));

vi.mock("../../lib/auth", () => ({ logout: mocks.logout }));

describe("Navbar sign out", () => {
  beforeEach(() => {
    mocks.logout.mockReset();
    mocks.replace.mockReset();
    window.localStorage.clear();
  });

  it("signs out, returns to a public route, and preserves the cart", async () => {
    mocks.logout.mockResolvedValue(undefined);
    window.localStorage.setItem("cartItems", '[{"id":"shoe-1"}]');
    render(<Navbar />);

    fireEvent.click(screen.getAllByRole("button", { name: "Logout" })[0]);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem("cartItems")).toBe('[{"id":"shoe-1"}]');
    expect(await screen.findByText("Logged out successfully")).toBeInTheDocument();
  });

  it("keeps the user on the current page and reports a sign-out failure", async () => {
    mocks.logout.mockRejectedValue(new Error("Firebase unavailable"));
    render(<Navbar />);

    fireEvent.click(screen.getAllByRole("button", { name: "Logout" })[0]);

    expect(await screen.findByText("Firebase unavailable")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});

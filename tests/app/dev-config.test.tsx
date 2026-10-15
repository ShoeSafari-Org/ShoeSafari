import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DevelopmentConfigPage from "../../app/dev/config/page";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("development configuration page", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("lists required variable names and safe statuses in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "");

    render(DevelopmentConfigPage());

    expect(screen.getByRole("heading", { name: "Configuration diagnostics" })).toBeInTheDocument();
    const checkoutVariable = screen.getByText("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID");
    expect(checkoutVariable).toBeInTheDocument();
    expect(checkoutVariable.closest("li")).toHaveTextContent("Missing");
    expect(screen.getAllByText("Missing")).toHaveLength(9);
    expect(screen.getByText(/Selected network:/)).toHaveTextContent("testnet");
    expect(screen.getByText(/not a deployment health endpoint/i)).toBeInTheDocument();
  });

  it("returns not found when directly requested in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => DevelopmentConfigPage()).toThrow("NEXT_NOT_FOUND");
  });

  it("returns an HTTP 404 for the route in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new NextRequest("http://localhost:3000/dev/config");

    expect(middleware(request).status).toBe(404);
  });
});

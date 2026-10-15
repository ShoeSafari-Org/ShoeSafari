import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getEnvironmentDiagnostics,
  isAdminEmail,
  isDevelopment,
  isProduction,
} from "../../lib/env";

describe("isAdminEmail", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "admin@test.com,admin2@test.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true for admin emails", () => {
    expect(isAdminEmail("admin@test.com")).toBe(true);
    expect(isAdminEmail("admin2@test.com")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isAdminEmail("ADMIN@TEST.COM")).toBe(true);
    expect(isAdminEmail("Admin@Test.Com")).toBe(true);
  });

  it("returns false for non-admin emails", () => {
    expect(isAdminEmail("user@test.com")).toBe(false);
    expect(isAdminEmail("notadmin@test.com")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("handles empty admin list", () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_EMAILS", "");
    expect(isAdminEmail("admin@test.com")).toBe(false);
  });
});

describe("isDevelopment", () => {
  it("returns true in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDevelopment()).toBe(true);
  });

  it("returns false in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isDevelopment()).toBe(false);
  });
});

describe("isProduction", () => {
  it("returns true in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isProduction()).toBe(true);
  });

  it("returns false in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isProduction()).toBe(false);
  });
});

describe("getEnvironmentDiagnostics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports missing required values by variable name only", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_CONTRACT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_SERVICE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID", "");
    vi.stubEnv("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "");

    const diagnostics = getEnvironmentDiagnostics();

    expect(diagnostics.stellarNetwork).toBe("testnet");
    expect(diagnostics.requiredVariables).toHaveLength(9);
    expect(diagnostics.requiredVariables.every(({ configured }) => !configured)).toBe(true);
    expect(diagnostics.requiredVariables[0]).toEqual({
      name: "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
      configured: false,
    });
  });

  it("reports configured values without returning their contents", () => {
    const secretValues = [
      "checkout-secret-value",
      "email-service-secret-value",
      "email-template-secret-value",
      "email-public-key-secret-value",
      "firebase-api-secret-value",
      "firebase-domain-secret-value",
      "firebase-project-secret-value",
      "firebase-bucket-secret-value",
      "firebase-app-secret-value",
    ];
    const variableNames = [
      "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
      "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
      "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
      "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
    ];
    variableNames.forEach((name, index) => vi.stubEnv(name, secretValues[index]));
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");

    const diagnostics = getEnvironmentDiagnostics();
    const serializedDiagnostics = JSON.stringify(diagnostics);

    expect(diagnostics.stellarNetwork).toBe("mainnet");
    expect(diagnostics.requiredVariables.every(({ configured }) => configured)).toBe(true);
    secretValues.forEach((value) => expect(serializedDiagnostics).not.toContain(value));
  });

  it("does not expose an unrecognized network value", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "unexpected-private-value");

    const diagnostics = getEnvironmentDiagnostics();

    expect(diagnostics.stellarNetwork).toBe("unknown");
    expect(JSON.stringify(diagnostics)).not.toContain("unexpected-private-value");
  });
});

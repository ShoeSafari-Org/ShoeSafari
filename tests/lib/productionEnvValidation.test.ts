import { describe, expect, it } from "vitest";
import { validateProductionEnvironment } from "../../lib/productionEnvValidation.mjs";

const requiredTestnetConfig = {
  NEXT_PUBLIC_CHECKOUT_CONTRACT_ID: "C-test-contract",
  NEXT_PUBLIC_EMAILJS_SERVICE_ID: "service-ci",
  NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: "template-ci",
  NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: "public-ci-key",
  NEXT_PUBLIC_FIREBASE_API_KEY: "firebase-ci-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "shoesafari-ci.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "shoesafari-ci",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "shoesafari-ci.appspot.com",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:ci",
};

describe("validateProductionEnvironment", () => {
  it("allows testnet defaults with the required app configuration", () => {
    expect(validateProductionEnvironment(requiredTestnetConfig)).toEqual([]);
  });

  it("lists missing required fields without echoing supplied values", () => {
    const errors = validateProductionEnvironment({
      NEXT_PUBLIC_CHECKOUT_CONTRACT_ID: "private-looking-value",
    });

    expect(errors).toContain("NEXT_PUBLIC_FIREBASE_API_KEY is required");
    expect(errors.join(" ")).not.toContain("private-looking-value");
  });

  it("requires explicit mainnet contract and RPC configuration", () => {
    const errors = validateProductionEnvironment({
      ...requiredTestnetConfig,
      NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
    });

    expect(errors).toContain("NEXT_PUBLIC_STELLAR_RPC_URL is required for mainnet");
    expect(errors).toContain("NEXT_PUBLIC_USDC_CONTRACT_ID is required for mainnet");
    expect(errors).toContain("NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID is required for mainnet");
  });

  it("accepts a complete mainnet configuration", () => {
    expect(
      validateProductionEnvironment({
        ...requiredTestnetConfig,
        NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
        NEXT_PUBLIC_STELLAR_RPC_URL: "https://rpc.example.test",
        NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE:
          "Public Global Stellar Network ; September 2015",
        NEXT_PUBLIC_USDC_CONTRACT_ID: "C-mainnet-usdc",
        NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID: "C-mainnet-xlm",
      })
    ).toEqual([]);
  });

  it("rejects unsupported networks and mismatched passphrases", () => {
    expect(
      validateProductionEnvironment({
        ...requiredTestnetConfig,
        NEXT_PUBLIC_STELLAR_NETWORK: "devnet",
      })
    ).toContain("NEXT_PUBLIC_STELLAR_NETWORK must be testnet or mainnet");

    expect(
      validateProductionEnvironment({
        ...requiredTestnetConfig,
        NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: "wrong-passphrase",
      })
    ).toContain("NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE does not match testnet");
  });
});

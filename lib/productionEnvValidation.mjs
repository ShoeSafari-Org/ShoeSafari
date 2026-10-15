const REQUIRED_PUBLIC_CONFIG = [
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

const NETWORK_PASSPHRASES = {
  testnet: "Test SDF Network ; September 2015",
  mainnet: "Public Global Stellar Network ; September 2015",
};

const MAINNET_OVERRIDES = [
  "NEXT_PUBLIC_STELLAR_RPC_URL",
  "NEXT_PUBLIC_USDC_CONTRACT_ID",
  "NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID",
];

/** Validate build-time public configuration without including values in errors. */
export function validateProductionEnvironment(env = process.env) {
  const errors = [];
  const configured = (name) => typeof env[name] === "string" && env[name].trim() !== "";

  for (const name of REQUIRED_PUBLIC_CONFIG) {
    if (!configured(name)) errors.push(`${name} is required`);
  }

  const network = configured("NEXT_PUBLIC_STELLAR_NETWORK")
    ? env.NEXT_PUBLIC_STELLAR_NETWORK.trim()
    : "testnet";
  if (!Object.hasOwn(NETWORK_PASSPHRASES, network)) {
    errors.push("NEXT_PUBLIC_STELLAR_NETWORK must be testnet or mainnet");
    return errors;
  }

  for (const name of MAINNET_OVERRIDES) {
    if (network === "mainnet" && !configured(name)) {
      errors.push(`${name} is required for mainnet`);
    }
  }

  const passphrase = env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE?.trim();
  if (passphrase && passphrase !== NETWORK_PASSPHRASES[network]) {
    errors.push(`NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE does not match ${network}`);
  }

  const rpcUrl = env.NEXT_PUBLIC_STELLAR_RPC_URL?.trim();
  if (rpcUrl) {
    try {
      if (new URL(rpcUrl).protocol !== "https:") {
        errors.push("NEXT_PUBLIC_STELLAR_RPC_URL must use HTTPS");
      }
    } catch {
      errors.push("NEXT_PUBLIC_STELLAR_RPC_URL must be a valid HTTPS URL");
    }
  }

  return errors;
}

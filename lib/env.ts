/**
 * Environment Configuration and Validation
 *
 * This module provides type-safe access to environment variables and validates
 * that required configuration is present at runtime.
 */

import {
  expectedNetworkPassphrase,
  isStellarNetwork,
  type StellarNetwork,
} from "./stellar/config";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface StellarConfig {
  network: "testnet" | "mainnet";
  rpcUrl: string;
  networkPassphrase: string;
  checkoutContractId: string;
  usdcContractId: string;
  nativeAssetContractId: string;
}

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  defaultRecipientEmail?: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

export interface EnvConfig {
  stellar: StellarConfig;
  emailjs: EmailJSConfig;
  firebase: FirebaseConfig;
}

// =============================================================================
// DEFAULTS
// =============================================================================

// Keep docs/NETWORK_CONFIGURATION.md in sync with these server-side defaults.
const STELLAR_DEFAULTS = {
  testnet: {
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: expectedNetworkPassphrase("testnet"),
    usdcContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    nativeAssetContractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  },
  mainnet: {
    rpcUrl: "https://soroban-rpc.mainnet.stellar.gateway.fm",
    networkPassphrase: expectedNetworkPassphrase("mainnet"),
    usdcContractId: "", // Must be configured for mainnet
    nativeAssetContractId: "", // Must be configured for mainnet
  },
};

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

type ValidationError = {
  field: string;
  message: string;
};

const REQUIRED_ENV = {
  checkoutContractId: {
    name: "NEXT_PUBLIC_CHECKOUT_CONTRACT_ID",
    context: "Stellar payments",
  },
  emailJsServiceId: {
    name: "NEXT_PUBLIC_EMAILJS_SERVICE_ID",
    context: "email notifications",
  },
  emailJsTemplateId: {
    name: "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID",
    context: "email notifications",
  },
  emailJsPublicKey: {
    name: "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY",
    context: "email notifications",
  },
  firebaseApiKey: {
    name: "NEXT_PUBLIC_FIREBASE_API_KEY",
    context: "Firebase authentication",
  },
  firebaseAuthDomain: {
    name: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    context: "Firebase authentication",
  },
  firebaseProjectId: {
    name: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    context: "Firebase database",
  },
  firebaseStorageBucket: {
    name: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    context: "Firebase storage",
  },
  firebaseAppId: {
    name: "NEXT_PUBLIC_FIREBASE_APP_ID",
    context: "Firebase app",
  },
} as const;

/**
 * Validates that a required environment variable is set.
 */
function requireEnv(
  requirement: (typeof REQUIRED_ENV)[keyof typeof REQUIRED_ENV],
  errors: ValidationError[]
): string {
  const { name, context } = requirement;
  const value = process.env[name];
  if (!value || value.trim() === "") {
    errors.push({
      field: name,
      message: `${name} is required for ${context}`,
    });
    return "";
  }
  return value.trim();
}

/**
 * Gets an optional environment variable with a default value.
 */
function getEnv(name: string, defaultValue: string = ""): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : defaultValue;
}

// =============================================================================
// CONFIGURATION LOADERS
// =============================================================================

/**
 * Loads and validates Stellar configuration.
 */
export function loadStellarConfig(errors: ValidationError[] = []): StellarConfig {
  const configuredNetwork = getEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
  let network: StellarNetwork;
  if (isStellarNetwork(configuredNetwork)) {
    network = configuredNetwork;
  } else {
    errors.push({
      field: "NEXT_PUBLIC_STELLAR_NETWORK",
      message: "must be either testnet or mainnet",
    });
    network = "testnet";
  }
  const defaults = STELLAR_DEFAULTS[network];

  const configuredPassphrase = getEnv("NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE");
  const expectedPassphrase = expectedNetworkPassphrase(network);
  if (configuredPassphrase && configuredPassphrase !== expectedPassphrase) {
    errors.push({
      field: "NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE",
      message: `must match the configured ${network} network`,
    });
  }

  const checkoutContractId = requireEnv(REQUIRED_ENV.checkoutContractId, errors);

  return {
    network,
    rpcUrl: getEnv("NEXT_PUBLIC_STELLAR_RPC_URL", defaults.rpcUrl),
    networkPassphrase:
      configuredPassphrase === expectedPassphrase
        ? configuredPassphrase
        : defaults.networkPassphrase,
    checkoutContractId,
    usdcContractId: getEnv("NEXT_PUBLIC_USDC_CONTRACT_ID", defaults.usdcContractId),
    nativeAssetContractId: getEnv(
      "NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID",
      defaults.nativeAssetContractId
    ),
  };
}

/**
 * Loads and validates EmailJS configuration.
 */
export function loadEmailJSConfig(errors: ValidationError[] = []): EmailJSConfig {
  return {
    serviceId: requireEnv(REQUIRED_ENV.emailJsServiceId, errors),
    templateId: requireEnv(REQUIRED_ENV.emailJsTemplateId, errors),
    publicKey: requireEnv(REQUIRED_ENV.emailJsPublicKey, errors),
    defaultRecipientEmail: getEnv("NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL"),
  };
}

/**
 * Loads and validates Firebase configuration.
 */
export function loadFirebaseConfig(errors: ValidationError[] = []): FirebaseConfig {
  return {
    apiKey: requireEnv(REQUIRED_ENV.firebaseApiKey, errors),
    authDomain: requireEnv(REQUIRED_ENV.firebaseAuthDomain, errors),
    projectId: requireEnv(REQUIRED_ENV.firebaseProjectId, errors),
    storageBucket: requireEnv(REQUIRED_ENV.firebaseStorageBucket, errors),
    messagingSenderId: getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: requireEnv(REQUIRED_ENV.firebaseAppId, errors),
    measurementId: getEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
  };
}

// =============================================================================
// MAIN VALIDATION
// =============================================================================

/**
 * Validates all required environment variables and returns the configuration.
 * Throws an error with details about missing configuration.
 */
export function validateEnv(): EnvConfig {
  const errors: ValidationError[] = [];

  const stellar = loadStellarConfig(errors);
  const emailjs = loadEmailJSConfig(errors);
  const firebase = loadFirebaseConfig(errors);

  if (errors.length > 0) {
    const errorList = errors.map((e) => `  - ${e.field}: ${e.message}`).join("\n");
    console.error(
      `\n⚠️  Environment Configuration Errors:\n${errorList}\n\n` +
        `Please copy .env.local.example to .env.local and fill in the required values.\n`
    );
  }

  return { stellar, emailjs, firebase };
}

export type EnvironmentDiagnostics = {
  stellarNetwork: "testnet" | "mainnet" | "unknown";
  requiredVariables: { name: string; configured: boolean }[];
};

/**
 * Returns safe environment metadata for the development-only diagnostics page.
 * Environment values are deliberately never included in the result.
 */
export function getEnvironmentDiagnostics(): EnvironmentDiagnostics {
  const configuredNetwork = getEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");
  const stellarNetwork =
    configuredNetwork === "testnet" || configuredNetwork === "mainnet"
      ? configuredNetwork
      : "unknown";

  return {
    stellarNetwork,
    requiredVariables: Object.values(REQUIRED_ENV).map(({ name }) => ({
      name,
      configured: Boolean(process.env[name]?.trim()),
    })),
  };
}

/**
 * Helper to check if we're in development mode.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Helper to check if we're in production mode.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

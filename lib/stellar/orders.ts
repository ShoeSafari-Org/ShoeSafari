/**
 * Order Management Library
 *
 * Functions for reading and managing orders via the Soroban checkout contract.
 * Used by the admin dashboard for order dispatch and refund operations.
 */

import {
  Account,
  TransactionBuilder,
  Contract,
  rpc,
  xdr,
  StrKey,
} from "@stellar/stellar-sdk";

import {
  CHECKOUT_CONTRACT_ID,
  RPC_URL,
  NETWORK_PASSPHRASE,
  TX_TIMEOUT_SECONDS,
  TX_POLL_INTERVAL_MS,
  FEE_BUFFER_STROOPS,
  tokenForContract,
  formatTokenAmount,
} from "./config";
import { connectWallet, signWithFreighter } from "./freighter";
import { hashOrderId, bytesToHex } from "./scval";
import { logClientError } from "../safeLogging";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderStatus = "Pending" | "Paid" | "Shipped" | "Refunded" | "Unknown";

export interface OrderDetails {
  orderId: string;
  orderIdHash: string;
  buyer: string;
  amount: bigint;
  amountDisplay: string;
  token: string;
  tokenSymbol: string;
  timestamp: number;
  status: OrderStatus;
  ledger?: number;
  txHash?: string;
}

export interface OrderActionResult {
  success: boolean;
  txHash?: string;
  ledger?: number;
  error?: string;
}

/**
 * Distinct failure modes for a read-only order lookup.
 *
 * `RPC_ERROR`         - the Soroban RPC could not be reached (network/transport).
 * `SIMULATION_FAILED` - the RPC responded but the simulation returned an error
 *                       (e.g. host error, malformed arguments, bad contract id).
 * `DECODE_FAILED`     - the simulation succeeded but the return value could not
 *                       be decoded into an `Order`.
 */
export type OrderReadErrorCode = "RPC_ERROR" | "SIMULATION_FAILED" | "DECODE_FAILED";

/**
 * Typed error for read-only order lookups. Lets callers tell a transport/RPC
 * failure apart from an order that simply does not exist (which is NOT an
 * error — see the `not-found` result below).
 */
export class OrderReadError extends Error {
  readonly code: OrderReadErrorCode;
  /** Underlying failure detail for diagnostics; never render raw to shoppers. */
  readonly detail?: unknown;

  constructor(code: OrderReadErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = "OrderReadError";
    this.code = code;
    this.detail = detail;
  }
}

/**
 * Discriminated result of {@link readOrder}. A missing order is a first-class
 * outcome (`not-found`) distinct from an RPC/simulation failure (`error`).
 */
export type ReadOrderResult =
  | { kind: "found"; order: OrderDetails }
  | { kind: "not-found" }
  | { kind: "error"; error: OrderReadError };

/**
 * Public reads simulate against a throwaway, unfunded source account. The
 * all-zero Ed25519 account id is valid for simulation (which neither signs nor
 * submits), so reads never require a connected wallet, friendbot funding, or a
 * random funded-account lookup.
 */
export const READ_ONLY_SOURCE_ACCOUNT =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

// ---------------------------------------------------------------------------
// Status Conversion
// ---------------------------------------------------------------------------

function decodeStatus(statusVal: xdr.ScVal): OrderStatus {
  if (statusVal.switch() === xdr.ScValType.scvVec()) {
    const vec = statusVal.vec();
    if (vec && vec.length > 0) {
      const first = vec[0];
      if (first.switch() === xdr.ScValType.scvSymbol()) {
        const sym = first.sym().toString();
        if (["Pending", "Paid", "Shipped", "Refunded"].includes(sym)) {
          return sym as OrderStatus;
        }
      }
    }
  }
  return "Unknown";
}

// ---------------------------------------------------------------------------
// Read Order from Contract
// ---------------------------------------------------------------------------

/**
 * Decode the `order` contract function's return value (`Option<Order>`) into an
 * {@link OrderDetails}.
 *
 * Returns `null` when the order is absent. The contract returns `None` as
 * `ScVal::Void`; a present order (`Some(Order)`) is the struct itself, encoded
 * as an `ScVal::Map`. A legacy `Vec([Order])` wrapping is also tolerated.
 * Malformed values throw so they cannot be mistaken for a missing order.
 */
function decodeOrder(
  retval: xdr.ScVal,
  orderId: string,
  orderIdHash: string
): OrderDetails | null {
  // None -> order does not exist.
  if (retval.switch() === xdr.ScValType.scvVoid()) {
    return null;
  }

  // Unwrap a legacy Vec([Order]) wrapper into the inner struct map.
  let orderVal = retval;
  if (orderVal.switch() === xdr.ScValType.scvVec()) {
    const vec = orderVal.vec();
    if (!vec || vec.length === 0) return null; // explicit empty option -> absent
    orderVal = vec[0];
  }

  if (orderVal.switch() !== xdr.ScValType.scvMap()) {
    throw new Error("Expected an order map from the contract");
  }
  const orderMap = orderVal.map();
  if (!orderMap) throw new Error("Order response did not contain a map");

  const order: Partial<OrderDetails> = { orderId, orderIdHash };

  for (const entry of orderMap) {
    const key =
      entry.key().switch() === xdr.ScValType.scvSymbol() ? entry.key().sym().toString() : "";
    const val = entry.val();

    switch (key) {
      case "buyer":
        if (val.switch() === xdr.ScValType.scvAddress()) {
          order.buyer = StrKey.encodeEd25519PublicKey(val.address().accountId().ed25519());
        }
        break;
      case "amount":
        if (val.switch() === xdr.ScValType.scvI128()) {
          const parts = val.i128();
          order.amount =
            (BigInt(parts.hi().toString()) << BigInt(64)) | BigInt(parts.lo().toString());
        }
        break;
      case "token":
        if (val.switch() === xdr.ScValType.scvAddress()) {
          order.token = StrKey.encodeContract(
            Buffer.from(val.address().contractId() as unknown as Uint8Array)
          );
        }
        break;
      case "timestamp":
        if (val.switch() === xdr.ScValType.scvU64()) {
          order.timestamp = Number(val.u64().toString());
        }
        break;
      case "status":
        order.status = decodeStatus(val);
        break;
    }
  }

  if (
    !order.buyer ||
    order.amount === undefined ||
    !order.token ||
    order.timestamp === undefined ||
    !order.status
  ) {
    throw new Error("Order response omitted a required field");
  }

  // Format display amount.
  const tokenConfig = order.token ? tokenForContract(order.token.toUpperCase()) : undefined;
  order.tokenSymbol = tokenConfig?.symbol ?? "TOKEN";
  order.amountDisplay = order.amount ? formatTokenAmount(order.amount, order.token) : "0";

  return order as OrderDetails;
}

/**
 * Reads an order's details from the checkout contract.
 *
 * This is a read-only, public query: it builds the `order` invocation and runs
 * it through the Soroban RPC simulation path with a throwaway unfunded source
 * account. It never connects a wallet, calls friendbot, or looks up a random
 * funded account, so reads work regardless of wallet or funding state.
 *
 * The result is a discriminated union so callers can distinguish:
 *   - `found`     - the order exists and decoded successfully.
 *   - `not-found` - the contract has no such order (NOT an error).
 *   - `error`     - an RPC/transport failure or a simulation/decode failure
 *                   ({@link OrderReadError} carries a specific `code`).
 */
export async function readOrder(orderId: string): Promise<ReadOrderResult> {
  const server = new rpc.Server(RPC_URL);
  const contract = new Contract(CHECKOUT_CONTRACT_ID);

  const orderIdHashBytes = await hashOrderId(orderId);
  const orderIdHash = bytesToHex(orderIdHashBytes);

  // Throwaway, unfunded source: simulation neither signs nor submits, so no
  // on-chain account lookup or funding is required.
  const source = new Account(READ_ONLY_SOURCE_ACCOUNT, "0");
  const tx = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("order", xdr.ScVal.scvBytes(Buffer.from(orderIdHashBytes))))
    .setTimeout(30)
    .build();

  let simResult: Awaited<ReturnType<typeof server.simulateTransaction>>;
  try {
    simResult = await server.simulateTransaction(tx);
  } catch (err) {
    logClientError("RPC error reading order", err);
    return {
      kind: "error",
      error: new OrderReadError("RPC_ERROR", "Could not reach the Soroban RPC", err),
    };
  }

  if (rpc.Api.isSimulationError(simResult)) {
    logClientError("Simulation error reading order", simResult.error);
    return {
      kind: "error",
      error: new OrderReadError(
        "SIMULATION_FAILED",
        "Order simulation failed",
        simResult.error
      ),
    };
  }

  if (!rpc.Api.isSimulationSuccess(simResult) || !simResult.result) {
    return {
      kind: "error",
      error: new OrderReadError("SIMULATION_FAILED", "Order simulation did not succeed"),
    };
  }

  try {
    const order = decodeOrder(simResult.result.retval, orderId, orderIdHash);
    if (!order) {
      return { kind: "not-found" };
    }
    return { kind: "found", order };
  } catch (err) {
    logClientError("Could not decode order response", err);
    return {
      kind: "error",
      error: new OrderReadError("DECODE_FAILED", "Order response could not be decoded", err),
    };
  }
}

// ---------------------------------------------------------------------------
// Dispatch Order (Release Escrow to Merchant)
// ---------------------------------------------------------------------------

/**
 * Dispatches an order, releasing the escrowed funds to the merchant.
 * Requires the connected wallet to be the merchant.
 */
export async function dispatchOrder(orderId: string): Promise<OrderActionResult> {
  try {
    const publicKey = await connectWallet();
    const server = new rpc.Server(RPC_URL);
    const contract = new Contract(CHECKOUT_CONTRACT_ID);

    const orderIdHashBytes = await hashOrderId(orderId);

    const account = await server.getAccount(publicKey);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("dispatch", xdr.ScVal.scvBytes(Buffer.from(orderIdHashBytes))))
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    // Simulate to get resource fees
    const simResult = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(simResult)) {
      return {
        success: false,
        error: `Simulation failed: ${simResult.error}`,
      };
    }

    if (!rpc.Api.isSimulationSuccess(simResult)) {
      return {
        success: false,
        error: "Simulation did not succeed",
      };
    }

    // Prepare transaction with simulation results
    const preparedTx = rpc.assembleTransaction(tx, simResult).build();

    // Sign with Freighter
    const signedXdr = await signWithFreighter(preparedTx.toXDR(), publicKey);
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    // Submit
    const sendResult = await server.sendTransaction(signedTx);

    if (sendResult.status === "ERROR") {
      return {
        success: false,
        error: `Send failed: ${sendResult.errorResult?.toXDR("base64")}`,
      };
    }

    // Poll for result
    const txHash = sendResult.hash;
    const result = await pollTransaction(server, txHash);

    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Refund Order (Return Escrow to Buyer)
// ---------------------------------------------------------------------------

/**
 * Refunds an order, returning the escrowed funds to the buyer.
 * Requires the connected wallet to be the merchant.
 */
export async function refundOrder(orderId: string): Promise<OrderActionResult> {
  try {
    const publicKey = await connectWallet();
    const server = new rpc.Server(RPC_URL);
    const contract = new Contract(CHECKOUT_CONTRACT_ID);

    const orderIdHashBytes = await hashOrderId(orderId);

    const account = await server.getAccount(publicKey);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("refund", xdr.ScVal.scvBytes(Buffer.from(orderIdHashBytes))))
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    // Simulate
    const simResult = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(simResult)) {
      return {
        success: false,
        error: `Simulation failed: ${simResult.error}`,
      };
    }

    if (!rpc.Api.isSimulationSuccess(simResult)) {
      return {
        success: false,
        error: "Simulation did not succeed",
      };
    }

    // Prepare and sign
    const preparedTx = rpc.assembleTransaction(tx, simResult).build();
    const signedXdr = await signWithFreighter(preparedTx.toXDR(), publicKey);
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    // Submit
    const sendResult = await server.sendTransaction(signedTx);

    if (sendResult.status === "ERROR") {
      return {
        success: false,
        error: `Send failed: ${sendResult.errorResult?.toXDR("base64")}`,
      };
    }

    // Poll for result
    const txHash = sendResult.hash;
    const result = await pollTransaction(server, txHash);

    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Transaction Polling
// ---------------------------------------------------------------------------

async function pollTransaction(server: rpc.Server, txHash: string): Promise<OrderActionResult> {
  const startTime = Date.now();
  const timeoutMs = TX_TIMEOUT_SECONDS * 1000;

  while (Date.now() - startTime < timeoutMs) {
    const getResult = await server.getTransaction(txHash);

    if (getResult.status === "SUCCESS") {
      return {
        success: true,
        txHash,
        ledger: getResult.ledger,
      };
    }

    if (getResult.status === "FAILED") {
      return {
        success: false,
        txHash,
        error: "Transaction failed on-chain",
      };
    }

    // NOT_FOUND - still pending
    await new Promise((resolve) => setTimeout(resolve, TX_POLL_INTERVAL_MS));
  }

  return {
    success: false,
    txHash,
    error: "Transaction timed out",
  };
}

// ---------------------------------------------------------------------------
// Export Order Interface for UI
// ---------------------------------------------------------------------------

export interface OrderEvent {
  orderId: string;
  buyer: string;
  amount: string;
  amountRaw: bigint;
  token: string;
  tokenSymbol: string;
  status: OrderStatus;
  timestamp: number;
  ledger: number;
  txHash: string;
  commerce?: {
    documentId: string;
    customer?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      address?: string | {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        region?: string;
        postalCode?: string;
        country?: string;
      };
    };
    items?: Array<{ name?: string; price?: number }>;
    userId?: string | null;
    buyerWallet?: string | null;
    status?: string;
    completedAt?: { toMillis?: () => number } | null;
    updatedAt?: { toMillis?: () => number } | null;
    personalDataAnonymizedAt?: unknown;
  };
}

/**
 * Converts an indexed event to an OrderEvent for display.
 */
export function eventToOrder(
  event: {
    fields: Record<string, string>;
    symbol: string;
    ledger: number;
    txHash: string;
  }
): OrderEvent | null {
  const { fields, symbol, ledger, txHash } = event;

  // Determine status from event type
  let status: OrderStatus;
  switch (symbol) {
    case "pay":
      status = "Paid";
      break;
    case "create_order":
      status = "Pending";
      break;
    case "dispatch":
      status = "Shipped";
      break;
    case "refund":
      status = "Refunded";
      break;
    default:
      return null;
  }

  // The indexer adds canonical fields only after validating each event's XDR
  // layout. Keep these checks here so malformed callers cannot create rows.
  const orderId = fields.order_id || "";
  const buyer = fields.buyer || fields.merchant || "";
  const amountStr = fields.amount || "";
  const transactionHashIsValid = /^[a-f0-9]{64}$/i.test(txHash);
  const ledgerIsValid = Number.isSafeInteger(ledger) && ledger > 0;
  const tokenIsValid =
    (symbol !== "pay" && symbol !== "create_order") || Boolean(fields.token);
  if (
    !/^[a-f0-9]{64}$/i.test(orderId) ||
    !/^\d+$/.test(amountStr) ||
    BigInt(amountStr) <= 0n ||
    !transactionHashIsValid ||
    !ledgerIsValid ||
    !tokenIsValid ||
    ((symbol === "pay" || symbol === "create_order" || symbol === "refund") &&
      !buyer)
  ) return null;

  const token = fields.token || "";

  // Try to get token config
  const tokenConfig = tokenForContract(token);
  const tokenSymbol = tokenConfig?.symbol ?? "Unknown token";

  // Parse amount
  const amountRaw = BigInt(amountStr);

  const amountDisplay = formatTokenAmount(amountRaw, token);

  // Parse timestamp
  let timestamp = Date.now();
  if (fields.timestamp) {
    const parsedTimestamp = Number(fields.timestamp);
    if (Number.isSafeInteger(parsedTimestamp) && parsedTimestamp > 0) {
      timestamp = parsedTimestamp * 1000;
    }
  }

  return {
    orderId,
    buyer,
    amount: amountDisplay,
    amountRaw,
    token,
    tokenSymbol,
    status,
    timestamp,
    ledger,
    txHash,
  };
}

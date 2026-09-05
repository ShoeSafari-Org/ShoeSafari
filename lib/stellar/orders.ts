/**
 * Order Management Library
 *
 * Functions for reading and managing orders via the Soroban checkout contract.
 * Used by the admin dashboard for order dispatch and refund operations.
 */

import {
  TransactionBuilder,
  Operation,
  Contract,
  rpc,
  xdr,
  Keypair,
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
} from "./config";
import { connectWallet, signWithFreighter } from "./freighter";
import { hashOrderId, bytesToHex } from "./scval";

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
 * Reads an order's details from the contract.
 */
export async function readOrder(orderId: string): Promise<OrderDetails | null> {
  const server = new rpc.Server(RPC_URL);
  const contract = new Contract(CHECKOUT_CONTRACT_ID);

  const orderIdHashBytes = await hashOrderId(orderId);
  const orderIdHash = bytesToHex(orderIdHashBytes);

  const account = await server.getAccount(
    Keypair.random().publicKey() // dummy source for simulation
  ).catch(() => null);

  if (!account) {
    // Fallback: just simulate without account
    const tx = new TransactionBuilder(
      new (await import("@stellar/stellar-sdk")).Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "0"
      ),
      {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    )
      .addOperation(
        contract.call(
          "order",
          xdr.ScVal.scvBytes(Buffer.from(orderIdHash, "hex"))
        )
      )
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(simResult)) {
      console.error("Simulation error reading order:", simResult.error);
      return null;
    }

    if (!rpc.Api.isSimulationSuccess(simResult) || !simResult.result) {
      return null;
    }

    const retval = simResult.result.retval;
    if (retval.switch() === xdr.ScValType.scvVoid()) {
      return null; // Order doesn't exist
    }

    // Parse the Option<Order> - it's a vec with the order struct inside
    if (retval.switch() === xdr.ScValType.scvVec()) {
      const vec = retval.vec();
      if (!vec || vec.length === 0) return null;

      // The order is the first (and only) element
      const orderVal = vec[0];
      if (orderVal.switch() !== xdr.ScValType.scvMap()) return null;

      const orderMap = orderVal.map();
      if (!orderMap) return null;
      const order: Partial<OrderDetails> = {
        orderId,
        orderIdHash,
      };

      for (const entry of orderMap) {
        const key =
          entry.key().switch() === xdr.ScValType.scvSymbol()
            ? entry.key().sym().toString()
            : "";
        const val = entry.val();

        switch (key) {
          case "buyer":
            if (val.switch() === xdr.ScValType.scvAddress()) {
              order.buyer = StrKey.encodeEd25519PublicKey(
                val.address().accountId().ed25519()
              );
            }
            break;
          case "amount":
            if (val.switch() === xdr.ScValType.scvI128()) {
              const parts = val.i128();
              order.amount =
                (BigInt(parts.hi().toString()) << BigInt(64)) |
                BigInt(parts.lo().toString());
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

      // Format display amount
      const tokenConfig = order.token
        ? tokenForContract(order.token.toUpperCase())
        : undefined;
      const decimals = tokenConfig?.decimals ?? 7;
      order.tokenSymbol = tokenConfig?.symbol ?? "TOKEN";
      order.amountDisplay = order.amount
        ? (Number(order.amount) / Math.pow(10, decimals)).toFixed(2)
        : "0.00";

      return order as OrderDetails;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Dispatch Order (Release Escrow to Merchant)
// ---------------------------------------------------------------------------

/**
 * Dispatches an order, releasing the escrowed funds to the merchant.
 * Requires the connected wallet to be the merchant.
 */
export async function dispatchOrder(
  orderId: string
): Promise<OrderActionResult> {
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
      .addOperation(
        contract.call(
          "dispatch",
          xdr.ScVal.scvBytes(Buffer.from(orderIdHashBytes))
        )
      )
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
    const signedTx = TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    );

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
      .addOperation(
        contract.call(
          "refund",
          xdr.ScVal.scvBytes(Buffer.from(orderIdHashBytes))
        )
      )
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
    const signedTx = TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    );

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

async function pollTransaction(
  server: rpc.Server,
  txHash: string
): Promise<OrderActionResult> {
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
    customer?: { firstName?: string; lastName?: string; email?: string; address?: string };
    items?: Array<{ name?: string; price?: number }>;
    userId?: string | null;
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
  },
  existingStatus?: OrderStatus
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
      status = existingStatus ?? "Unknown";
  }

  // Extract fields
  const orderId = fields.order_id || fields.topic1 || "";
  const buyer = fields.buyer || fields.topic2 || "";
  const amountStr = fields.amount || "0";
  const token = fields.token || "";

  // Try to get token config
  const tokenConfig = tokenForContract(token);
  const decimals = tokenConfig?.decimals ?? 7;
  const tokenSymbol = tokenConfig?.symbol ?? "TOKEN";

  // Parse amount
  let amountRaw = BigInt(0);
  try {
    amountRaw = BigInt(amountStr);
  } catch {
    // Keep as 0
  }

  const amountDisplay = (Number(amountRaw) / Math.pow(10, decimals)).toFixed(2);

  // Parse timestamp
  let timestamp = Date.now();
  if (fields.timestamp) {
    try {
      timestamp = parseInt(fields.timestamp) * 1000;
    } catch {
      // Keep current time
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

import { rpc, StrKey, xdr } from "@stellar/stellar-sdk";

import { RPC_URL, TX_TIMEOUT_SECONDS, TX_POLL_INTERVAL_MS } from "./config";
import { bytesToHex, scValToString } from "./scval";

// ---------------------------------------------------------------------------
// Payment event decoding.
//
// The checkout contract emits (via #[contractevent]):
//   topics: [Symbol("pay"), token, buyer, merchant, order_id]
//   data:   { amount: i128 }
// ---------------------------------------------------------------------------

export interface PaymentReceipt {
  contractId?: string;
  token?: string;
  buyer?: string;
  merchant?: string;
  orderId?: string; // hex
  amount?: string; // raw token units as decimal string
  txHash: string;
  ledger: number;
}

/**
 * Decode the checkout contract's order events using their event-specific
 * topic and data layouts. Invalid or incomplete events are ignored before
 * they can become order rows or status transitions.
 */
export function decodeOrderContractEventFields(
  symbol: string,
  topics: xdr.ScVal[],
  data: xdr.ScVal
): Record<string, string> | null {
  const dataFields = decodeEventDataMap(data);
  if (!dataFields) return null;

  const amount = positiveI128(dataFields.amount);
  if (!amount) return null;

  switch (symbol) {
    case "pay": {
      if (
        topics.length !== 5 ||
        !isAddress(topics[1]) ||
        !isAccountAddress(topics[2]) ||
        !isAccountAddress(topics[3]) ||
        !isOrderId(topics[4])
      ) return null;
      return {
        token: scValToString(topics[1]),
        buyer: scValToString(topics[2]),
        merchant: scValToString(topics[3]),
        order_id: scValToString(topics[4]),
        amount,
      };
    }
    case "create_order": {
      if (
        topics.length !== 4 ||
        !isAddress(topics[1]) ||
        !isAccountAddress(topics[2]) ||
        !isOrderId(topics[3])
      ) return null;
      const timestamp = unsignedU64(dataFields.timestamp);
      if (!timestamp) return null;
      return {
        token: scValToString(topics[1]),
        buyer: scValToString(topics[2]),
        order_id: scValToString(topics[3]),
        amount,
        timestamp,
      };
    }
    case "dispatch": {
      if (
        topics.length !== 3 ||
        !isOrderId(topics[1]) ||
        !isAccountAddress(topics[2])
      ) return null;
      return {
        order_id: scValToString(topics[1]),
        merchant: scValToString(topics[2]),
        amount,
      };
    }
    case "refund": {
      if (
        topics.length !== 3 ||
        !isOrderId(topics[1]) ||
        !isAccountAddress(topics[2])
      ) return null;
      return {
        order_id: scValToString(topics[1]),
        buyer: scValToString(topics[2]),
        amount,
      };
    }
    default:
      return null;
  }
}

function decodeEventDataMap(data: xdr.ScVal): Record<string, xdr.ScVal> | null {
  if (data.switch() !== xdr.ScValType.scvMap()) return null;
  const fields: Record<string, xdr.ScVal> = {};
  for (const entry of data.map() ?? []) {
    if (entry.key().switch() !== xdr.ScValType.scvSymbol()) return null;
    const key = entry.key().sym().toString();
    if (fields[key]) return null;
    fields[key] = entry.val();
  }
  return fields;
}

function positiveI128(value: xdr.ScVal | undefined): string | null {
  if (!value || value.switch() !== xdr.ScValType.scvI128()) return null;
  const amount = scValToString(value);
  return /^\d+$/.test(amount) && BigInt(amount) > 0n ? amount : null;
}

function unsignedU64(value: xdr.ScVal | undefined): string | null {
  if (!value || value.switch() !== xdr.ScValType.scvU64()) return null;
  const timestamp = scValToString(value);
  return /^\d+$/.test(timestamp) &&
    BigInt(timestamp) > 0n &&
    BigInt(timestamp) <= BigInt(Number.MAX_SAFE_INTEGER)
    ? timestamp
    : null;
}

function isAddress(value: xdr.ScVal | undefined): value is xdr.ScVal {
  return Boolean(value && value.switch() === xdr.ScValType.scvAddress());
}

function isAccountAddress(value: xdr.ScVal | undefined): value is xdr.ScVal {
  if (!isAddress(value)) return false;
  try {
    return value.address().accountId() !== undefined;
  } catch {
    return false;
  }
}

function isOrderId(value: xdr.ScVal | undefined): value is xdr.ScVal {
  return Boolean(
    value &&
      value.switch() === xdr.ScValType.scvBytes() &&
      value.bytes().length === 32
  );
}

/**
 * Poll `getTransaction` until the tx reaches a final state.
 * Resolves with the successful transaction; throws on FAILED.
 */
export async function waitForTransaction(
  hash: string
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const server = new rpc.Server(RPC_URL);
  const deadline = Date.now() + TX_TIMEOUT_SECONDS * 1000;
  let last: rpc.Api.GetTransactionResponse | null = null;

  while (Date.now() < deadline) {
    last = await server.getTransaction(hash);
    if (last.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return last;
    }
    if (last.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(
        `Transaction failed on ledger ${last.ledger} (hash: ${hash}). ` +
          "See StellarExpert for details."
      );
    }
    await sleep(TX_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Transaction did not reach a final state within ${TX_TIMEOUT_SECONDS}s ` +
      `(hash: ${hash}). Check its status on StellarExpert.`
  );
}

/** Check a submitted transaction once so the buyer can explicitly resume later. */
export async function checkTransactionStatus(hash: string) {
  const server = new rpc.Server(RPC_URL);
  const result = await server.getTransaction(hash);

  if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return {
      status: "SUCCESS" as const,
      transaction: result,
      receipt: decodePaymentEvent(result),
    };
  }
  if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
    return { status: "FAILED" as const, transaction: result };
  }
  return { status: result.status, transaction: result };
}

/**
 * Find the `PaymentReceived` event emitted by the checkout contract inside a
 * successful transaction's contract events.
 */
export function decodePaymentEvent(
  tx: rpc.Api.GetSuccessfulTransactionResponse
): PaymentReceipt | null {
  const contractEvents: xdr.ContractEvent[] = tx.events?.contractEventsXdr?.flat() ?? [];
  for (const event of contractEvents) {
    let v0: xdr.ContractEventV0;
    try {
      v0 = event.body().v0();
    } catch {
      continue;
    }
    const topics = v0.topics();
    if (!topics || topics.length < 1) continue;
    const first = topics[0];
    if (first.switch() !== xdr.ScValType.scvSymbol()) continue;
    if (first.sym().toString() !== "pay") continue;

    const data = v0.data();
    const receipt: PaymentReceipt = {
      txHash: tx.txHash,
      ledger: tx.ledger,
    };
    try {
      if (event.contractId()) {
        receipt.contractId = StrKey.encodeContract(
          Buffer.from(event.contractId() as unknown as Uint8Array)
        );
      }
    } catch {
      // system events have no contract id
    }
    // topics[1..] = [token, buyer, merchant, order_id]
    for (let i = 1; i < topics.length; i++) {
      const str = scValToString(topics[i]);
      switch (i) {
        case 1:
          receipt.token = str;
          break;
        case 2:
          receipt.buyer = str;
          break;
        case 3:
          receipt.merchant = str;
          break;
        case 4:
          receipt.orderId = str;
          break;
      }
    }
    // data = Map { "amount": i128 }
    if (data.switch() === xdr.ScValType.scvMap()) {
      const entries = data.map();
      for (const entry of entries ?? []) {
        if (entry.key().switch() === xdr.ScValType.scvSymbol()) {
          const key = entry.key().sym().toString();
          if (key === "amount") {
            receipt.amount = scValToString(entry.val());
          }
        }
      }
    } else {
      receipt.amount = scValToString(data);
    }
    return receipt;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { bytesToHex };

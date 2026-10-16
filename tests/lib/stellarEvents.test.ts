import { describe, expect, it } from "vitest";
import { xdr } from "@stellar/stellar-sdk";
import { bytes32ToScVal, i128ToScVal, symbolToScVal, addressToScVal } from "../../lib/stellar/scval";
import { PaymentEventIndexer } from "../../lib/stellar/indexer";
import { eventToOrder } from "../../lib/stellar/orders";

const account = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const orderId = bytes32ToScVal(new Uint8Array(32).fill(1));
const address = addressToScVal(account);

function eventData(fields: Record<string, xdr.ScVal>) {
  return xdr.ScVal.scvMap(
    Object.entries(fields).map(
      ([key, val]) => new xdr.ScMapEntry({ key: symbolToScVal(key), val })
    )
  );
}

const amount = i128ToScVal(25_000);
const timestamp = xdr.ScVal.scvU64(new xdr.Uint64(1_750_000_000n));

const eventCases = [
  {
    symbol: "pay",
    topics: [symbolToScVal("pay"), address, address, address, orderId],
    data: eventData({ amount }),
    invalidTopics: [symbolToScVal("pay"), address, address, address],
    invalidData: eventData({ amount: xdr.ScVal.scvString("25000") }),
  },
  {
    symbol: "create_order",
    topics: [symbolToScVal("create_order"), address, address, orderId],
    data: eventData({ amount, timestamp }),
    invalidTopics: [symbolToScVal("create_order"), address, address],
    invalidData: eventData({ amount, timestamp: xdr.ScVal.scvString("1750000000") }),
  },
  {
    symbol: "dispatch",
    topics: [symbolToScVal("dispatch"), orderId, address],
    data: eventData({ amount }),
    invalidTopics: [symbolToScVal("dispatch"), orderId],
    invalidData: eventData({ amount: xdr.ScVal.scvString("25000") }),
  },
  {
    symbol: "refund",
    topics: [symbolToScVal("refund"), orderId, address],
    data: eventData({ amount }),
    invalidTopics: [symbolToScVal("refund"), orderId],
    invalidData: eventData({ amount: xdr.ScVal.scvString("25000") }),
  },
];

describe("checkout order event decoding", () => {
  it.each(eventCases)("decodes valid $symbol events and preserves metadata", (testCase) => {
    const indexer = new PaymentEventIndexer({ rpcUrl: "https://example.test" });
    const raw = {
      id: `${testCase.symbol}-event`,
      ledger: 123,
      ledgerClosedAt: "2026-01-01T00:00:00Z",
      txHash: "a".repeat(64),
      contractId: account,
      topic: testCase.topics,
      value: testCase.data,
    } as never;
    const decoded = (indexer as any).decodeEvent(raw);

    expect(decoded).toMatchObject({
      symbol: testCase.symbol,
      ledger: 123,
      txHash: "a".repeat(64),
      contractId: account,
      fields: { order_id: "01".repeat(32), amount: "25000" },
    });
    expect(eventToOrder(decoded)).toMatchObject({
      orderId: "01".repeat(32),
      amountRaw: 25_000n,
      ledger: 123,
      txHash: "a".repeat(64),
    });
  });

  it.each(eventCases)("ignores malformed $symbol events", (testCase) => {
    const indexer = new PaymentEventIndexer({ rpcUrl: "https://example.test" });
    const decode = (indexer as any).decodeEvent;
    const raw = {
      id: `${testCase.symbol}-event`,
      ledger: 123,
      ledgerClosedAt: "2026-01-01T00:00:00Z",
      txHash: "a".repeat(64),
      contractId: account,
      topic: testCase.invalidTopics,
      value: testCase.data,
    };
    expect(decode.call(indexer, raw)).toBeNull();

    expect(decode.call(indexer, { ...raw, topic: testCase.topics, value: testCase.invalidData })).toBeNull();
  });

  it("rejects malformed transaction metadata before indexing", () => {
    const indexer = new PaymentEventIndexer({ rpcUrl: "https://example.test" });
    const decode = (indexer as any).decodeEvent;
    const valid = {
      id: "pay-event",
      ledger: 123,
      ledgerClosedAt: "2026-01-01T00:00:00Z",
      txHash: "a".repeat(64),
      contractId: account,
      topic: eventCases[0].topics,
      value: eventCases[0].data,
    };
    expect(decode.call(indexer, { ...valid, txHash: "bad" })).toBeNull();
    expect(decode.call(indexer, { ...valid, ledger: 0 })).toBeNull();
  });
});

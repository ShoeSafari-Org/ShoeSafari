import { describe, expect, it } from "vitest";
import { xdr } from "@stellar/stellar-sdk";
import fixtures from "../../../contracts/checkout/interface/scval-fixtures.json";
import {
  addressToScVal,
  bytes32ToScVal,
  i128ToScVal,
  symbolToScVal,
} from "../../../lib/stellar/scval";
import { decodeOrderContractEventFields } from "../../../lib/stellar/events";

const scVal = (hex: string) => xdr.ScVal.fromXDR(hex, "hex");

describe("cross-language ScVal fixtures", () => {
  it("keeps scalar constructors byte-for-byte compatible with Soroban XDR", () => {
    const values = fixtures.values;
    expect(addressToScVal(values.address.value).toXDR("hex")).toBe(values.address.xdr);
    expect(addressToScVal(values.tokenAddress.value).toXDR("hex")).toBe(values.tokenAddress.xdr);
    expect(bytes32ToScVal(values.bytes32.value).toXDR("hex")).toBe(values.bytes32.xdr);
    expect(i128ToScVal(values.i128.value).toXDR("hex")).toBe(values.i128.xdr);
    expect(i128ToScVal(values.i128Negative.value).toXDR("hex")).toBe(values.i128Negative.xdr);

    for (const value of Object.values(values)) {
      expect(scVal(value.xdr).toXDR("hex")).toBe(value.xdr);
    }
  });

  it("preserves option and map shapes when decoding the shared fixture", () => {
    const none = scVal(fixtures.values.optionNone.xdr);
    const some = scVal(fixtures.values.optionSomeAddress.xdr);
    const map = scVal(fixtures.values.map.xdr);

    expect(none.switch()).toBe(xdr.ScValType.scvVec());
    expect(none.vec()).toHaveLength(0);
    expect(some.vec()).toHaveLength(1);
    expect(some.vec()![0].toXDR("hex")).toBe(fixtures.values.address.xdr);
    expect(map.map()).toHaveLength(2);
    expect(map.map()![0].key().toXDR("hex")).toBe(symbolToScVal("threshold").toXDR("hex"));
  });

  it.each(Object.entries(fixtures.events))("decodes the %s event fixture", (_name, event) => {
    const topics = event.topics.map(scVal);
    const decoded = decodeOrderContractEventFields(
      topics[0].sym().toString(),
      topics,
      scVal(event.data)
    );

    expect(decoded).toMatchObject({
      token: fixtures.values.tokenAddress.value,
      buyer: fixtures.values.address.value,
      order_id: fixtures.values.bytes32.value,
      amount: fixtures.values.i128.value,
    });
  });
});

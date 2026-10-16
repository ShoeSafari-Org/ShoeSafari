import { formatStroopsAsXlm } from "../../lib/stellar/fees";

describe("formatStroopsAsXlm", () => {
  it("converts stroops to XLM using seven decimal places", () => {
    expect(formatStroopsAsXlm("500000")).toBe("0.05");
    expect(formatStroopsAsXlm(1n)).toBe("0.0000001");
    expect(formatStroopsAsXlm("10000000")).toBe("1");
  });

  it("returns unavailable for missing or invalid estimates", () => {
    expect(formatStroopsAsXlm(null)).toBeNull();
    expect(formatStroopsAsXlm(undefined)).toBeNull();
    expect(formatStroopsAsXlm("unknown")).toBeNull();
    expect(formatStroopsAsXlm("-1")).toBeNull();
  });
});

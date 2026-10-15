import {
  formatTokenAmount,
  tokenSymbolForContract,
  USDC_CONTRACT_ID,
  TESTNET_NATIVE_ASSET_CONTRACT_ID,
} from "../../lib/stellar/config";

describe("token display helpers", () => {
  it("resolves supported token contracts and labels unknown contracts safely", () => {
    expect(tokenSymbolForContract(USDC_CONTRACT_ID)).toBe("USDC");
    expect(tokenSymbolForContract(TESTNET_NATIVE_ASSET_CONTRACT_ID)).toBe("XLM");
    expect(tokenSymbolForContract("CUNKNOWN")).toBe("Unknown token");
    expect(tokenSymbolForContract()).toBe("Unknown token");
  });

  it("formats raw units with the decimals registered for the token", () => {
    expect(formatTokenAmount("123400000", USDC_CONTRACT_ID)).toBe("12.34");
    expect(formatTokenAmount("12345678", TESTNET_NATIVE_ASSET_CONTRACT_ID)).toBe("1.2345678");
  });
});

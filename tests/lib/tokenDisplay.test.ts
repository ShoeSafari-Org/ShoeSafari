import {
  formatTokenAmount,
  tokenSymbolForContract,
  USDC_CONTRACT_ID,
  TESTNET_NATIVE_ASSET_CONTRACT_ID,
  PAYMENT_ASSET_REGISTRY,
  paymentAssetsForCheckout,
  validatePaymentAssetRegistry,
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

  it("exposes complete checkout assets from both network fixtures", () => {
    const mainnetFixture = PAYMENT_ASSET_REGISTRY.mainnet.map((asset) => ({
      ...asset,
      contractId: asset.contractId || "C" + "A".repeat(55),
      assetIssuer: asset.assetIssuer || "G" + "A".repeat(55),
    }));
    expect(
      validatePaymentAssetRegistry({
        testnet: PAYMENT_ASSET_REGISTRY.testnet,
        mainnet: mainnetFixture,
      })
    ).toEqual([]);
    expect(paymentAssetsForCheckout("testnet").map((asset) => asset.assetId)).toEqual([
      "USDC",
      "XLM",
    ]);
    expect(paymentAssetsForCheckout("testnet").every((asset) => asset.features?.checkout)).toBe(
      true
    );
  });

  it("rejects incomplete registry entries", () => {
    const errors = validatePaymentAssetRegistry({
      testnet: [{ ...PAYMENT_ASSET_REGISTRY.testnet[0], display: undefined }],
      mainnet: [],
    });
    expect(errors).toContain("testnet[0].display rules are required");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  usdToRawUnits,
  orderIdHash,
  payWithStellar,
} from "@/lib/stellar/checkout";
import {
  connectWallet,
  ensureNetwork,
  signWithFreighter,
  freighterAvailable,
  WalletError,
} from "@/lib/stellar/freighter";
import { dispatchOrder, refundOrder } from "@/lib/stellar/orders";
import * as freighterApi from "@stellar/freighter-api";
import * as accountModule from "@/lib/stellar/account";
import * as simulateModule from "@/lib/stellar/simulate";
import * as eventsModule from "@/lib/stellar/events";
import { Account, Networks, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";

// Mock @stellar/freighter-api
vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  signTransaction: vi.fn(),
}));

describe("Stellar Payment Transaction Flow & Escrow Unit Tests", () => {
  const dummyPublicKey = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";

  // Build a real, valid Stellar transaction XDR for test decoding
  const dummyAccount = new Account(dummyPublicKey, "100");
  const validTx = new TransactionBuilder(dummyAccount, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .setTimeout(30)
    .build();
  const validTxXdr = validTx.toXDR();

  // Valid raw simulation fixture that matches stellar-sdk's parseRawSimulation expectations
  const mockValidSimResult = {
    latestLedger: 1000,
    minResourceFee: "100",
    transactionData: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    results: [
      {
        auth: [],
        xdr: xdr.ScVal.scvVoid().toXDR("base64"),
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Transaction building & utilities in checkout.ts
  // -------------------------------------------------------------------------
  describe("checkout.ts utilities", () => {
    it("converts USD amounts correctly to 7-decimal raw units", () => {
      expect(usdToRawUnits(10)).toBe(BigInt(100_000_000));
      expect(usdToRawUnits(12.34)).toBe(BigInt(123_400_000));
      expect(usdToRawUnits(0.0000001)).toBe(BigInt(1));
    });

    it("throws WalletError on invalid or non-positive USD amounts", () => {
      expect(() => usdToRawUnits(0)).toThrow(WalletError);
      expect(() => usdToRawUnits(-5)).toThrow("Invalid amount to pay.");
      expect(() => usdToRawUnits(NaN)).toThrow(WalletError);
      expect(() => usdToRawUnits(Infinity)).toThrow(WalletError);
    });

    it("hashes orderId deterministically to hex string", async () => {
      const hash1 = await orderIdHash("order-12345");
      const hash2 = await orderIdHash("order-12345");
      const hash3 = await orderIdHash("order-67890");

      expect(typeof hash1).toBe("string");
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1.length).toBe(64); // 32 bytes in hex
    });
  });

  // -------------------------------------------------------------------------
  // 2. Mock Freighter wallet interactions & freighter.ts
  // -------------------------------------------------------------------------
  describe("Freighter wallet interactions", () => {
    it("freighterAvailable returns true when extension responds connected", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true });
      const available = await freighterAvailable();
      expect(available).toBe(true);
    });

    it("freighterAvailable returns false when error is thrown", async () => {
      vi.mocked(freighterApi.isConnected).mockRejectedValue(new Error("extension not present"));
      const available = await freighterAvailable();
      expect(available).toBe(false);
    });

    it("connectWallet succeeds and returns address", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({
        address: dummyPublicKey,
        error: undefined,
      });

      const address = await connectWallet();
      expect(address).toBe(dummyPublicKey);
    });

    it("connectWallet throws FREIGHTER_NOT_FOUND when not installed", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: false });

      await expect(connectWallet()).rejects.toThrow("Freighter is not installed");
    });

    it("connectWallet throws FREIGHTER_REQUEST_DENIED on user rejection", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({
        address: "",
        error: "User denied access" as any,
      });

      await expect(connectWallet()).rejects.toThrow("User denied access");
    });

    it("ensureNetwork succeeds on matching testnet", async () => {
      vi.mocked(freighterApi.getNetwork).mockResolvedValue({
        network: "TESTNET",
        networkPassphrase: "Test SDF Network ; September 2015",
      });

      const network = await ensureNetwork();
      expect(network).toBe("TESTNET");
    });

    it("ensureNetwork throws WRONG_NETWORK on network mismatch", async () => {
      vi.mocked(freighterApi.getNetwork).mockResolvedValue({
        network: "PUBLIC",
        networkPassphrase: "Public Global Stellar Network ; September 2015",
      });

      await expect(ensureNetwork()).rejects.toThrow('Freighter is on "PUBLIC" but this store expects "testnet"');
    });

    it("signWithFreighter returns signed tx XDR", async () => {
      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: validTxXdr,
      });

      const signed = await signWithFreighter("AAAA-RAW-XDR", dummyPublicKey);
      expect(signed).toBe(validTxXdr);
    });

    it("signWithFreighter throws FREIGHTER_SIGN_ERROR on failure", async () => {
      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: "",
        error: "User rejected signing" as any,
      });

      await expect(signWithFreighter("AAAA-RAW-XDR", dummyPublicKey)).rejects.toThrow("User rejected signing");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Full payWithStellar transaction flow & Error Handling
  // -------------------------------------------------------------------------
  describe("payWithStellar payment flow", () => {
    it("successfully runs full payment flow and returns receipt", async () => {
      const statusUpdates: string[] = [];

      vi.mocked(freighterApi.getNetwork).mockResolvedValue({ network: "TESTNET" });

      vi.spyOn(accountModule, "assertPaymentReady").mockResolvedValue({
        account: dummyAccount,
        funded: true,
        nativeBalanceRaw: BigInt(50000000),
        tokenBalanceRaw: BigInt(500000000),
        decimals: 7,
        hasTrustline: true,
        trustlineAuthorized: true,
        requiredRaw: BigInt(100000000),
        sufficientBalance: true,
        sufficientReserve: true,
        issues: [],
      });

      const dummyTx = {
        toXDR: () => validTxXdr,
      } as any;

      vi.spyOn(simulateModule, "buildInvocationTransaction").mockReturnValue(dummyTx);

      vi.spyOn(simulateModule, "prepareAndReport").mockResolvedValue({
        tx: dummyTx,
        report: {
          ok: true,
          minResourceFee: BigInt(5000),
          instructions: 1500,
        },
      } as any);

      vi.spyOn(simulateModule, "budgetFee").mockResolvedValue("10000");

      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: validTxXdr,
      });

      const mockSendTransaction = vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
        status: "PENDING",
        hash: "txhash12345",
      } as any);

      const mockTxResult = {
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        txHash: "txhash12345",
        ledger: 123456,
      } as any;

      vi.spyOn(eventsModule, "waitForTransaction").mockResolvedValue(mockTxResult);

      const mockReceipt = {
        txHash: "txhash12345",
        ledger: 123456,
        orderId: "orderhash0001",
        buyer: dummyPublicKey,
        amount: "100000000",
      };
      vi.spyOn(eventsModule, "decodePaymentEvent").mockReturnValue(mockReceipt);

      const result = await payWithStellar({
        amountUsd: 10,
        orderId: "ORDER-999",
        publicKey: dummyPublicKey,
        onStatus: (msg) => statusUpdates.push(msg),
      });

      expect(result.hash).toBe("txhash12345");
      expect(result.status).toBe(rpc.Api.GetTransactionStatus.SUCCESS);
      expect(result.receipt).toEqual(mockReceipt);
      expect(result.amountUsd).toBe(10);
      expect(result.amountRaw).toBe(BigInt(100000000));
      expect(statusUpdates).toContain("Checking Freighter network…");
      expect(statusUpdates).toContain("Submitting transaction…");
      expect(mockSendTransaction).toHaveBeenCalled();
    });

    it("throws TX_SIMULATION_ERROR when pre-flight simulation fails", async () => {
      vi.mocked(freighterApi.getNetwork).mockResolvedValue({ network: "TESTNET" });
      vi.spyOn(accountModule, "assertPaymentReady").mockResolvedValue({
        account: dummyAccount,
        funded: true,
        nativeBalanceRaw: BigInt(50000000),
        tokenBalanceRaw: BigInt(500000000),
        decimals: 7,
        hasTrustline: true,
        trustlineAuthorized: true,
        requiredRaw: BigInt(100000000),
        sufficientBalance: true,
        sufficientReserve: true,
        issues: [],
      });

      vi.spyOn(simulateModule, "buildInvocationTransaction").mockReturnValue({} as any);

      vi.spyOn(simulateModule, "prepareAndReport").mockResolvedValue({
        tx: {} as any,
        report: {
          ok: false,
          error: new Error("HostError: Insufficient balance"),
        },
      } as any);

      await expect(
        payWithStellar({
          amountUsd: 10,
          orderId: "ORDER-FAIL",
          publicKey: dummyPublicKey,
        })
      ).rejects.toThrow("Transaction simulation failed: HostError: Insufficient balance");
    });

    it("throws TX_SEND_ERROR when transaction submission is rejected", async () => {
      vi.mocked(freighterApi.getNetwork).mockResolvedValue({ network: "TESTNET" });
      vi.spyOn(accountModule, "assertPaymentReady").mockResolvedValue({
        account: dummyAccount,
        funded: true,
        nativeBalanceRaw: BigInt(50000000),
        tokenBalanceRaw: BigInt(500000000),
        decimals: 7,
        hasTrustline: true,
        trustlineAuthorized: true,
        requiredRaw: BigInt(100000000),
        sufficientBalance: true,
        sufficientReserve: true,
        issues: [],
      });

      const dummyTx = { toXDR: () => validTxXdr } as any;
      vi.spyOn(simulateModule, "buildInvocationTransaction").mockReturnValue(dummyTx);
      vi.spyOn(simulateModule, "prepareAndReport").mockResolvedValue({
        tx: dummyTx,
        report: { ok: true, minResourceFee: BigInt(100) },
      } as any);
      vi.spyOn(simulateModule, "budgetFee").mockResolvedValue("500");

      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: validTxXdr,
      });

      vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
        status: "ERROR",
        errorResult: {
          toXDR: () => "BASE64-ERROR-RESULT",
        },
      } as any);

      await expect(
        payWithStellar({
          amountUsd: 10,
          orderId: "ORDER-REJECT",
          publicKey: dummyPublicKey,
        })
      ).rejects.toThrow("Transaction rejected: BASE64-ERROR-RESULT");
    });
  });

  // -------------------------------------------------------------------------
  // 4. Test Escrow payment operations (dispatchOrder & refundOrder)
  // -------------------------------------------------------------------------
  describe("Escrow payment flow (dispatchOrder & refundOrder)", () => {
    it("dispatchOrder executes and returns success result", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({ address: dummyPublicKey });

      vi.spyOn(rpc.Server.prototype, "getAccount").mockResolvedValue(new Account(dummyPublicKey, "200"));
      vi.spyOn(rpc.Server.prototype, "simulateTransaction").mockResolvedValue(mockValidSimResult as any);
      vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
        status: "PENDING",
        hash: "dispatch-hash-456",
      } as any);
      vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue({
        status: "SUCCESS",
        ledger: 8888,
      } as any);

      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: validTxXdr,
      });

      const res = await dispatchOrder("ORDER-DISPATCH-1");
      expect(res.success).toBe(true);
      expect(res.txHash).toBe("dispatch-hash-456");
      expect(res.ledger).toBe(8888);
    });

    it("dispatchOrder returns error when simulation fails", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({ address: dummyPublicKey });

      vi.spyOn(rpc.Server.prototype, "getAccount").mockResolvedValue(new Account(dummyPublicKey, "200"));
      vi.spyOn(rpc.Server.prototype, "simulateTransaction").mockResolvedValue({
        error: "ContractError(1) - Unauthorized caller",
      } as any);

      const res = await dispatchOrder("ORDER-UNAUTH-DISPATCH");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Simulation failed: ContractError(1) - Unauthorized caller");
    });

    it("refundOrder executes and returns success result", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({ address: dummyPublicKey });

      vi.spyOn(rpc.Server.prototype, "getAccount").mockResolvedValue(new Account(dummyPublicKey, "200"));
      vi.spyOn(rpc.Server.prototype, "simulateTransaction").mockResolvedValue(mockValidSimResult as any);
      vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
        status: "PENDING",
        hash: "refund-hash-789",
      } as any);
      vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue({
        status: "SUCCESS",
        ledger: 9999,
      } as any);

      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: validTxXdr,
      });

      const res = await refundOrder("ORDER-REFUND-1");
      expect(res.success).toBe(true);
      expect(res.txHash).toBe("refund-hash-789");
      expect(res.ledger).toBe(9999);
    });

    it("refundOrder returns error when submission returns ERROR", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({ isConnected: true });
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({ address: dummyPublicKey });

      vi.spyOn(rpc.Server.prototype, "getAccount").mockResolvedValue(new Account(dummyPublicKey, "200"));
      vi.spyOn(rpc.Server.prototype, "simulateTransaction").mockResolvedValue(mockValidSimResult as any);
      vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
        status: "ERROR",
        errorResult: { toXDR: () => "TX_FAILED_BASE64" },
      } as any);

      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: validTxXdr,
      });

      const res = await refundOrder("ORDER-REFUND-ERROR");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Send failed: TX_FAILED_BASE64");
    });
  });
});

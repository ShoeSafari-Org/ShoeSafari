import { describe, expect, it, vi } from "vitest";
import { fetchXlmSpotPrice, usdToXlmRawUnits } from "../../lib/xlmPrice";

describe("USD to native XLM quote conversion", () => {
  it("rounds upward at the seven decimal XLM boundary", () => {
    expect(usdToXlmRawUnits(1, 0.5)).toBe("20000000");
    expect(usdToXlmRawUnits(0.01, 0.5)).toBe("200000");
    expect(usdToXlmRawUnits(0.00000001, 1)).toBe("1");
  });

  it("rejects invalid totals, prices, and unsupported precision", () => {
    expect(() => usdToXlmRawUnits(0, 0.5)).toThrow();
    expect(() => usdToXlmRawUnits(1, 0)).toThrow();
    expect(() => usdToXlmRawUnits(1, Number.NaN)).toThrow();
    expect(() => usdToXlmRawUnits(1, 0.5, 19)).toThrow();
  });

  it("supports explicit decimal precision without undercharging", () => {
    expect(usdToXlmRawUnits(1, 0.25, 2)).toBe("400");
    expect(usdToXlmRawUnits(1, 0.3, 2)).toBe("334");
  });
});

describe("fresh XLM spot quotes", () => {
  const provider = (body: unknown, ok = true) => ({
    fetchSpotPrice: vi.fn().mockResolvedValue({ ok, json: async () => body }),
  });

  it.each([
    [{ stellar: { usd: 0.5, last_updated_at: 100 } }, 200_000, /stale/i],
    [{ stellar: { usd: 0.5, last_updated_at: 206 } }, 200_000, /stale/i],
    [{ stellar: { usd: "not-a-number", last_updated_at: 200 } }, 200_000, /invalid price/i],
  ])("rejects unsafe quote payloads", async (body, now, message) => {
    await expect(fetchXlmSpotPrice(now, provider(body))).rejects.toThrow(message);
  });

  it("reports provider outages without making a live request", async () => {
    await expect(fetchXlmSpotPrice(Date.now(), provider({}, false))).rejects.toThrow(/unavailable/i);
  });

  it("accepts a fresh provider quote", async () => {
    await expect(
      fetchXlmSpotPrice(200_000, provider({ stellar: { usd: 0.5, last_updated_at: 200 } }))
    ).resolves.toEqual({ usd: 0.5, updatedAt: 200_000 });
  });
});

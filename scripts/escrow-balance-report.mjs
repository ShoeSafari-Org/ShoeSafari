#!/usr/bin/env node

import { readFileSync } from "node:fs";

const usage = "Usage: node scripts/escrow-balance-report.mjs --orders <json> --balances <json> [--now <ISO-8601>]";
const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (value === "--help") {
    console.log(usage);
    process.exit(0);
  }
  if (value?.startsWith("--")) args.set(value, process.argv[++index]);
}

function required(name) {
  const path = args.get(name);
  if (!path) throw new Error(`${name} is required. ${usage}`);
  return path;
}

function readJson(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${path} must contain a JSON array`);
  return parsed;
}

const orders = readJson(required("--orders"));
const balances = readJson(required("--balances"));
const now = Date.parse(args.get("--now") ?? new Date().toISOString());
if (!Number.isFinite(now)) throw new Error("--now must be a valid ISO-8601 timestamp");

const expected = new Map();
const oldest = new Map();
for (const order of orders) {
  if (order?.status !== "Paid") continue;
  if (typeof order.token !== "string" || !Number.isSafeInteger(order.amount) || order.amount < 0) {
    throw new Error("Paid orders require token and a non-negative integer amount");
  }
  expected.set(order.token, (expected.get(order.token) ?? 0) + order.amount);
  const paidAt = Date.parse(order.paidAt ?? "");
  if (Number.isFinite(paidAt)) oldest.set(order.token, Math.min(oldest.get(order.token) ?? paidAt, paidAt));
}

const observed = new Map(balances.map((balance) => [balance?.token, balance?.amount]));
const tokens = new Set([...expected.keys(), ...observed.keys()]);
const report = [...tokens].sort().map((token) => {
  const expectedAmount = expected.get(token) ?? 0;
  const observedAmount = observed.get(token);
  const gap = typeof observedAmount === "number" ? observedAmount - expectedAmount : null;
  const ageSeconds = oldest.has(token) ? Math.max(0, Math.floor((now - oldest.get(token)) / 1000)) : null;
  return {
    token,
    expectedPaidAmount: expectedAmount,
    observedContractBalance: observedAmount ?? null,
    gap,
    oldestPaidOrderAgeSeconds: ageSeconds,
    status: observedAmount === undefined ? "token-mismatch" : gap === 0 ? "ok" : "gap",
  };
});

console.log(JSON.stringify({ generatedAt: new Date(now).toISOString(), readOnly: true, report }, null, 2));

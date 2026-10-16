import { xdr, Address, scValToNative } from "@stellar/stellar-sdk";

// ---------------------------------------------------------------------------
// ScVal construction + decoding helpers for the checkout contract.
// The contract `pay` signature is:
//   pay(token: Address, buyer: Address, order_id: BytesN<32>, amount: i128)
// ---------------------------------------------------------------------------

/**
 * Build an i128 ScVal. Verified byte-for-byte identical to
 * `nativeToScVal(v, { type: "i128" })` for arbitrary 128-bit values.
 */
export function i128ToScVal(value: bigint | number | string): xdr.ScVal {
  const v = BigInt(value);
  const mask = BigInt("0xffffffffffffffff");
  const lo = new xdr.Uint64(BigInt.asUintN(64, v & mask));
  const hi = new xdr.Int64(BigInt.asUintN(64, v >> BigInt(64)));
  return xdr.ScVal.scvI128(new xdr.Int128Parts({ lo, hi }));
}

/**
 * Build a BytesN<32> ScVal from a Uint8Array (or hex string).
 */
export function bytes32ToScVal(bytes: Uint8Array | string): xdr.ScVal {
  const buf =
    typeof bytes === "string" ? Buffer.from(hexToBytes(bytes)) : Buffer.from(bytes);
  if (buf.length !== 32) {
    throw new Error(`order_id must be exactly 32 bytes (got ${buf.length})`);
  }
  return xdr.ScVal.scvBytes(buf);
}

/**
 * Build an Address ScVal from a G... / C... strkey.
 */
export function addressToScVal(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

/**
 * Build a Symbol ScVal.
 */
export function symbolToScVal(symbol: string): xdr.ScVal {
  return xdr.ScVal.scvSymbol(symbol);
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/**
 * Decode any ScVal to a string for display/logging. Handles symbols, strings,
 * addresses, bytes (hex), numbers/bigints and maps/vecs (JSON).
 */
export function scValToString(scVal: xdr.ScVal): string {
  const typeName = scVal.switch();
  if (typeName === xdr.ScValType.scvSymbol()) {
    return scVal.sym().toString();
  }
  if (typeName === xdr.ScValType.scvString()) {
    return scVal.str().toString();
  }
  if (typeName === xdr.ScValType.scvAddress()) {
    return scVal.address().toString();
  }
  if (
    typeName === xdr.ScValType.scvI128() ||
    typeName === xdr.ScValType.scvI64() ||
    typeName === xdr.ScValType.scvU32() ||
    typeName === xdr.ScValType.scvU64() ||
    typeName === xdr.ScValType.scvI32()
  ) {
    return scValToNative(scVal).toString();
  }
  if (typeName === xdr.ScValType.scvBytes()) {
    return bytesToHex(scVal.bytes());
  }
  if (typeName === xdr.ScValType.scvBool()) {
    return String(scVal.b());
  }
  try {
    return JSON.stringify(scValToNative(scVal), bigintSafeReplacer);
  } catch {
    return scVal.toXDR("base64");
  }
}

/**
 * Decode an ScVal to a native JS value (BigInt for integers).
 */
export function scValToNativeSafe(scVal: xdr.ScVal): unknown {
  try {
    return scValToNative(scVal);
  } catch {
    return scValToString(scVal);
  }
}

function bigintSafeReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

/** Decode a hexadecimal string into bytes. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "");
  if (clean.length % 2 !== 0) {
    throw new Error("invalid hex string (odd length)");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Encode bytes as a lowercase hexadecimal string. */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * SHA-256 a string order id into a 32-byte value accepted by the contract.
 */
export async function hashOrderId(orderId: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(orderId);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

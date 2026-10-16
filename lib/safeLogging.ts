/** A deliberately small allowlist of error data that is safe to log. */
export interface SafeLoggedError {
  name: string;
  message: string;
  code?: string;
  transactionHash?: string;
}

const TRANSACTION_HASH = /\b[a-f0-9]{64}\b/i;
const ERROR_CODE = /^[a-z0-9_./-]{1,96}$/i;

/** Redacts common PII and credentials from an error string. */
export function redactLogText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted email]")
    .replace(
      /\b((?:shipping\s+)?address)\s*[:=]\s*("[^"]*"|'[^']*'|[^,;]+)/gi,
      "$1=[redacted]"
    )
    .replace(
      /\b(email|e-mail|phone(?:[_ -]?number)?|telephone|card[_ -]?(?:number|data)?|cvv|cvc|token|access[_ -]?token|refresh[_ -]?token|authorization|api[_ -]?key|secret[_ -]?(?:key)?|password)\s*[:=]\s*("[^"]*"|'[^']*'|Bearer\s+[^\s,;]+|[^\s,;]+)/gi,
      "$1=[redacted]"
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .replace(/\b[GS][A-Z2-7]{55}\b/g, "[redacted wallet address]")
    .replace(/\b0x[a-f0-9]{40}\b/gi, "[redacted wallet address]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[redacted card number]");
}

/** Converts common Error/SDK shapes to an allowlisted, redacted log record. */
export function safeErrorForLogging(
  error: unknown,
  transactionHash?: string
): SafeLoggedError {
  const record =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : undefined;
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : typeof record?.message === "string"
          ? record.message
          : "An unexpected error occurred";
  const rawName =
    error instanceof Error
      ? error.name
      : typeof record?.name === "string"
        ? record.name
        : "Error";
  const rawCode = typeof record?.code === "string" ? record.code : undefined;
  const rawHash =
    transactionHash ??
    (typeof record?.transactionHash === "string"
      ? record.transactionHash
      : typeof record?.hash === "string"
        ? record.hash
        : undefined);
  const messageHash = rawMessage.match(TRANSACTION_HASH)?.[0];
  const normalizedHash = rawHash?.match(TRANSACTION_HASH)?.[0] ?? messageHash;

  return {
    name: /^[a-z][a-z0-9]{0,39}$/i.test(rawName) ? rawName : "Error",
    message: redactLogText(rawMessage),
    ...(rawCode && ERROR_CODE.test(rawCode) ? { code: rawCode } : {}),
    ...(normalizedHash ? { transactionHash: normalizedHash } : {}),
  };
}

/** Logs only the sanitized error summary, never the original object or stack. */
export function logClientError(
  context: string,
  error: unknown,
  transactionHash?: string
): void {
  console.error(redactLogText(context), safeErrorForLogging(error, transactionHash));
}

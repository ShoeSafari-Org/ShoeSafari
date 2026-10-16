const DEFAULT_LOGIN_REDIRECT = "/shop";
const REDIRECT_ORIGIN = "https://shoesafari.invalid";

/** Return a safe same-origin path for a login redirect, or the shop fallback. */
export function getSafeLoginRedirect(redirect: string | null | undefined): string {
  if (
    !redirect ||
    !redirect.startsWith("/") ||
    redirect.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(redirect) ||
    /%(?:2f|5c|3f|23|0[0-9a-f]|1[0-9a-f]|7f)/i.test(redirect)
  ) {
    return DEFAULT_LOGIN_REDIRECT;
  }

  // Decode repeatedly to catch double-encoded separators and reject malformed
  // escapes before URL normalization can reinterpret them.
  let decoded = redirect;
  try {
    for (let pass = 0; pass < 4; pass += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return DEFAULT_LOGIN_REDIRECT;
  }

  if (
    decoded.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(decoded) ||
    /%(?:2f|5c|3f|23|0[0-9a-f]|1[0-9a-f]|7f)/i.test(decoded)
  ) {
    return DEFAULT_LOGIN_REDIRECT;
  }

  try {
    const target = new URL(redirect, REDIRECT_ORIGIN);
    if (target.origin !== REDIRECT_ORIGIN || target.username || target.password) {
      return DEFAULT_LOGIN_REDIRECT;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return DEFAULT_LOGIN_REDIRECT;
  }
}

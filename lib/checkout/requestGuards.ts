/**
 * Origin and content-type guards for checkout mutation routes (#326).
 *
 * The quote routes mint a signed price the client later presents as proof of
 * what it was quoted. They are POST-only and therefore not covered by the
 * browser's CORS preflight in the way a cross-origin `fetch` with a custom
 * header would be — a cross-site form or a same-origin-tagged request can still
 * reach them. The guard below makes those rejections explicit instead of
 * relying on the browser to behave.
 *
 * Deployment model: the storefront calls these routes same-origin, so the
 * allow-list is derived from configuration rather than hard-coded.
 */

/** Origin used by automated tests and local development when unset. */
const LOOPBACK_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

/**
 * Origins allowed to call the checkout mutation routes.
 *
 * `CHECKOUT_ALLOWED_ORIGINS` is a comma-separated list so a deployment can
 * serve the storefront from more than one host (custom domain plus preview).
 * `NEXT_PUBLIC_APP_URL` is the single canonical origin the app already needs
 * for absolute links, and is accepted as a fallback so a deployment does not
 * have to configure the same value twice.
 */
export function allowedCheckoutOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.CHECKOUT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const canonical = (env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (canonical) configured.push(canonical);

  const list = configured.length > 0 ? configured : LOOPBACK_ORIGINS;

  // Compare scheme+host+port exactly; a URL with a trailing path is still a
  // valid origin claim, so normalise through the URL parser and drop the rest.
  // Deduplicate because the same origin commonly appears in both settings, and
  // a repeated entry would only cost work on every request.
  const normalised = list.map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      return value.replace(/\/$/, "");
    }
  });

  return [...new Set(normalised)];
}

export type OriginCheck =
  | { ok: true; origin: string }
  | { ok: false; status: number; error: string };

/**
 * Rejects a checkout mutation that did not come from an allowed origin.
 *
 * A missing `Origin` header is rejected rather than allowed. Browsers always
 * send `Origin` on a cross-origin POST, and same-origin POSTs from forms and
 * `fetch` send it too since the 2020 spec change — so its absence means the
 * caller is not a browser page we control (curl, a server-side script, an
 * older client), which is exactly what this guard exists to stop.
 */
export function checkCheckoutOrigin(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): OriginCheck {
  const origin = request.headers.get("origin");
  if (!origin) {
    return {
      ok: false,
      status: 403,
      error: "This request must come from the storefront.",
    };
  }

  let claimed: string;
  try {
    claimed = new URL(origin).origin;
  } catch {
    return { ok: false, status: 403, error: "This request has an invalid origin." };
  }

  const allowed = allowedCheckoutOrigins(env);
  if (!allowed.includes(claimed)) {
    return { ok: false, status: 403, error: "This request has an untrusted origin." };
  }

  return { ok: true, origin: claimed };
}

/**
 * Requires a JSON body on a checkout mutation.
 *
 * A cross-site HTML form can only send `application/x-www-form-urlencoded`,
 * `multipart/form-data` or `text/plain` without triggering a preflight. Demanding
 * JSON therefore blocks the simplest CSRF shape even before the origin check
 * runs, and keeps the two protections independent.
 */
export function checkJsonContentType(request: Request): OriginCheck {
  const raw = request.headers.get("content-type") ?? "";
  const mime = raw.split(";")[0].trim().toLowerCase();

  if (mime !== "application/json") {
    return {
      ok: false,
      status: 415,
      error: "This endpoint accepts JSON requests only.",
    };
  }

  return { ok: true, origin: mime };
}

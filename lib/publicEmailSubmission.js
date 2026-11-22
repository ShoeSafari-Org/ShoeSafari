const windows = new Map();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

export function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0]?.trim() || "unknown").slice(0, 80);
}

export function isRateLimited(key) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.expiresAt <= now) {
    windows.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}

export function validatePublicSubmission(body) {
  if (!body || typeof body !== "object") throw new Error("Invalid submission.");
  const fields = ["name", "email", "subject", "message"];
  const values = Object.fromEntries(
    fields.map((field) => {
      const value = typeof body[field] === "string" ? body[field].trim() : "";
      if (!value || value.length > { name: 100, email: 254, subject: 120, message: 4000 }[field]) {
        throw new Error("Please provide valid contact details.");
      }
      return [field, value];
    })
  );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    throw new Error("Please provide valid contact details.");
  }
  return values;
}

export async function sendPublicEmail(values) {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  const recipientEmail = process.env.NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL;
  if (!serviceId || !templateId || !publicKey) throw new Error("Email service unavailable.");

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: { ...values, recipient_email: recipientEmail },
    }),
  });
  if (!response.ok) throw new Error("Email service unavailable.");
}

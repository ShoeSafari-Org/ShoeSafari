const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field = (value, label, limit) => {
  if (typeof value !== "string") throw new Error(`Enter a valid ${label}.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > limit) throw new Error(`Enter a valid ${label}.`);
  return normalized;
};

export function validateEmailPayload(input) {
  const name = field(input?.name, "name", 100);
  const email = field(input?.email, "email address", 254);
  const subject = field(input?.subject, "subject", 120);
  const message = field(input?.message, "message", 4000);

  if (!EMAIL_PATTERN.test(email)) throw new Error("Enter a valid email address.");

  let recipientEmail;
  if (input.recipientEmail !== undefined && input.recipientEmail !== null) {
    if (typeof input.recipientEmail !== "string") {
      throw new Error("Enter a valid recipient email address.");
    }
    recipientEmail = input.recipientEmail.trim();
  }
  if (
    recipientEmail !== undefined &&
    (typeof recipientEmail !== "string" ||
      recipientEmail.length > 254 ||
      !EMAIL_PATTERN.test(recipientEmail))
  ) {
    throw new Error("Enter a valid recipient email address.");
  }

  return { name, email, subject, message, recipientEmail };
}

import { validateEmailPayload } from "./emailValidation";

/**
 * Sends an email using EmailJS service.
 * @param {Object} options - Email options
 * @param {string} options.name - Sender's name
 * @param {string} options.email - Sender's email address
 * @param {string} options.message - Email message body
 * @param {string} [options.recipientEmail] - Recipient email (defaults to env var)
 * @param {string} options.subject - Email subject line
 * @returns {Promise<{status: number, text: string}>} EmailJS response
 * @throws {Error} If configuration is missing or email fails to send
 */
const sendMail = async ({ name = "", email = "", message = "", recipientEmail, subject }) => {
  const validated = validateEmailPayload({ name, email, message, subject, recipientEmail });
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validated),
  });
  if (!response.ok) throw new Error("Email could not be sent. Please try again later.");
  return { status: response.status, text: "Accepted" };
};

export default sendMail;

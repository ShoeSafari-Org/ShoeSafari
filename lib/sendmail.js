import emailjs from "@emailjs/browser";
import { validateEmailPayload } from "./emailValidation";

// Validate required environment variables
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
const DEFAULT_RECIPIENT_EMAIL = process.env.NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL;

if (EMAILJS_PUBLIC_KEY) {
  emailjs.init({
    publicKey: EMAILJS_PUBLIC_KEY,
    blockHeadless: true,
    limitRate: { id: "shoesafari-email", throttle: 10000 },
  });
}

/**
 * Validates that all required EmailJS environment variables are configured.
 * @throws {Error} If any required environment variable is missing.
 */
const validateEmailConfig = () => {
  const missingVars = [];

  if (!EMAILJS_SERVICE_ID) missingVars.push("NEXT_PUBLIC_EMAILJS_SERVICE_ID");
  if (!EMAILJS_TEMPLATE_ID) missingVars.push("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID");
  if (!EMAILJS_PUBLIC_KEY) missingVars.push("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY");

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required EmailJS configuration. Please set the following environment variables: ${missingVars.join(", ")}. ` +
        `See .env.local.example for reference.`
    );
  }
};

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
  validateEmailConfig();
  const validated = validateEmailPayload({ name, email, message, subject, recipientEmail });
  const templateParams = {
    ...validated,
    recipient_email: validated.recipientEmail || DEFAULT_RECIPIENT_EMAIL,
  };
  delete templateParams.recipientEmail;

  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    return { status: response.status, text: response.text };
  } catch {
    throw new Error("Email could not be sent. Please try again later.");
  }
};

export default sendMail;

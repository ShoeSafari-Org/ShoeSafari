import { describe, expect, it } from "vitest";
import { validateEmailPayload } from "../../lib/emailValidation";

describe("validateEmailPayload", () => {
  const valid = {
    name: " Ada Lovelace ",
    email: "ada@example.com",
    subject: "Question",
    message: "Hello",
  };

  it("trims valid fields and accepts an optional recipient", () => {
    expect(validateEmailPayload({ ...valid, recipientEmail: "orders@example.com" })).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      subject: "Question",
      message: "Hello",
      recipientEmail: "orders@example.com",
    });
  });

  it.each([
    [{ ...valid, email: "invalid" }, /email address/],
    [{ ...valid, name: " " }, /name/],
    [{ ...valid, message: "x".repeat(4001) }, /message/],
    [{ ...valid, recipientEmail: "invalid" }, /recipient email/],
  ])("rejects invalid or oversized form values", (input, error) => {
    expect(() => validateEmailPayload(input)).toThrow(error);
  });
});

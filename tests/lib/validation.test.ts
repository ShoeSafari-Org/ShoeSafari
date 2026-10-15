import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validateName,
  validatePhone,
  validateOTP,
  validatePrice,
  validateStellarAddress,
  validateProductImage,
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  sanitizeText,
  escapeHtml,
  validateForm,
} from "../../lib/validation";

describe("sanitizeText", () => {
  it("removes null bytes and control characters", () => {
    expect(sanitizeText("hello\x00world")).toBe("helloworld");
    expect(sanitizeText("test\x01\x02\x03")).toBe("test");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("handles empty strings", () => {
    expect(sanitizeText("")).toBe("");
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
  });

  it("escapes quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });
});

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("test@example.com").isValid).toBe(true);
    expect(validateEmail("user.name@domain.org").isValid).toBe(true);
    expect(validateEmail("user+tag@example.co.uk").isValid).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmail("").isValid).toBe(false);
    expect(validateEmail("not-an-email").isValid).toBe(false);
    expect(validateEmail("missing@domain").isValid).toBe(false);
    expect(validateEmail("@nodomain.com").isValid).toBe(false);
  });

  it("rejects emails that are too long", () => {
    const longEmail = "a".repeat(250) + "@test.com";
    expect(validateEmail(longEmail).isValid).toBe(false);
  });

  it("returns sanitized lowercase email", () => {
    const result = validateEmail("TEST@EXAMPLE.COM");
    expect(result.sanitized).toBe("test@example.com");
  });
});

describe("validateName", () => {
  it("accepts valid names", () => {
    expect(validateName("John").isValid).toBe(true);
    expect(validateName("Mary Jane").isValid).toBe(true);
    expect(validateName("O'Brien").isValid).toBe(true);
    expect(validateName("Mary-Jane").isValid).toBe(true);
  });

  it("rejects invalid names", () => {
    expect(validateName("").isValid).toBe(false);
    expect(validateName("A").isValid).toBe(false); // too short
    expect(validateName("John123").isValid).toBe(false); // contains numbers
    expect(validateName("John@Doe").isValid).toBe(false); // contains @
  });

  it("uses custom field name in error", () => {
    const result = validateName("", "First Name");
    expect(result.error).toContain("First Name");
  });
});

describe("validatePhone", () => {
  it("accepts valid phone numbers", () => {
    expect(validatePhone("1234567890").isValid).toBe(true);
    expect(validatePhone("+1-234-567-8901").isValid).toBe(true);
    expect(validatePhone("(123) 456-7890").isValid).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(validatePhone("").isValid).toBe(false);
    expect(validatePhone("123").isValid).toBe(false); // too short
    expect(validatePhone("abc-def-ghij").isValid).toBe(false); // letters
  });

  it("sanitizes phone formatting", () => {
    const result = validatePhone("+1 (234) 567-8901");
    expect(result.sanitized).toBe("+12345678901");
  });
});

describe("validateOTP", () => {
  it("accepts valid 6-digit OTP", () => {
    expect(validateOTP("123456").isValid).toBe(true);
    expect(validateOTP("000000").isValid).toBe(true);
  });

  it("rejects invalid OTP", () => {
    expect(validateOTP("").isValid).toBe(false);
    expect(validateOTP("12345").isValid).toBe(false); // too short
    expect(validateOTP("1234567").isValid).toBe(false); // too long
    expect(validateOTP("12345a").isValid).toBe(false); // contains letter
  });

  it("strips non-digits", () => {
    const result = validateOTP("12-34-56");
    expect(result.sanitized).toBe("123456");
    expect(result.isValid).toBe(true);
  });
});

describe("validatePrice", () => {
  it("accepts valid prices", () => {
    expect(validatePrice("99.99").isValid).toBe(true);
    expect(validatePrice(100).isValid).toBe(true);
    expect(validatePrice("0").isValid).toBe(true);
  });

  it("rejects invalid prices", () => {
    expect(validatePrice("not-a-number").isValid).toBe(false);
    expect(validatePrice(-10).isValid).toBe(false);
    expect(validatePrice(1000001).isValid).toBe(false); // too high
  });

  it("formats to 2 decimal places", () => {
    const result = validatePrice("99.999");
    expect(result.sanitized).toBe("100.00");
  });
});

describe("validateProductImage", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/gif"])(
    "accepts supported format %s below the size limit",
    (type) => {
      expect(validateProductImage({ type, size: 1024 }).isValid).toBe(true);
    }
  );

  it.each(["text/plain", "image/svg+xml", "application/octet-stream"])(
    "rejects unsupported format %s",
    (type) => {
      expect(validateProductImage({ type, size: 1024 })).toMatchObject({
        isValid: false,
        error: expect.any(String),
      });
    }
  );

  it("rejects files at or above the Firebase Storage size limit", () => {
    expect(
      validateProductImage({
        type: "image/png",
        size: MAX_PRODUCT_IMAGE_SIZE_BYTES,
      }).isValid
    ).toBe(false);
  });
});

describe("validateStellarAddress", () => {
  it("accepts valid Stellar addresses", () => {
    const validAddress = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    expect(validateStellarAddress(validAddress).isValid).toBe(true);
  });

  it("rejects invalid Stellar addresses", () => {
    expect(validateStellarAddress("").isValid).toBe(false);
    expect(validateStellarAddress("not-an-address").isValid).toBe(false);
    expect(validateStellarAddress("GABC").isValid).toBe(false); // too short
    expect(validateStellarAddress("CABC...").isValid).toBe(false); // wrong prefix
  });
});

describe("validateForm", () => {
  it("validates multiple fields at once", () => {
    const result = validateForm({
      email: { value: "test@example.com", validator: validateEmail },
      name: { value: "John Doe", validator: validateName },
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("collects all errors", () => {
    const result = validateForm({
      email: { value: "invalid", validator: validateEmail },
      name: { value: "", validator: validateName },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.name).toBeDefined();
  });

  it("returns sanitized values", () => {
    const result = validateForm({
      email: { value: "TEST@EXAMPLE.COM", validator: validateEmail },
    });

    expect(result.sanitized.email).toBe("test@example.com");
  });
});

import { describe, expect, it } from "vitest";
import { maskSecret, sanitizeHeaders, sanitizeValue } from "../src/sanitize";

describe("maskSecret", () => {
  it("redacts non-strings and short strings", () => {
    expect(maskSecret(undefined)).toBe("<redacted>");
    expect(maskSecret("short")).toBe("<redacted>");
  });

  it("keeps a small prefix and suffix for longer strings", () => {
    expect(maskSecret("sk-1234567890")).toBe("sk-12********90");
  });
});

describe("sanitizeValue", () => {
  it("recursively masks sensitive keys without changing safe values", () => {
    expect(
      sanitizeValue({
        Authorization: "Bearer secret-token",
        nested: {
          api_key: "abcdefghi",
          safe: "visible",
          list: [{ token: "tok-123456789" }, "plain"],
        },
      }),
    ).toEqual({
      Authorization: "Beare********en",
      nested: {
        api_key: "abcde********hi",
        safe: "visible",
        list: [{ token: "tok-1********89" }, "plain"],
      },
    });
  });
});

describe("sanitizeHeaders", () => {
  it("handles sensitive header names case-insensitively", () => {
    expect(
      sanitizeHeaders({
        "X-API-Key": "123456789",
        "content-type": "application/json",
      }),
    ).toEqual({
      "X-API-Key": "12345********89",
      "content-type": "application/json",
    });
  });
});

import { describe, expect, it } from "vitest";
import { validateRunForm } from "../src/lib/validation";

describe("validateRunForm", () => {
  it("accepts a complete run configuration", () => {
    expect(
      validateRunForm({
        profile: "openai-chat",
        baseUrl: "https://api.example.com/v1",
        model: "gpt-test",
        timeoutMs: 30_000,
      }).ok,
    ).toBe(true);
  });

  it("requires an absolute base URL", () => {
    const result = validateRunForm({
      profile: "openai-chat",
      baseUrl: "api.example.com",
      model: "gpt-test",
      timeoutMs: 30_000,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.baseUrl).toBe("Enter a valid absolute URL.");
  });

  it("requires a usable timeout", () => {
    const result = validateRunForm({
      profile: "openai-chat",
      baseUrl: "https://api.example.com/v1",
      model: "gpt-test",
      timeoutMs: 999,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.timeoutMs).toBe("Use at least 1000 ms.");
  });
});

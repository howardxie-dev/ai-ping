import { describe, expect, it } from "vitest";
import { resolveApiKey } from "../src/env";

describe("resolveApiKey", () => {
  it("prefers an explicit API key", () => {
    expect(
      resolveApiKey({
        explicitApiKey: "explicit-key",
        profile: "openai",
        env: {
          AI_PING_API_KEY: "ai-ping-key",
          OPENAI_API_KEY: "openai-key",
        },
      }),
    ).toBe("explicit-key");
  });

  it("falls back to AI_PING_API_KEY", () => {
    expect(
      resolveApiKey({
        profile: "openai",
        env: {
          AI_PING_API_KEY: "ai-ping-key",
          OPENAI_API_KEY: "openai-key",
        },
      }),
    ).toBe("ai-ping-key");
  });

  it("uses OPENAI_API_KEY for the openai alias and openai-chat profile", () => {
    expect(
      resolveApiKey({
        profile: "openai",
        env: { OPENAI_API_KEY: "openai-key" },
      }),
    ).toBe("openai-key");

    expect(
      resolveApiKey({
        profile: "openai-chat",
        env: { OPENAI_API_KEY: "openai-key" },
      }),
    ).toBe("openai-key");

    expect(
      resolveApiKey({
        profile: "ollama",
        env: { OPENAI_API_KEY: "openai-key" },
      }),
    ).toBeUndefined();
  });

  it("uses GEMINI_API_KEY only for the gemini profile", () => {
    expect(
      resolveApiKey({
        profile: "gemini",
        env: { GEMINI_API_KEY: "gemini-key" },
      }),
    ).toBe("gemini-key");

    expect(
      resolveApiKey({
        profile: "openai",
        env: { GEMINI_API_KEY: "gemini-key" },
      }),
    ).toBeUndefined();
  });

  it("uses ANTHROPIC_API_KEY only for the anthropic profile", () => {
    expect(
      resolveApiKey({
        profile: "anthropic",
        env: { ANTHROPIC_API_KEY: "anthropic-key" },
      }),
    ).toBe("anthropic-key");

    expect(
      resolveApiKey({
        profile: "openai",
        env: { ANTHROPIC_API_KEY: "anthropic-key" },
      }),
    ).toBeUndefined();
  });

  it("returns undefined when no matching key is available", () => {
    expect(resolveApiKey({ profile: "openai", env: {} })).toBeUndefined();
  });
});

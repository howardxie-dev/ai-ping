import { afterEach, describe, expect, it, vi } from "vitest";
import { runChecks } from "../src/runner";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("WireCheckReport schema stability", () => {
  it("keeps the v1 core report, summary, and result fields stable", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        id: "chatcmpl-1",
        created: 1,
        model: "test-model",
        usage: {},
        choices: [
          {
            message: { role: "assistant", content: "pong" },
            finish_reason: "stop",
          },
        ],
      }),
    );

    const report = await runChecks({
      profile: "openai",
      baseUrl: "https://example.test/v1",
      model: "test-model",
      apiKey: "secret",
      only: ["openai.chat.basic"],
    });

    expect(report).toEqual(
      expect.objectContaining({
        tool: "ai-ping",
        version: "1.1.0",
        profile: "openai-chat",
        endpoint: "https://example.test/v1",
        model: "test-model",
        startedAt: expect.any(String),
        durationMs: expect.any(Number),
        summary: expect.any(Object),
        results: expect.any(Array),
      }),
    );
    expect(report.summary).toEqual(
      expect.objectContaining({
        passed: expect.any(Number),
        warned: expect.any(Number),
        failed: expect.any(Number),
        skipped: expect.any(Number),
        total: expect.any(Number),
        requiredFailed: expect.any(Number),
        ok: expect.any(Boolean),
      }),
    );
    expect(report.results[0]).toEqual(
      expect.objectContaining({
        id: "openai-chat.chat.basic",
        title: "Basic chat completion",
        profile: "openai-chat",
        status: "pass",
        severity: "required",
        category: "generation",
        message: expect.any(String),
        durationMs: expect.any(Number),
        details: expect.objectContaining({
          status: 200,
          responseShape: "chat.completion",
        }),
      }),
    );
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { listChecks, listProfiles } from "../src/registry";
import { runChecks } from "../src/runner";
import { AiPingConfigError } from "../src/types";

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

function sseResponse(status: number, rawText: string): Response {
  return new Response(rawText, {
    status,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("runChecks", () => {
  it("lists supported profiles and Ollama checks in registry order", () => {
    expect(listProfiles().map((profile) => profile.id)).toEqual([
      "openai",
      "ollama",
      "gemini",
      "anthropic",
    ]);
    expect(listChecks("ollama").map((check) => check.id)).toEqual([
      "ollama.tags",
      "ollama.generate.basic",
      "ollama.generate.stream",
      "ollama.chat.basic",
      "ollama.chat.stream",
    ]);
    expect(listChecks("gemini").map((check) => check.id)).toEqual([
      "gemini.models.list",
      "gemini.generate.basic",
      "gemini.generate.stream",
      "gemini.error.format",
    ]);
    expect(listChecks("anthropic").map((check) => check.id)).toEqual([
      "anthropic.models.list",
      "anthropic.messages.basic",
      "anthropic.messages.stream",
      "anthropic.error.format",
    ]);
  });

  it("validates required options and known profiles", async () => {
    await expect(
      runChecks({
        profile: "",
        baseUrl: "https://example.test/v1",
        model: "test-model",
      }),
    ).rejects.toThrow(AiPingConfigError);

    await expect(
      runChecks({
        profile: "missing",
        baseUrl: "https://example.test/v1",
        model: "test-model",
      }),
    ).rejects.toThrow("Unknown profile: missing");
  });

  it("runs selected checks, builds a report, and attaches authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
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
    globalThis.fetch = fetchMock;

    const report = await runChecks({
      profile: "openai",
      baseUrl: "https://example.test/v1/",
      model: "test-model",
      apiKey: "secret",
      only: ["openai.chat.basic"],
    });

    expect(report.tool).toBe("ai-ping");
    expect(report.profile).toBe("openai");
    expect(report.endpoint).toBe("https://example.test/v1/");
    expect(report.summary).toMatchObject({
      passed: 1,
      total: 1,
      requiredFailed: 0,
      ok: true,
    });
    expect(report.results).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer secret",
        }),
      }),
    );
  });

  it("supports skip and converts crashed checks into failed results", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          object: "list",
          data: [{ id: "test-model", object: "model", created: 1, owned_by: "ai-ping" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          choices: [{ message: { content: "pong" } }],
        }),
      )
      .mockRejectedValueOnce(new Error("network down"));
    globalThis.fetch = fetchMock;

    const report = await runChecks({
      profile: "openai",
      baseUrl: "https://example.test/v1",
      model: "test-model",
      skip: ["openai.chat.stream"],
    });

    expect(report.results.map((result) => result.id)).toEqual([
      "openai.models.list",
      "openai.chat.basic",
      "openai.error.format",
    ]);
    expect(report.results[0]).toMatchObject({ status: "pass" });
    expect(report.results[1]).toMatchObject({ status: "warn" });
    expect(report.results[2]).toMatchObject({
      status: "fail",
      message: "Request failed: network down",
    });
    expect(report.summary).toMatchObject({
      passed: 1,
      warned: 1,
      failed: 1,
      requiredFailed: 0,
      ok: true,
    });
  });

  it("runs all OpenAI checks together against successful mocked responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          object: "list",
          data: [
            {
              id: "test-model",
              object: "model",
              created: 1,
              owned_by: "ai-ping",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          id: "chatcmpl-1",
          created: 1,
          model: "test-model",
          usage: {},
          choices: [
            {
              message: { content: "pong" },
              finish_reason: "stop",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        sseResponse(
          200,
          [
            'data: {"choices":[{"delta":{"content":"po"}}]}',
            "",
            "data: [DONE]",
          ].join("\n"),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(400, {
          error: {
            message: "Missing model",
            type: "invalid_request_error",
            code: "missing_model",
            param: "model",
          },
        }),
      );
    globalThis.fetch = fetchMock;

    const report = await runChecks({
      profile: "openai",
      baseUrl: "https://example.test/v1",
      model: "test-model",
    });

    expect(report.results.map((result) => [result.id, result.status])).toEqual([
      ["openai.models.list", "pass"],
      ["openai.chat.basic", "pass"],
      ["openai.chat.stream", "pass"],
      ["openai.error.format", "pass"],
    ]);
    expect(report.summary).toMatchObject({
      passed: 4,
      total: 4,
      ok: true,
    });
  });

  it("runs all Ollama checks together without an API key", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          models: [
            {
              name: "llama3.2",
              modified_at: "2026-04-24T00:00:00Z",
              size: 123,
              digest: "sha256:abc",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          response: "pong",
          done: true,
          total_duration: 1,
          eval_count: 1,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          [
            '{"response":"po","done":false}',
            '{"response":"ng","done":true,"total_duration":1,"eval_count":1}',
          ].join("\n"),
          {
            status: 200,
            headers: { "content-type": "application/x-ndjson" },
          },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          model: "llama3.2",
          created_at: "2026-04-24T00:00:00Z",
          message: { role: "assistant", content: "pong" },
          done: true,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          [
            '{"model":"llama3.2","created_at":"2026-04-24T00:00:00Z","message":{"role":"assistant","content":"po"},"done":false}',
            '{"model":"llama3.2","created_at":"2026-04-24T00:00:00Z","message":{"role":"assistant","content":"ng"},"done":true}',
          ].join("\n"),
          {
            status: 200,
            headers: { "content-type": "application/x-ndjson" },
          },
        ),
      );
    globalThis.fetch = fetchMock;

    const report = await runChecks({
      profile: "ollama",
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
    });

    expect(report.results.map((result) => [result.id, result.status])).toEqual([
      ["ollama.tags", "pass"],
      ["ollama.generate.basic", "pass"],
      ["ollama.generate.stream", "pass"],
      ["ollama.chat.basic", "pass"],
      ["ollama.chat.stream", "pass"],
    ]);
    expect(report.summary).toMatchObject({
      passed: 5,
      total: 5,
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/api/tags",
      expect.objectContaining({
        method: "GET",
        headers: expect.not.objectContaining({
          authorization: expect.any(String),
        }),
      }),
    );
  });

  it("runs all Gemini checks together with x-goog-api-key auth", async () => {
    const geminiResponse = {
      candidates: [
        {
          content: { parts: [{ text: "pong" }] },
          finishReason: "STOP",
        },
      ],
      usageMetadata: { totalTokenCount: 3 },
      modelVersion: "gemini-2.5-flash",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          models: [
            {
              name: "models/gemini-2.5-flash",
              baseModelId: "gemini-2.5-flash",
              version: "001",
              displayName: "Gemini 2.5 Flash",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, geminiResponse))
      .mockResolvedValueOnce(
        sseResponse(
          200,
          [
            `data: ${JSON.stringify(geminiResponse)}`,
            "data: [DONE]",
          ].join("\n"),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(400, {
          error: {
            code: 400,
            message: "contents is required",
            status: "INVALID_ARGUMENT",
            details: [],
          },
        }),
      );
    globalThis.fetch = fetchMock;

    const report = await runChecks({
      profile: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-2.5-flash",
      apiKey: "gemini-key",
    });

    expect(report.results.map((result) => [result.id, result.status])).toEqual([
      ["gemini.models.list", "pass"],
      ["gemini.generate.basic", "pass"],
      ["gemini.generate.stream", "pass"],
      ["gemini.error.format", "pass"],
    ]);
    expect(report.summary).toMatchObject({
      passed: 4,
      total: 4,
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "x-goog-api-key": "gemini-key",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          authorization: expect.any(String),
        }),
      }),
    );
  });

  it("runs all Anthropic checks together with x-api-key and anthropic-version auth", async () => {
    const messageResponse = {
      id: "msg_123",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-5",
      content: [{ type: "text", text: "pong" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 8, output_tokens: 2 },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: [
            {
              type: "model",
              id: "claude-sonnet-4-5",
              display_name: "Claude Sonnet 4.5",
              created_at: "2026-01-01T00:00:00Z",
            },
          ],
          has_more: false,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, messageResponse))
      .mockResolvedValueOnce(
        sseResponse(
          200,
          [
            'data: {"type":"message_start","message":{"content":[]}}',
            'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"pong"}}',
            'data: {"type":"message_stop"}',
          ].join("\n"),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(400, {
          type: "error",
          error: {
            type: "invalid_request_error",
            message: "model is required",
          },
          request_id: "req_123",
        }),
      );
    globalThis.fetch = fetchMock;

    const report = await runChecks({
      profile: "anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-sonnet-4-5",
      apiKey: "anthropic-key",
    });

    expect(report.results.map((result) => [result.id, result.status])).toEqual([
      ["anthropic.models.list", "pass"],
      ["anthropic.messages.basic", "pass"],
      ["anthropic.messages.stream", "pass"],
      ["anthropic.error.format", "pass"],
    ]);
    expect(report.summary).toMatchObject({
      passed: 4,
      total: 4,
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/models",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "x-api-key": "anthropic-key",
          "anthropic-version": "2023-06-01",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/models",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          authorization: expect.any(String),
        }),
      }),
    );
  });
});

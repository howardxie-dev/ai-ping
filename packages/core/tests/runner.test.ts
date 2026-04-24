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
    ]);
    expect(listChecks("ollama").map((check) => check.id)).toEqual([
      "ollama.tags",
      "ollama.generate.basic",
      "ollama.generate.stream",
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
    ]);
    expect(report.summary).toMatchObject({
      passed: 3,
      total: 3,
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
});

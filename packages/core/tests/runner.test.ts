import { afterEach, describe, expect, it, vi } from "vitest";
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
});

import { describe, expect, it, vi } from "vitest";
import { openaiChatBasicCheck } from "../src/profiles/openai/checks/chat-basic";
import { openaiChatStreamCheck } from "../src/profiles/openai/checks/chat-stream";
import { openaiErrorFormatCheck } from "../src/profiles/openai/checks/error-format";
import type {
  CheckContext,
  HttpJsonResponse,
  HttpStreamResponse,
} from "../src/types";

function mockContext(overrides: Partial<CheckContext> = {}): CheckContext {
  return {
    profile: "openai",
    baseUrl: "https://example.test/v1",
    model: "test-model",
    timeoutMs: 1_000,
    headers: {},
    request: {
      json: vi.fn(),
      stream: vi.fn(),
    },
    ...overrides,
  };
}

function jsonResponse<T>(
  status: number,
  body: T,
): HttpJsonResponse<T> {
  return {
    status,
    headers: { "content-type": "application/json" },
    body,
    rawText: JSON.stringify(body),
  };
}

function streamResponse(
  status: number,
  rawText: string,
  headers: Record<string, string> = { "content-type": "text/event-stream" },
): HttpStreamResponse {
  return {
    status,
    headers,
    chunks: rawText.split(/\n\n/).filter(Boolean),
    done: true,
    rawText,
  };
}

describe("openaiChatBasicCheck", () => {
  it("passes for a complete chat completion response and sends non-stream body", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
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
      ),
      stream: vi.fn(),
    };

    const result = await openaiChatBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "POST",
      path: "/chat/completions",
      body: {
        model: "test-model",
        messages: [{ role: "user", content: "Reply with exactly: pong" }],
        stream: false,
      },
    });
  });

  it("warns when only the minimum response shape is present", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          choices: [{ message: { reasoning_content: "pong" } }],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiChatBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "id",
      "created",
      "model",
      "usage",
      "finish_reason",
    ]);
  });

  it("fails when a response has no usable message content", async () => {
    const request = {
      json: vi
        .fn()
        .mockResolvedValue(jsonResponse(200, { choices: [{ message: {} }] })),
      stream: vi.fn(),
    };

    const result = await openaiChatBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/usable message content/);
  });
});

describe("openaiChatStreamCheck", () => {
  it("passes for SSE chunks with choices, delta, and done marker", async () => {
    const rawText = [
      'data: {"choices":[{"delta":{"content":"po"}}]}',
      "",
      "data: [DONE]",
    ].join("\n");
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(streamResponse(200, rawText)),
    };

    const result = await openaiChatStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.stream).toHaveBeenCalledWith({
      method: "POST",
      path: "/chat/completions",
      body: {
        model: "test-model",
        messages: [{ role: "user", content: "Reply with exactly: pong" }],
        stream: true,
      },
    });
  });

  it("warns when parseable stream data lacks recommended SSE signals", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          'data: {"choices":[{"delta":{"content":"po"}}]}',
          { "content-type": "application/json" },
        ),
      ),
    };

    const result = await openaiChatStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "content-type",
      "done_marker",
    ]);
  });

  it("fails when stream chunks do not include a delta object", async () => {
    const request = {
      json: vi.fn(),
      stream: vi
        .fn()
        .mockResolvedValue(streamResponse(200, 'data: {"choices":[{}]}')),
    };

    const result = await openaiChatStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/choices\[0\]\.delta/);
  });
});

describe("openaiErrorFormatCheck", () => {
  it("passes for a non-2xx OpenAI-style error with metadata", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: {
            message: "Missing model",
            type: "invalid_request_error",
            code: "missing_model",
            param: "model",
          },
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiErrorFormatCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "POST",
      path: "/chat/completions",
      body: {
        messages: [
          {
            role: "user",
            content: "This request is intentionally invalid.",
          },
        ],
        stream: false,
      },
    });
  });

  it("warns for parseable error responses missing recommended metadata", async () => {
    const request = {
      json: vi
        .fn()
        .mockResolvedValue(jsonResponse(400, { error: { message: "Bad" } })),
      stream: vi.fn(),
    };

    const result = await openaiErrorFormatCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "type",
      "code",
      "param",
    ]);
  });

  it("fails when an invalid request unexpectedly succeeds", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })),
      stream: vi.fn(),
    };

    const result = await openaiErrorFormatCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/unexpectedly returned a 2xx/);
  });
});

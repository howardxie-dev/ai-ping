import { describe, expect, it, vi } from "vitest";
import { openaiChatBasicCheck } from "../src/profiles/openai/checks/chat-basic";
import { openaiChatStreamCheck } from "../src/profiles/openai/checks/chat-stream";
import { openaiErrorFormatCheck } from "../src/profiles/openai/checks/error-format";
import { openaiModelsListCheck } from "../src/profiles/openai/checks/models-list";
import { listChecks } from "../src/registry";
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

describe("openaiModelsListCheck", () => {
  it("passes for a valid models list response", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          object: "list",
          data: [
            {
              id: "demo-model",
              object: "model",
              created: 1710000000,
              owned_by: "ai-ping",
            },
          ],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "GET",
      path: "/models",
      timeoutMs: 1000,
    });
  });

  it("warns when recommended fields are missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          data: [{ id: "demo-model" }],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "object",
      "item.object",
      "item.created",
      "item.owned_by",
    ]);
  });

  it("warns when data is an empty array", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          object: "list",
          data: [],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.message).toMatch(/empty data array/);
  });

  it("fails when data is missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { object: "list" })),
      stream: vi.fn(),
    };

    const result = await openaiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/response.data/);
  });

  it("fails when data is not an array", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { data: {} })),
      stream: vi.fn(),
    };

    const result = await openaiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/response.data/);
  });

  it("fails when there is no string id", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          data: [{ id: 123 }, { object: "model" }],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/string id/);
  });

  it("fails on non-2xx responses", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(500, { error: "oops" })),
      stream: vi.fn(),
    };

    const result = await openaiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/Expected 2xx/);
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

describe("openai profile order", () => {
  it("lists canonical checks for openai-chat and the openai alias", () => {
    const expected = [
      "openai-chat.models.list",
      "openai-chat.chat.basic",
      "openai-chat.chat.stream",
      "openai-chat.tool_calls.basic",
      "openai-chat.tool_calls.stream",
      "openai-chat.error.format",
    ];

    expect(listChecks("openai-chat").map((check) => check.id)).toEqual(expected);
    expect(listChecks("openai").map((check) => check.id)).toEqual(expected);
    expect(listChecks("openai-responses").map((check) => check.id)).toEqual([
      "openai-responses.models.list",
      "openai-responses.responses.basic",
      "openai-responses.responses.stream",
      "openai-responses.error.format",
    ]);
  });
});

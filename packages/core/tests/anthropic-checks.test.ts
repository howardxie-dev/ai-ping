import { describe, expect, it, vi } from "vitest";
import { anthropicErrorFormatCheck } from "../src/profiles/anthropic/checks/error-format";
import { anthropicMessagesBasicCheck } from "../src/profiles/anthropic/checks/messages-basic";
import { anthropicMessagesStreamCheck } from "../src/profiles/anthropic/checks/messages-stream";
import { anthropicModelsListCheck } from "../src/profiles/anthropic/checks/models-list";
import type {
  CheckContext,
  HttpJsonResponse,
  HttpStreamResponse,
} from "../src/types";

function mockContext(overrides: Partial<CheckContext> = {}): CheckContext {
  return {
    profile: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-5",
    apiKey: "anthropic-key",
    timeoutMs: 1_000,
    headers: {},
    request: {
      json: vi.fn(),
      stream: vi.fn(),
    },
    ...overrides,
  };
}

function jsonResponse<T>(status: number, body: T): HttpJsonResponse<T> {
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

const messageResponse = {
  id: "msg_123",
  type: "message",
  role: "assistant",
  model: "claude-sonnet-4-5",
  content: [{ type: "text", text: "pong" }],
  stop_reason: "end_turn",
  usage: { input_tokens: 8, output_tokens: 2 },
};

describe("anthropicModelsListCheck", () => {
  it("passes for a valid models list response and sends Anthropic headers", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
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
      ),
      stream: vi.fn(),
    };

    const result = await anthropicModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "GET",
      path: "/models",
      timeoutMs: 1000,
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": "anthropic-key",
      },
      skipDefaultAuth: true,
    });
  });

  it("warns when recommended fields are missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          data: [{ id: "claude-sonnet-4-5" }],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await anthropicModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "has_more",
      "type",
      "display_name",
      "created_at",
    ]);
  });

  it("warns when data is empty", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { data: [] })),
      stream: vi.fn(),
    };

    const result = await anthropicModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.message).toMatch(/empty data array/);
  });

  it("fails when data is missing, invalid, or lacks string ids", async () => {
    await expect(
      anthropicModelsListCheck.run(
        mockContext({
          request: {
            json: vi.fn().mockResolvedValue(jsonResponse(200, {})),
            stream: vi.fn(),
          },
        }),
      ),
    ).resolves.toMatchObject({ status: "fail" });

    await expect(
      anthropicModelsListCheck.run(
        mockContext({
          request: {
            json: vi.fn().mockResolvedValue(jsonResponse(200, { data: {} })),
            stream: vi.fn(),
          },
        }),
      ),
    ).resolves.toMatchObject({ status: "fail" });

    await expect(
      anthropicModelsListCheck.run(
        mockContext({
          request: {
            json: vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ id: 1 }] })),
            stream: vi.fn(),
          },
        }),
      ),
    ).resolves.toMatchObject({ status: "fail" });
  });
});

describe("anthropicMessagesBasicCheck", () => {
  it("passes for a valid message response", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, messageResponse)),
      stream: vi.fn(),
    };

    const result = await anthropicMessagesBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "POST",
      path: "/messages",
      timeoutMs: 1000,
      body: {
        model: "claude-sonnet-4-5",
        max_tokens: 64,
        messages: [
          {
            role: "user",
            content: "Reply with exactly: pong",
          },
        ],
      },
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": "anthropic-key",
      },
      skipDefaultAuth: true,
    });
  });

  it("warns when recommended fields are missing or text is empty", async () => {
    const missingFieldsRequest = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          content: [{ type: "text", text: "pong" }],
        }),
      ),
      stream: vi.fn(),
    };
    const emptyTextRequest = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          ...messageResponse,
          content: [{ type: "text", text: "" }],
        }),
      ),
      stream: vi.fn(),
    };

    await expect(
      anthropicMessagesBasicCheck.run(
        mockContext({ request: missingFieldsRequest }),
      ),
    ).resolves.toMatchObject({ status: "warn" });
    await expect(
      anthropicMessagesBasicCheck.run(mockContext({ request: emptyTextRequest })),
    ).resolves.toMatchObject({ status: "warn" });
  });

  it("fails when content is missing, invalid, empty, or has no text block", async () => {
    for (const body of [
      {},
      { content: {} },
      { content: [] },
      { content: [{ type: "image" }] },
    ]) {
      await expect(
        anthropicMessagesBasicCheck.run(
          mockContext({
            request: {
              json: vi.fn().mockResolvedValue(jsonResponse(200, body)),
              stream: vi.fn(),
            },
          }),
        ),
      ).resolves.toMatchObject({ status: "fail" });
    }
  });
});

describe("anthropicMessagesStreamCheck", () => {
  it("passes for valid Anthropic SSE events", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          [
            'event: message_start\ndata: {"type":"message_start","message":{"content":[]}}',
            'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"pong"}}',
            'event: message_stop\ndata: {"type":"message_stop"}',
          ].join("\n\n"),
        ),
      ),
    };

    const result = await anthropicMessagesStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.stream).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/messages",
        headers: {
          "anthropic-version": "2023-06-01",
          "x-api-key": "anthropic-key",
        },
        skipDefaultAuth: true,
      }),
    );
  });

  it("warns for non-event-stream content type, invalid chunks, or lifecycle without text", async () => {
    const invalidChunkRequest = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          [
            'data: {"type":"message_start","message":{"content":[]}}',
            "data: not-json",
            'data: {"type":"message_stop"}',
          ].join("\n"),
          { "content-type": "application/json" },
        ),
      ),
    };

    const result = await anthropicMessagesStreamCheck.run(
      mockContext({ request: invalidChunkRequest }),
    );

    expect(result.status).toBe("warn");
    expect(result.details?.invalidJsonLineCount).toBe(1);
    expect(result.details?.missingRecommendedFields).toEqual(["content-type"]);
  });

  it("warns when message_stop is missing but text delta exists", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"pong"}}',
        ),
      ),
    };

    const result = await anthropicMessagesStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual(["message_stop"]);
  });

  it("fails when stream data is absent, invalid, or lacks Anthropic events", async () => {
    for (const rawText of [
      "event: ping",
      "data: not-json",
      'data: {"ok":true}',
      'data: {"type":"content_block_start"}',
    ]) {
      await expect(
        anthropicMessagesStreamCheck.run(
          mockContext({
            request: {
              json: vi.fn(),
              stream: vi.fn().mockResolvedValue(streamResponse(200, rawText)),
            },
          }),
        ),
      ).resolves.toMatchObject({ status: "fail" });
    }
  });
});

describe("anthropicErrorFormatCheck", () => {
  it("passes for an Anthropic-style 4xx error response", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(400, {
          type: "error",
          error: {
            type: "invalid_request_error",
            message: "model is required",
          },
          request_id: "req_123",
        }),
      ),
      stream: vi.fn(),
    };

    const result = await anthropicErrorFormatCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "POST",
      path: "/messages",
      timeoutMs: 1000,
      body: {},
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": "anthropic-key",
      },
      skipDefaultAuth: true,
    });
  });

  it("warns when root type is missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: {
            type: "invalid_request_error",
            message: "model is required",
          },
        }),
      ),
      stream: vi.fn(),
    };

    const result = await anthropicErrorFormatCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual(["type"]);
  });

  it("fails for successful, missing, or malformed error responses", async () => {
    for (const [status, body] of [
      [200, { error: { type: "invalid_request_error", message: "bad" } }],
      [400, {}],
      [400, { error: { type: "invalid_request_error" } }],
      [400, { error: { message: "bad" } }],
    ] as const) {
      await expect(
        anthropicErrorFormatCheck.run(
          mockContext({
            request: {
              json: vi.fn().mockResolvedValue(jsonResponse(status, body)),
              stream: vi.fn(),
            },
          }),
        ),
      ).resolves.toMatchObject({ status: "fail" });
    }
  });
});

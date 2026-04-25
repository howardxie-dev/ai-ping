import { describe, expect, it, vi } from "vitest";
import { openaiResponsesErrorFormatCheck } from "../src/profiles/openai-responses/checks/error-format";
import { openaiResponsesModelsListCheck } from "../src/profiles/openai-responses/checks/models-list";
import { openaiResponsesBasicCheck } from "../src/profiles/openai-responses/checks/responses-basic";
import { openaiResponsesStreamCheck } from "../src/profiles/openai-responses/checks/responses-stream";
import type {
  CheckContext,
  HttpJsonResponse,
  HttpStreamResponse,
} from "../src/types";

function mockContext(overrides: Partial<CheckContext> = {}): CheckContext {
  return {
    profile: "openai-responses",
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

describe("openaiResponsesModelsListCheck", () => {
  it("passes for a valid models list response", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          object: "list",
          data: [
            {
              id: "gpt-5.1-mini",
              object: "model",
              created: 1,
              owned_by: "openai",
            },
          ],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiResponsesModelsListCheck.run(
      mockContext({ request }),
    );

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "GET",
      path: "/models",
      timeoutMs: 1000,
    });
  });

  it("warns for empty data and missing recommended fields", async () => {
    const emptyRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { object: "list", data: [] })),
      stream: vi.fn(),
    };
    const sparseRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ id: "m" }] })),
      stream: vi.fn(),
    };

    await expect(
      openaiResponsesModelsListCheck.run(mockContext({ request: emptyRequest })),
    ).resolves.toMatchObject({ status: "warn" });
    const sparse = await openaiResponsesModelsListCheck.run(
      mockContext({ request: sparseRequest }),
    );

    expect(sparse.status).toBe("warn");
    expect(sparse.details?.missingRecommendedFields).toEqual([
      "object",
      "item.object",
      "item.created",
      "item.owned_by",
    ]);
  });

  it("fails for malformed model list responses", async () => {
    for (const body of [
      { object: "list" },
      { data: {} },
      { data: [{ id: 123 }] },
    ]) {
      const request = {
        json: vi.fn().mockResolvedValue(jsonResponse(200, body)),
        stream: vi.fn(),
      };
      const result = await openaiResponsesModelsListCheck.run(
        mockContext({ request }),
      );
      expect(result.status).toBe("fail");
    }

    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(500, { error: "oops" })),
      stream: vi.fn(),
    };
    const result = await openaiResponsesModelsListCheck.run(
      mockContext({ request }),
    );
    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/Expected 2xx/);
  });
});

describe("openaiResponsesBasicCheck", () => {
  it("passes with root output_text and sends a Responses body", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          id: "resp_1",
          object: "response",
          model: "test-model",
          status: "completed",
          usage: {},
          output_text: "pong",
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiResponsesBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "POST",
      path: "/responses",
      timeoutMs: 1000,
      body: {
        model: "test-model",
        input: "Reply with exactly: pong",
      },
    });
    expect(result.details?.totalTextLength).toBe(4);
  });

  it("passes with output content text", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          object: "response",
          model: "test-model",
          status: "completed",
          usage: {},
          output: [{ content: [{ type: "output_text", text: "pong" }] }],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiResponsesBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(result.details?.outputTextCount).toBe(1);
  });

  it("warns for empty output_text and missing recommended fields", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { output_text: "" })),
      stream: vi.fn(),
    };

    const result = await openaiResponsesBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "usage",
      "model",
      "status",
      "object",
      "output_text_empty",
    ]);
  });

  it("fails for invalid Responses output shapes", async () => {
    for (const body of [
      { output: {} },
      { output_text: 123 },
      { object: "response", output: [] },
    ]) {
      const request = {
        json: vi.fn().mockResolvedValue(jsonResponse(200, body)),
        stream: vi.fn(),
      };
      const result = await openaiResponsesBasicCheck.run(mockContext({ request }));
      expect(result.status).toBe("fail");
    }

    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(503, { error: "down" })),
      stream: vi.fn(),
    };
    const result = await openaiResponsesBasicCheck.run(mockContext({ request }));
    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/Expected 2xx/);
  });
});

describe("openaiResponsesStreamCheck", () => {
  it("passes for standard Responses SSE text deltas", async () => {
    const rawText = [
      'data: {"type":"response.created"}',
      'data: {"type":"response.output_text.delta","delta":"pong"}',
      'data: {"type":"response.completed"}',
    ].join("\n\n");
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(streamResponse(200, rawText)),
    };

    const result = await openaiResponsesStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.stream).toHaveBeenCalledWith({
      method: "POST",
      path: "/responses",
      timeoutMs: 1000,
      body: {
        model: "test-model",
        input: "Reply with exactly: pong",
        stream: true,
      },
    });
  });

  it("passes with completed event output and warns without text delta", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          'data: {"type":"response.completed","response":{"output_text":"pong"}}',
        ),
      ),
    };

    const result = await openaiResponsesStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toContain(
      "response.output_text.delta",
    );
  });

  it("warns with finalized output_text.done text and no delta", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          'data: {"type":"response.output_text.done","text":"pong"}',
        ),
      ),
    };

    const result = await openaiResponsesStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details).toMatchObject({
      totalTextLength: 4,
      textDeltaCount: 0,
    });
    expect(result.details?.missingRecommendedFields).toContain(
      "response.output_text.delta",
    );
  });

  it("warns for non-SSE content type, invalid JSON chunks, and missing completed", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          [
            'data: {"type":"response.output_text.delta","delta":"pong"}',
            "data: {",
          ].join("\n\n"),
          { "content-type": "application/json" },
        ),
      ),
    };

    const result = await openaiResponsesStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "content-type",
      "parseable_json",
      "response.completed",
    ]);
  });

  it("fails for invalid Responses streams", async () => {
    for (const rawText of [
      "",
      "data: {",
      'data: {"ok":true}',
      'data: {"type":"chat.completion.chunk"}',
      'data: {"type":"response.failed"}',
      'data: {"type":"response.completed"}',
    ]) {
      const request = {
        json: vi.fn(),
        stream: vi.fn().mockResolvedValue(streamResponse(200, rawText)),
      };
      const result = await openaiResponsesStreamCheck.run(mockContext({ request }));
      expect(result.status).toBe("fail");
    }

    const request = {
      json: vi.fn(),
      stream: vi
        .fn()
        .mockResolvedValue(streamResponse(500, 'data: {"type":"response.error"}')),
    };
    const result = await openaiResponsesStreamCheck.run(mockContext({ request }));
    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/Expected 2xx/);
  });
});

describe("openaiResponsesErrorFormatCheck", () => {
  it("passes for a standard OpenAI Responses error", async () => {
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

    const result = await openaiResponsesErrorFormatCheck.run(
      mockContext({ request }),
    );

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "POST",
      path: "/responses",
      timeoutMs: 1000,
      body: {},
    });
  });

  it("warns for parseable errors missing recommended metadata", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: { message: "Bad request", code: "bad_request" },
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiResponsesErrorFormatCheck.run(
      mockContext({ request }),
    );

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual(["type", "param"]);
  });

  it("fails for successful or malformed error responses", async () => {
    for (const [status, body] of [
      [200, { ok: true }],
      [400, {}],
      [400, { error: {} }],
      [400, { error: { message: "Bad" } }],
    ] as const) {
      const request = {
        json: vi.fn().mockResolvedValue(jsonResponse(status, body)),
        stream: vi.fn(),
      };
      const result = await openaiResponsesErrorFormatCheck.run(
        mockContext({ request }),
      );
      expect(result.status).toBe("fail");
    }
  });
});

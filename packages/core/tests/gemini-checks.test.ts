import { describe, expect, it, vi } from "vitest";
import { geminiErrorFormatCheck } from "../src/profiles/gemini/checks/error-format";
import { geminiGenerateBasicCheck } from "../src/profiles/gemini/checks/generate-basic";
import { geminiGenerateStreamCheck } from "../src/profiles/gemini/checks/generate-stream";
import { geminiModelsListCheck } from "../src/profiles/gemini/checks/models-list";
import { listChecks } from "../src/registry";
import type {
  CheckContext,
  HttpJsonResponse,
  HttpStreamResponse,
} from "../src/types";

function mockContext(overrides: Partial<CheckContext> = {}): CheckContext {
  return {
    profile: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
    apiKey: "gemini-key",
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

const generationResponse = {
  candidates: [
    {
      content: { parts: [{ text: "pong" }] },
      finishReason: "STOP",
    },
  ],
  usageMetadata: { totalTokenCount: 3 },
  modelVersion: "gemini-2.5-flash",
};

describe("geminiModelsListCheck", () => {
  it("passes for a valid models list response and sends x-goog-api-key", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
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
      ),
      stream: vi.fn(),
    };

    const result = await geminiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "GET",
      path: "/models",
      timeoutMs: 1000,
      headers: { "x-goog-api-key": "gemini-key" },
      skipDefaultAuth: true,
    });
  });

  it("warns when recommended fields are missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          models: [{ name: "models/gemini-2.5-flash" }],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await geminiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "version",
      "displayName",
      "supportedGenerationMethods",
      "supportedGenerationMethods.generateContent",
    ]);
  });

  it("warns when models is empty", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { models: [] })),
      stream: vi.fn(),
    };

    const result = await geminiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.message).toMatch(/empty models array/);
  });

  it("fails when models is missing or not an array", async () => {
    const missingRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, {})),
      stream: vi.fn(),
    };
    const invalidRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { models: {} })),
      stream: vi.fn(),
    };

    await expect(
      geminiModelsListCheck.run(mockContext({ request: missingRequest })),
    ).resolves.toMatchObject({ status: "fail" });
    await expect(
      geminiModelsListCheck.run(mockContext({ request: invalidRequest })),
    ).resolves.toMatchObject({ status: "fail" });
  });

  it("fails when no model item has a string name", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { models: [{ name: 1 }] })),
      stream: vi.fn(),
    };

    const result = await geminiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/string name/);
  });

  it("fails on non-2xx responses", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(403, { error: "forbidden" })),
      stream: vi.fn(),
    };

    const result = await geminiModelsListCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/Expected 2xx/);
  });
});

describe("geminiGenerateBasicCheck", () => {
  it("passes for a valid content generation response", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, generationResponse)),
      stream: vi.fn(),
    };

    const result = await geminiGenerateBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "POST",
      path: "/models/gemini-2.5-flash:generateContent",
      timeoutMs: 1000,
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: "Reply with exactly: pong" }],
          },
        ],
      },
      headers: { "x-goog-api-key": "gemini-key" },
      skipDefaultAuth: true,
    });
  });

  it("does not duplicate a models/ prefix in the model path", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, generationResponse)),
      stream: vi.fn(),
    };

    await geminiGenerateBasicCheck.run(
      mockContext({ model: "models/gemini-2.5-flash", request }),
    );

    expect(request.json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/models/gemini-2.5-flash:generateContent",
      }),
    );
  });

  it("warns when recommended fields are missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          candidates: [{ content: { parts: [{ text: "pong" }] } }],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await geminiGenerateBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "modelVersion",
      "usageMetadata",
      "finishReason",
    ]);
  });

  it("warns when text parts are empty strings", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          candidates: [
            { content: { parts: [{ text: "" }] }, finishReason: "STOP" },
          ],
          usageMetadata: {},
          modelVersion: "gemini-2.5-flash",
        }),
      ),
      stream: vi.fn(),
    };

    const result = await geminiGenerateBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.message).toMatch(/empty text/);
  });

  it("fails when candidates is missing or not an array", async () => {
    const missingRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, {})),
      stream: vi.fn(),
    };
    const invalidRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { candidates: {} })),
      stream: vi.fn(),
    };

    await expect(
      geminiGenerateBasicCheck.run(mockContext({ request: missingRequest })),
    ).resolves.toMatchObject({ status: "fail" });
    await expect(
      geminiGenerateBasicCheck.run(mockContext({ request: invalidRequest })),
    ).resolves.toMatchObject({ status: "fail" });
  });

  it("fails when there are no candidate parts or text parts", async () => {
    const noPartsRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { candidates: [{}] })),
      stream: vi.fn(),
    };
    const noTextRequest = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, { candidates: [{ content: { parts: [{}] } }] }),
      ),
      stream: vi.fn(),
    };

    await expect(
      geminiGenerateBasicCheck.run(mockContext({ request: noPartsRequest })),
    ).resolves.toMatchObject({ status: "fail" });
    await expect(
      geminiGenerateBasicCheck.run(mockContext({ request: noTextRequest })),
    ).resolves.toMatchObject({ status: "fail" });
  });
});

describe("geminiGenerateStreamCheck", () => {
  it("passes for valid Gemini SSE chunks", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          [
            'data: {"candidates":[{"content":{"parts":[{"text":"pong"}]},"finishReason":"STOP"}],"usageMetadata":{},"modelVersion":"gemini-2.5-flash"}',
            "data: [DONE]",
          ].join("\n"),
        ),
      ),
    };

    const result = await geminiGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.stream).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
        headers: { "x-goog-api-key": "gemini-key" },
        skipDefaultAuth: true,
      }),
    );
  });

  it("warns when content-type and recommended fields are missing", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          'data: {"candidates":[{"content":{"parts":[{"text":"pong"}]}}]}',
          { "content-type": "application/json" },
        ),
      ),
    };

    const result = await geminiGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "modelVersion",
      "usageMetadata",
      "content-type",
    ]);
  });

  it("passes without an OpenAI-style done marker", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          'data: {"candidates":[{"content":{"parts":[{"text":"pong"}]},"finishReason":"STOP"}],"usageMetadata":{},"modelVersion":"gemini-2.5-flash"}',
        ),
      ),
    };

    const result = await geminiGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(result.details?.missingRecommendedFields).toEqual([]);
  });

  it("warns when part of the stream is invalid JSON", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          [
            'data: {"candidates":[{"content":{"parts":[{"text":"pong"}]}}],"usageMetadata":{},"modelVersion":"gemini-2.5-flash"}',
            "data: not-json",
            "data: [DONE]",
          ].join("\n"),
        ),
      ),
    };

    const result = await geminiGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.invalidJsonLineCount).toBe(1);
  });

  it("fails when there are no SSE data chunks", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(streamResponse(200, "event: ping")),
    };

    const result = await geminiGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/SSE data chunk/);
  });

  it("fails when all chunks are invalid JSON", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(streamResponse(200, "data: not-json")),
    };

    const result = await geminiGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/parseable JSON/);
  });

  it("fails when no chunk has candidates or text parts", async () => {
    const noCandidatesRequest = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(streamResponse(200, 'data: {"ok":true}')),
    };
    const noTextRequest = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(200, 'data: {"candidates":[{"content":{"parts":[{}]}}]}'),
      ),
    };

    await expect(
      geminiGenerateStreamCheck.run(mockContext({ request: noCandidatesRequest })),
    ).resolves.toMatchObject({ status: "fail" });
    await expect(
      geminiGenerateStreamCheck.run(mockContext({ request: noTextRequest })),
    ).resolves.toMatchObject({ status: "fail" });
  });
});

describe("geminiErrorFormatCheck", () => {
  it("passes for a Gemini-style 4xx error response", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: {
            code: 400,
            message: "contents is required",
            status: "INVALID_ARGUMENT",
            details: [],
          },
        }),
      ),
      stream: vi.fn(),
    };

    const result = await geminiErrorFormatCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "POST",
      path: "/models/gemini-2.5-flash:generateContent",
      timeoutMs: 1000,
      body: {},
      headers: { "x-goog-api-key": "gemini-key" },
      skipDefaultAuth: true,
    });
  });

  it("warns when recommended error metadata is missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: { message: "contents is required", status: "INVALID_ARGUMENT" },
        }),
      ),
      stream: vi.fn(),
    };

    const result = await geminiErrorFormatCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual(["code"]);
  });

  it("passes when details is missing but code and status are present", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(400, {
          error: {
            code: 400,
            message: "contents is required",
            status: "INVALID_ARGUMENT",
          },
        }),
      ),
      stream: vi.fn(),
    };

    const result = await geminiErrorFormatCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(result.details?.missingRecommendedFields).toEqual([]);
  });

  it("fails when an invalid request returns 2xx", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, generationResponse)),
      stream: vi.fn(),
    };

    const result = await geminiErrorFormatCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/unexpectedly returned a 2xx/);
  });

  it("fails when error object or message is missing", async () => {
    const missingErrorRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(400, {})),
      stream: vi.fn(),
    };
    const missingMessageRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(400, { error: { code: 400 } })),
      stream: vi.fn(),
    };

    await expect(
      geminiErrorFormatCheck.run(mockContext({ request: missingErrorRequest })),
    ).resolves.toMatchObject({ status: "fail" });
    await expect(
      geminiErrorFormatCheck.run(mockContext({ request: missingMessageRequest })),
    ).resolves.toMatchObject({ status: "fail" });
  });
});

describe("gemini profile order", () => {
  it("lists Gemini checks in default order", () => {
    expect(listChecks("gemini").map((check) => check.id)).toEqual([
      "gemini.models.list",
      "gemini.generate.basic",
      "gemini.generate.stream",
      "gemini.error.format",
    ]);
  });
});

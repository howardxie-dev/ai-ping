import { describe, expect, it, vi } from "vitest";
import { ollamaGenerateBasicCheck } from "../src/profiles/ollama/checks/generate-basic";
import { ollamaGenerateStreamCheck } from "../src/profiles/ollama/checks/generate-stream";
import { ollamaTagsCheck } from "../src/profiles/ollama/checks/tags";
import type {
  CheckContext,
  HttpJsonResponse,
  HttpStreamResponse,
} from "../src/types";

function mockContext(overrides: Partial<CheckContext> = {}): CheckContext {
  return {
    profile: "ollama",
    baseUrl: "http://localhost:11434",
    model: "llama3.2",
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

function streamResponse(status: number, rawText: string): HttpStreamResponse {
  return {
    status,
    headers: { "content-type": "application/x-ndjson" },
    chunks: rawText.split(/\n/).filter(Boolean),
    done: true,
    rawText,
  };
}

describe("ollamaTagsCheck", () => {
  it("passes for a valid tags response", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
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
      ),
      stream: vi.fn(),
    };

    const result = await ollamaTagsCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "GET",
      path: "/api/tags",
      timeoutMs: 1000,
    });
  });

  it("warns for an empty models array", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { models: [] })),
      stream: vi.fn(),
    };

    const result = await ollamaTagsCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.message).toMatch(/empty models array/);
  });

  it("warns when recommended fields are missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, { models: [{ name: "llama3.2" }] }),
      ),
      stream: vi.fn(),
    };

    const result = await ollamaTagsCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "modified_at",
      "size",
      "digest",
    ]);
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
      ollamaTagsCheck.run(mockContext({ request: missingRequest })),
    ).resolves.toMatchObject({ status: "fail" });
    await expect(
      ollamaTagsCheck.run(mockContext({ request: invalidRequest })),
    ).resolves.toMatchObject({ status: "fail" });
  });

  it("fails when there is no string name", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { models: [{ name: 1 }] })),
      stream: vi.fn(),
    };

    const result = await ollamaTagsCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/string name/);
  });

  it("fails on non-2xx responses", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(500, { error: "oops" })),
      stream: vi.fn(),
    };

    const result = await ollamaTagsCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/Expected 2xx/);
  });
});

describe("ollamaGenerateBasicCheck", () => {
  it("passes for a valid generation response", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          response: "pong",
          done: true,
          total_duration: 1,
          eval_count: 1,
        }),
      ),
      stream: vi.fn(),
    };

    const result = await ollamaGenerateBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "POST",
      path: "/api/generate",
      timeoutMs: 1000,
      body: {
        model: "llama3.2",
        prompt: "Reply with exactly: pong",
        stream: false,
      },
    });
  });

  it("warns for an empty response string", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          response: "",
          done: true,
          total_duration: 1,
          eval_count: 1,
        }),
      ),
      stream: vi.fn(),
    };

    const result = await ollamaGenerateBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.message).toMatch(/empty response/);
  });

  it("warns when recommended fields are missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { response: "pong" })),
      stream: vi.fn(),
    };

    const result = await ollamaGenerateBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.missingRecommendedFields).toEqual([
      "done",
      "total_duration",
      "eval_count",
    ]);
  });

  it("fails when response is missing or not a string", async () => {
    const missingRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, {})),
      stream: vi.fn(),
    };
    const invalidRequest = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, { response: 1 })),
      stream: vi.fn(),
    };

    await expect(
      ollamaGenerateBasicCheck.run(mockContext({ request: missingRequest })),
    ).resolves.toMatchObject({ status: "fail" });
    await expect(
      ollamaGenerateBasicCheck.run(mockContext({ request: invalidRequest })),
    ).resolves.toMatchObject({ status: "fail" });
  });

  it("fails on non-2xx responses", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(404, { error: "missing" })),
      stream: vi.fn(),
    };

    const result = await ollamaGenerateBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/Expected 2xx/);
  });
});

describe("ollamaGenerateStreamCheck", () => {
  it("passes for valid JSON lines stream", async () => {
    const rawText = [
      '{"response":"po","done":false}',
      '{"response":"ng","done":true,"total_duration":1,"eval_count":1}',
    ].join("\n");
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(streamResponse(200, rawText)),
    };

    const result = await ollamaGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.stream).toHaveBeenCalledWith({
      method: "POST",
      path: "/api/generate",
      timeoutMs: 1000,
      body: {
        model: "llama3.2",
        prompt: "Reply with exactly: pong",
        stream: true,
      },
    });
  });

  it("warns when done true is missing", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(streamResponse(200, '{"response":"pong"}')),
    };

    const result = await ollamaGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.hasDone).toBe(false);
  });

  it("warns when part of the stream is invalid JSON", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          [
            '{"response":"po","done":false}',
            "not-json",
            '{"response":"ng","done":true,"total_duration":1,"eval_count":1}',
          ].join("\n"),
        ),
      ),
    };

    const result = await ollamaGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.invalidLineCount).toBe(1);
  });

  it("fails when there are no JSON objects", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(streamResponse(200, "not-json")),
    };

    const result = await ollamaGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/valid JSON line/);
  });

  it("fails when there is no response chunk", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(streamResponse(200, '{"done":true}')),
    };

    const result = await ollamaGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/string response/);
  });

  it("fails on non-2xx responses", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(streamResponse(500, '{"error":"oops"}')),
    };

    const result = await ollamaGenerateStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/Expected 2xx/);
  });
});

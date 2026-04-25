import { describe, expect, it, vi } from "vitest";
import { openaiToolCallsBasicCheck } from "../src/profiles/openai/checks/tool-calls-basic";
import { openaiToolCallsStreamCheck } from "../src/profiles/openai/checks/tool-calls-stream";
import {
  aggregateOpenAIToolCallDeltas,
  hasLegacyFunctionCall,
  parseToolArguments,
} from "../src/profiles/openai/tool-calls";
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

const toolCallResponse = {
  id: "chatcmpl-1",
  created: 1,
  model: "test-model",
  usage: {},
  choices: [
    {
      message: {
        tool_calls: [
          {
            id: "call_123",
            type: "function",
            function: {
              name: "get_weather",
              arguments: '{"location":"Tokyo"}',
            },
          },
        ],
      },
      finish_reason: "tool_calls",
    },
  ],
};

describe("OpenAI tool call helpers", () => {
  it("parses arguments and reports non-object values", () => {
    expect(parseToolArguments('{"location":"Tokyo"}')).toMatchObject({
      ok: true,
      valueType: "object",
      isObject: true,
      isEmptyObject: false,
    });
    expect(parseToolArguments("{}")).toMatchObject({
      ok: true,
      isObject: true,
      isEmptyObject: true,
    });
    expect(parseToolArguments("[]")).toMatchObject({
      ok: true,
      valueType: "array",
      isObject: false,
    });
    expect(parseToolArguments("{")).toMatchObject({ ok: false });
  });

  it("detects legacy function_call values", () => {
    expect(
      hasLegacyFunctionCall({
        choices: [{ message: { function_call: { name: "get_weather" } } }],
      }),
    ).toBe(true);
    expect(
      hasLegacyFunctionCall({
        choices: [{ delta: { function_call: { name: "get_weather" } } }],
      }),
    ).toBe(true);
  });

  it("aggregates streaming tool call deltas by index", () => {
    const result = aggregateOpenAIToolCallDeltas([
      {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: "call_123",
                  type: "function",
                  function: { name: "get_", arguments: '{"location"' },
                },
                {
                  function: { arguments: "ignored" },
                },
              ],
            },
          },
        ],
      },
      {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  function: { name: "weather", arguments: ':"Tokyo"}' },
                },
              ],
              function_call: { name: "legacy" },
            },
            finish_reason: "tool_calls",
          },
        ],
      },
    ]);

    expect(result.toolCallDeltaCount).toBe(3);
    expect(result.deltasMissingIndex).toBe(1);
    expect(result.hasLegacyFunctionCall).toBe(true);
    expect(result.hasFinishReasonToolCalls).toBe(true);
    expect(result.toolCalls).toEqual([
      {
        index: 0,
        id: "call_123",
        type: "function",
        functionName: "get_weather",
        functionArguments: '{"location":"Tokyo"}',
      },
    ]);
  });
});

describe("openaiToolCallsBasicCheck", () => {
  it("passes for standard modern tool_calls and sends tool payload", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(jsonResponse(200, toolCallResponse)),
      stream: vi.fn(),
    };

    const result = await openaiToolCallsBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.json).toHaveBeenCalledWith({
      method: "POST",
      path: "/chat/completions",
      timeoutMs: 1000,
      body: expect.objectContaining({
        model: "test-model",
        stream: false,
        tool_choice: {
          type: "function",
          function: { name: "get_weather" },
        },
      }),
    });
  });

  it("warns when the tool call is valid but recommended signals differ", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          ...toolCallResponse,
          id: undefined,
          created: undefined,
          model: undefined,
          usage: undefined,
          choices: [
            {
              message: {
                function_call: { name: "legacy" },
                tool_calls: [
                  {
                    id: "call_123",
                    type: "function",
                    function: {
                      name: "other_tool",
                      arguments: "{}",
                    },
                  },
                ],
              },
              finish_reason: "stop",
            },
          ],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiToolCallsBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.hasLegacyFunctionCall).toBe(true);
    expect(result.details?.hasExpectedToolName).toBe(false);
  });

  it("fails for legacy-only function_call responses", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(
        jsonResponse(200, {
          choices: [
            {
              message: {
                function_call: {
                  name: "get_weather",
                  arguments: '{"location":"Tokyo"}',
                },
              },
            },
          ],
        }),
      ),
      stream: vi.fn(),
    };

    const result = await openaiToolCallsBasicCheck.run(mockContext({ request }));

    expect(result.status).toBe("fail");
    expect(result.message).toMatch(/legacy function_call/);
  });

  it("fails when arguments are missing, invalid, or not an object", async () => {
    for (const args of [undefined, "{", "[]"]) {
      const request = {
        json: vi.fn().mockResolvedValue(
          jsonResponse(200, {
            choices: [
              {
                message: {
                  tool_calls: [
                    {
                      id: "call_123",
                      type: "function",
                      function: {
                        name: "get_weather",
                        ...(args === undefined ? {} : { arguments: args }),
                      },
                    },
                  ],
                },
              },
            ],
          }),
        ),
        stream: vi.fn(),
      };

      await expect(
        openaiToolCallsBasicCheck.run(mockContext({ request })),
      ).resolves.toMatchObject({ status: "fail" });
    }
  });
});

describe("openaiToolCallsStreamCheck", () => {
  it("passes for standard streaming tool_calls", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          [
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"get_weather","arguments":"{\\"location\\""}}]}}]}',
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":\\"Tokyo\\"}"}}]},"finish_reason":"tool_calls"}]}',
            "data: [DONE]",
          ].join("\n\n"),
        ),
      ),
    };

    const result = await openaiToolCallsStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("pass");
    expect(request.stream).toHaveBeenCalledWith({
      method: "POST",
      path: "/chat/completions",
      timeoutMs: 1000,
      body: expect.objectContaining({
        model: "test-model",
        stream: true,
      }),
    });
  });

  it("warns when recommended streaming signals are missing", async () => {
    const request = {
      json: vi.fn(),
      stream: vi.fn().mockResolvedValue(
        streamResponse(
          200,
          [
            'data: {"choices":[{"delta":{"tool_calls":[{"function":{"arguments":"ignored"}}]}}]}',
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"type":"function","function":{"name":"other_tool","arguments":"{}"}}],"function_call":{"name":"legacy"}}}]}',
          ].join("\n\n"),
          { "content-type": "application/json" },
        ),
      ),
    };

    const result = await openaiToolCallsStreamCheck.run(mockContext({ request }));

    expect(result.status).toBe("warn");
    expect(result.details?.deltasMissingIndex).toBe(1);
    expect(result.details?.hasLegacyFunctionCall).toBe(true);
    expect(result.details?.missingRecommendedFields).toEqual([
      "content-type",
      "done_marker",
      "finish_reason.tool_calls",
      "tool_calls.index",
      "legacy.function_call",
      "function.name",
      "function.arguments",
    ]);
  });

  it("fails when tool call deltas are absent or unindexed", async () => {
    for (const rawText of [
      'data: {"choices":[{"delta":{"content":"pong"}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"function":{"name":"get_weather","arguments":"{}"}}]}}]}',
      'data: {"choices":[{"delta":{"function_call":{"name":"get_weather"}}}]}',
    ]) {
      await expect(
        openaiToolCallsStreamCheck.run(
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

  it("fails when aggregated name or arguments are missing or invalid", async () => {
    for (const rawText of [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{}"}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"get_weather"}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"get_weather","arguments":"{"}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"get_weather","arguments":"[]"}}]}}]}',
    ]) {
      await expect(
        openaiToolCallsStreamCheck.run(
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

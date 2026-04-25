export const OPENAI_TOOL_CALL_TEST_PROMPT =
  "Call the get_weather tool with location Tokyo.";

export const OPENAI_TOOL_CALL_TEST_TOOL = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get weather for a location.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City name or location.",
        },
      },
      required: ["location"],
      additionalProperties: false,
    },
  },
} as const;

export const OPENAI_TOOL_CALL_TEST_TOOL_CHOICE = {
  type: "function",
  function: {
    name: "get_weather",
  },
} as const;

export interface ParsedToolArguments {
  ok: boolean;
  valueType?: string;
  isObject?: boolean;
  isEmptyObject?: boolean;
  errorMessage?: string;
}

export interface AggregatedOpenAIToolCall {
  index: number;
  id?: string;
  type?: string;
  functionName?: string;
  functionArguments: string;
}

export interface OpenAIToolCallAggregationResult {
  toolCalls: AggregatedOpenAIToolCall[];
  toolCallDeltaCount: number;
  deltasMissingIndex: number;
  hasLegacyFunctionCall: boolean;
  hasFinishReasonToolCalls: boolean;
}

export function toolCallsPayload(model: string, stream: boolean) {
  return {
    model,
    messages: [
      {
        role: "user",
        content: OPENAI_TOOL_CALL_TEST_PROMPT,
      },
    ],
    tools: [OPENAI_TOOL_CALL_TEST_TOOL],
    tool_choice: OPENAI_TOOL_CALL_TEST_TOOL_CHOICE,
    stream,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getStringField(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  return typeof value[key] === "string" ? value[key] : undefined;
}

export function getArrayField(
  value: Record<string, unknown>,
  key: string,
): unknown[] | undefined {
  return Array.isArray(value[key]) ? value[key] : undefined;
}

export function parseToolArguments(argumentsText: string): ParsedToolArguments {
  try {
    const parsed = JSON.parse(argumentsText) as unknown;
    const isObject = isRecord(parsed);
    return {
      ok: true,
      valueType: Array.isArray(parsed) ? "array" : typeof parsed,
      isObject,
      isEmptyObject: isObject && Object.keys(parsed).length === 0,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export function hasLegacyFunctionCall(value: unknown): boolean {
  if (!isRecord(value)) return false;

  if (isRecord(value.message) && isRecord(value.message.function_call)) {
    return true;
  }

  if (isRecord(value.delta) && isRecord(value.delta.function_call)) {
    return true;
  }

  if (Array.isArray(value.choices)) {
    return value.choices.some(hasLegacyFunctionCall);
  }

  return false;
}

export function aggregateOpenAIToolCallDeltas(
  jsonChunks: unknown[],
): OpenAIToolCallAggregationResult {
  const callsByIndex = new Map<number, AggregatedOpenAIToolCall>();
  let toolCallDeltaCount = 0;
  let deltasMissingIndex = 0;
  let hasLegacy = false;
  let hasFinishReasonToolCalls = false;

  for (const chunk of jsonChunks) {
    if (!isRecord(chunk) || !Array.isArray(chunk.choices)) continue;

    for (const choice of chunk.choices) {
      if (!isRecord(choice)) continue;

      if (choice.finish_reason === "tool_calls") {
        hasFinishReasonToolCalls = true;
      }

      if (!isRecord(choice.delta)) continue;
      if (isRecord(choice.delta.function_call)) hasLegacy = true;
      if (!Array.isArray(choice.delta.tool_calls)) continue;

      for (const delta of choice.delta.tool_calls) {
        if (!isRecord(delta)) continue;
        toolCallDeltaCount += 1;

        if (typeof delta.index !== "number") {
          deltasMissingIndex += 1;
          continue;
        }

        const call = callsByIndex.get(delta.index) ?? {
          index: delta.index,
          functionArguments: "",
        };

        if (typeof delta.id === "string") call.id = delta.id;
        if (typeof delta.type === "string") call.type = delta.type;

        if (isRecord(delta.function)) {
          if (typeof delta.function.name === "string") {
            call.functionName = `${call.functionName ?? ""}${delta.function.name}`;
          }
          if (typeof delta.function.arguments === "string") {
            call.functionArguments += delta.function.arguments;
          }
        }

        callsByIndex.set(delta.index, call);
      }
    }
  }

  return {
    toolCalls: [...callsByIndex.values()].sort((a, b) => a.index - b.index),
    toolCallDeltaCount,
    deltasMissingIndex,
    hasLegacyFunctionCall: hasLegacy,
    hasFinishReasonToolCalls,
  };
}

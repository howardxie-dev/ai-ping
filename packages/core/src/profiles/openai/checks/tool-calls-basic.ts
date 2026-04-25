import type { CheckContext, WireCheck } from "../../../types";
import {
  getArrayField,
  getStringField,
  hasLegacyFunctionCall,
  isRecord,
  parseToolArguments,
  toolCallsPayload,
} from "../tool-calls";
import { checkResult, failureMessage } from "./result";

const CHECK = {
  id: "openai.tool_calls.basic",
  title: "Basic tool calls",
  category: "tools",
  severity: "recommended",
} as const;

export const openaiToolCallsBasicCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json({
        method: "POST",
        path: "/chat/completions",
        timeoutMs: ctx.timeoutMs,
        body: toolCallsPayload(ctx.model, false),
      });
      const detailsBase = { status: response.status };

      if (response.status < 200 || response.status > 299) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: `Expected 2xx response, received ${response.status}.`,
          details: detailsBase,
          startedAt,
        });
      }

      if (!isRecord(response.body)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response body to be a JSON object.",
          details: detailsBase,
          startedAt,
        });
      }

      const choices = getArrayField(response.body, "choices");
      if (!choices) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.choices to be an array.",
          details: detailsBase,
          startedAt,
        });
      }

      const messages = choices
        .filter(isRecord)
        .map((choice) => choice.message)
        .filter(isRecord);
      const allToolCalls = messages.flatMap((message) =>
        getArrayField(message, "tool_calls") ?? [],
      );
      const hasLegacy = hasLegacyFunctionCall(response.body);
      const finishReason = choices.filter(isRecord).find((choice) =>
        "finish_reason" in choice
      )?.finish_reason;

      if (messages.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No choice with a message object was found.",
          details: {
            ...detailsBase,
            hasLegacyFunctionCall: hasLegacy,
          },
          startedAt,
        });
      }

      if (allToolCalls.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: hasLegacy
            ? "Received legacy function_call, but expected modern tool_calls."
            : "No modern message.tool_calls were found.",
          details: {
            ...detailsBase,
            hasLegacyFunctionCall: hasLegacy,
          },
          startedAt,
        });
      }

      const evaluations = allToolCalls.map(evaluateToolCall);
      const valid = evaluations.filter((evaluation) => evaluation.valid);
      const firstValid = valid[0];
      const missingRecommendedFields = missingRecommended(response.body);
      if (finishReason !== "tool_calls") {
        missingRecommendedFields.push("finish_reason.tool_calls");
      }
      if (hasLegacy) missingRecommendedFields.push("legacy.function_call");

      const details = {
        ...detailsBase,
        toolCallCount: allToolCalls.length,
        validToolCallCount: valid.length,
        hasExpectedToolName: valid.some((evaluation) => evaluation.hasExpectedToolName),
        argumentsParseable: evaluations.some((evaluation) => evaluation.argumentsParseable),
        parsedArgumentsType: firstValid?.parsedArgumentsType,
        hasLegacyFunctionCall: hasLegacy,
        finishReason,
        missingRecommendedFields,
      };

      if (!firstValid) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: firstFailureMessage(evaluations),
          details,
          startedAt,
        });
      }

      if (!firstValid.hasExpectedToolName || firstValid.argumentsEmptyObject) {
        missingRecommendedFields.push(
          !firstValid.hasExpectedToolName ? "function.name" : "function.arguments",
        );
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: missingRecommendedFields.length > 0 ? "warn" : "pass",
        message:
          missingRecommendedFields.length > 0
            ? "Tool calls response is valid, but recommended tool call signals are missing."
            : "Tool calls response has the expected modern shape.",
        details,
        startedAt,
      });
    } catch (error) {
      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "fail",
        message: failureMessage(error),
        startedAt,
      });
    }
  },
};

interface ToolCallEvaluation {
  valid: boolean;
  message?: string;
  hasExpectedToolName: boolean;
  argumentsParseable: boolean;
  parsedArgumentsType?: string;
  argumentsEmptyObject?: boolean;
}

function evaluateToolCall(toolCall: unknown): ToolCallEvaluation {
  if (!isRecord(toolCall)) return invalid("Tool call is not an object.");
  if (typeof toolCall.id !== "string") return invalid("Tool call id is missing.");
  if (toolCall.type !== "function") return invalid("Tool call type is not function.");
  if (!isRecord(toolCall.function)) return invalid("Tool call function is missing.");

  const name = getStringField(toolCall.function, "name");
  if (!name) return invalid("Tool call function name is missing.");

  const args = getStringField(toolCall.function, "arguments");
  if (args === undefined) return invalid("Tool call function arguments are missing.");

  const parsed = parseToolArguments(args);
  if (!parsed.ok) {
    return {
      ...invalid("Tool call function arguments are not valid JSON."),
      argumentsParseable: false,
    };
  }
  if (!parsed.isObject) {
    return {
      ...invalid("Tool call function arguments JSON is not an object."),
      argumentsParseable: true,
      parsedArgumentsType: parsed.valueType,
    };
  }

  return {
    valid: true,
    hasExpectedToolName: name === "get_weather",
    argumentsParseable: true,
    parsedArgumentsType: parsed.valueType,
    argumentsEmptyObject: parsed.isEmptyObject,
  };
}

function invalid(message: string): ToolCallEvaluation {
  return {
    valid: false,
    message,
    hasExpectedToolName: false,
    argumentsParseable: false,
  };
}

function firstFailureMessage(evaluations: ToolCallEvaluation[]): string {
  return evaluations.find((evaluation) => evaluation.message)?.message ??
    "No valid tool call was found.";
}

function missingRecommended(body: Record<string, unknown>): string[] {
  const missing: string[] = [];

  for (const field of ["id", "created", "model", "usage"]) {
    if (!(field in body)) missing.push(field);
  }

  return missing;
}

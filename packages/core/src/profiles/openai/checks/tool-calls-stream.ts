import { parseSseStream } from "../../../sse";
import type { CheckContext, WireCheck } from "../../../types";
import {
  aggregateOpenAIToolCallDeltas,
  parseToolArguments,
  toolCallsPayload,
} from "../tool-calls";
import { checkResult, failureMessage } from "./result";

const CHECK = {
  id: "openai.tool_calls.stream",
  title: "Streaming tool calls",
  category: "tools",
  severity: "recommended",
} as const;

export const openaiToolCallsStreamCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.stream({
        method: "POST",
        path: "/chat/completions",
        timeoutMs: ctx.timeoutMs,
        body: toolCallsPayload(ctx.model, true),
      });
      const contentType = response.headers["content-type"];
      const parsed = parseSseStream(response.rawText);
      const aggregation = aggregateOpenAIToolCallDeltas(parsed.jsonChunks);
      const firstCall = aggregation.toolCalls[0];
      const parsedArgs = firstCall?.functionArguments
        ? parseToolArguments(firstCall.functionArguments)
        : undefined;
      const missingRecommendedFields: string[] = [];

      if (!contentType?.includes("text/event-stream")) {
        missingRecommendedFields.push("content-type");
      }
      if (!parsed.hasDoneMarker) missingRecommendedFields.push("done_marker");
      if (!aggregation.hasFinishReasonToolCalls) {
        missingRecommendedFields.push("finish_reason.tool_calls");
      }
      if (aggregation.deltasMissingIndex > 0) {
        missingRecommendedFields.push("tool_calls.index");
      }
      if (aggregation.hasLegacyFunctionCall) {
        missingRecommendedFields.push("legacy.function_call");
      }

      const hasExpectedToolName = aggregation.toolCalls.some(
        (call) => call.functionName === "get_weather",
      );
      if (firstCall && firstCall.functionName !== "get_weather") {
        missingRecommendedFields.push("function.name");
      }
      if (parsedArgs?.isEmptyObject) missingRecommendedFields.push("function.arguments");

      const details = {
        status: response.status,
        contentType,
        dataChunkCount: parsed.dataLines.length,
        jsonChunkCount: parsed.jsonChunks.length,
        toolCallDeltaCount: aggregation.toolCallDeltaCount,
        aggregatedToolCallCount: aggregation.toolCalls.length,
        deltasMissingIndex: aggregation.deltasMissingIndex,
        hasDoneMarker: parsed.hasDoneMarker,
        hasFinishReasonToolCalls: aggregation.hasFinishReasonToolCalls,
        hasExpectedToolName,
        argumentsParseable: Boolean(parsedArgs?.ok),
        parsedArgumentsType: parsedArgs?.valueType,
        hasLegacyFunctionCall: aggregation.hasLegacyFunctionCall,
        missingRecommendedFields,
      };

      if (response.status < 200 || response.status > 299) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: `Expected 2xx response, received ${response.status}.`,
          details,
          startedAt,
        });
      }

      if (parsed.dataLines.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Stream response did not include any SSE data chunks.",
          details,
          startedAt,
        });
      }

      if (parsed.jsonChunks.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Stream response did not include any parseable JSON chunks.",
          details,
          startedAt,
        });
      }

      if (aggregation.toolCallDeltaCount === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: aggregation.hasLegacyFunctionCall
            ? "Received legacy function_call deltas, but expected modern tool_calls."
            : "No modern delta.tool_calls were found.",
          details,
          startedAt,
        });
      }

      if (aggregation.toolCalls.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No indexed tool call deltas could be aggregated.",
          details,
          startedAt,
        });
      }

      if (!firstCall?.functionName) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No aggregated tool call included a function name.",
          details,
          startedAt,
        });
      }

      if (!firstCall.functionArguments) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No aggregated tool call included function arguments.",
          details,
          startedAt,
        });
      }

      if (!parsedArgs?.ok) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Aggregated tool call function arguments are not valid JSON.",
          details,
          startedAt,
        });
      }

      if (!parsedArgs.isObject) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Aggregated tool call function arguments JSON is not an object.",
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: missingRecommendedFields.length > 0 ? "warn" : "pass",
        message:
          missingRecommendedFields.length > 0
            ? "Streaming tool calls response is valid, but recommended tool call signals are missing."
            : "Streaming tool calls response has the expected modern shape.",
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

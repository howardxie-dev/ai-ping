import { parseSseStream } from "../../../sse";
import type { CheckContext, WireCheck } from "../../../types";
import {
  checkResult,
  collectCompletedResponseTexts,
  failureMessage,
  isRecord,
  responsesPayload,
  summarizeResponseStreamEvents,
} from "../utils";

const CHECK = {
  id: "openai-responses.responses.stream",
  title: "Streaming response",
  category: "streaming",
  severity: "required",
} as const;

export const openaiResponsesStreamCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.stream({
        method: "POST",
        path: "/responses",
        timeoutMs: ctx.timeoutMs,
        body: responsesPayload(ctx.model, true),
      });
      const contentType = response.headers["content-type"];
      const parsed = parseSseStream(response.rawText);
      const summary = summarizeResponseStreamEvents(parsed.jsonChunks);
      const hasStringType = parsed.jsonChunks.some(
        (chunk) => isRecord(chunk) && typeof chunk.type === "string",
      );
      const hasCompletedOutput = parsed.jsonChunks.some(
        (chunk) => collectCompletedResponseTexts(chunk).length > 0,
      );
      const details = {
        status: response.status,
        contentType,
        dataChunkCount: parsed.dataLines.length,
        jsonChunkCount: parsed.jsonChunks.length,
        invalidJsonLineCount: parsed.invalidJsonLines.length,
        eventCount: summary.eventCount,
        responsesEventCount: summary.responsesEventCount,
        textDeltaCount: summary.textDeltaCount,
        totalTextLength: summary.totalTextLength,
        hasResponseCreated: summary.hasResponseCreated,
        hasResponseCompleted: summary.hasResponseCompleted,
        hasResponseFailed: summary.hasResponseFailed,
        hasResponseError: summary.hasResponseError,
        eventTypes: summary.eventTypes,
        missingRecommendedFields: collectMissingRecommendedFields(
          contentType,
          parsed.invalidJsonLines.length,
          summary,
          hasCompletedOutput,
        ),
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
      if (!hasStringType) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No stream chunk included a string type field.",
          details,
          startedAt,
        });
      }
      if (summary.responsesEventCount === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No Responses-style stream event was detected.",
          details,
          startedAt,
        });
      }
      if (
        (summary.hasResponseFailed || summary.hasResponseError) &&
        summary.textDeltaCount === 0 &&
        !hasCompletedOutput
      ) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Stream reported a response failure without usable output.",
          details,
          startedAt,
        });
      }
      if (summary.textDeltaCount === 0 && !hasCompletedOutput) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Stream did not include text deltas or completed response output.",
          details,
          startedAt,
        });
      }

      const missingRecommendedFields = details.missingRecommendedFields as string[];
      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: missingRecommendedFields.length > 0 ? "warn" : "pass",
        message:
          missingRecommendedFields.length > 0
            ? "Responses stream is parseable, but recommended SSE signals are missing."
            : "Responses stream has semantic events with usable text output.",
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

function collectMissingRecommendedFields(
  contentType: string | undefined,
  invalidJsonLineCount: number,
  summary: ReturnType<typeof summarizeResponseStreamEvents>,
  hasCompletedOutput: boolean,
): string[] {
  const missing: string[] = [];
  if (!contentType?.includes("text/event-stream")) missing.push("content-type");
  if (invalidJsonLineCount > 0) missing.push("parseable_json");
  if (!summary.hasResponseCompleted && summary.textDeltaCount > 0) {
    missing.push("response.completed");
  }
  if (summary.textDeltaCount === 0 && hasCompletedOutput) {
    missing.push("response.output_text.delta");
  }
  if (summary.unknownResponseEventTypes.length > 0) {
    missing.push("known_response_event_type");
  }
  return missing;
}

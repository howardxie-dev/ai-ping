import { parseSseStream } from "../../../sse";
import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";
import {
  anthropicRequest,
  collectTextDeltas,
  hasAnthropicEvent,
  messagesBody,
} from "./shared";

const CHECK = {
  id: "anthropic.messages.stream",
  title: "Streaming message",
  category: "streaming",
  severity: "required",
} as const;

export const anthropicMessagesStreamCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.stream(
        anthropicRequest(ctx, {
          method: "POST",
          path: "/messages",
          timeoutMs: ctx.timeoutMs,
          body: messagesBody(ctx.model, { stream: true }),
        }),
      );
      const parsed = parseSseStream(response.rawText);
      const records = parsed.jsonChunks.filter(isRecord);
      const eventRecords = records.filter(hasAnthropicEvent);
      const textDeltas = collectTextDeltas(records);
      const hasMessageStop = records.some((record) => record.type === "message_stop");
      const hasLifecycle =
        records.some((record) => record.type === "message_start") && hasMessageStop;
      const missingRecommendedFields: string[] = [];
      const contentType = response.headers["content-type"] ?? "";
      if (!contentType.toLowerCase().includes("text/event-stream")) {
        missingRecommendedFields.push("content-type");
      }
      if (!hasMessageStop) missingRecommendedFields.push("message_stop");

      const details = {
        status: response.status,
        dataLineCount: parsed.dataLines.length,
        jsonChunkCount: parsed.jsonChunks.length,
        invalidJsonLineCount: parsed.invalidJsonLines.length,
        anthropicEventCount: eventRecords.length,
        textDeltaCount: textDeltas.length,
        hasNonEmptyText: textDeltas.some((text) => text.length > 0),
        hasLifecycle,
        hasMessageStop,
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
          message: "Expected at least one SSE data chunk.",
          details,
          startedAt,
        });
      }

      if (records.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected at least one parseable JSON SSE chunk.",
          details,
          startedAt,
        });
      }

      if (eventRecords.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No Anthropic stream event type was found.",
          details,
          startedAt,
        });
      }

      if (textDeltas.length === 0 && !hasLifecycle) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No text delta or complete message lifecycle was found.",
          details,
          startedAt,
        });
      }

      if (
        parsed.invalidJsonLines.length > 0 ||
        missingRecommendedFields.length > 0 ||
        textDeltas.length === 0 ||
        !details.hasNonEmptyText
      ) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: "Streaming message response is valid, but some recommended stream metadata is missing.",
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Streaming message response is valid.",
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

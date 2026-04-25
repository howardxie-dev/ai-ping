import { parseSseStream } from "../../../sse";
import type { CheckContext, WireCheck } from "../../../types";
import { chatCompletionPayload } from "../payloads";
import { checkResult, failureMessage, isRecord } from "./result";

const CHECK = {
  id: "openai-chat.chat.stream",
  aliases: ["openai.chat.stream"],
  title: "Streaming chat completion",
  category: "streaming",
  severity: "required",
} as const;

export const openaiChatStreamCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.stream({
        method: "POST",
        path: "/chat/completions",
        body: chatCompletionPayload(ctx.model, true),
      });
      const contentType = response.headers["content-type"] ?? "";
      const parsed = parseSseStream(response.rawText);
      const hasChoices = parsed.jsonChunks.some(hasChoicesArray);
      const hasDelta = parsed.jsonChunks.some(hasDeltaObject);
      const details = {
        status: response.status,
        contentType,
        dataChunkCount: parsed.dataLines.length,
        jsonChunkCount: parsed.jsonChunks.length,
        hasDoneMarker: parsed.hasDoneMarker,
        hasDelta,
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

      if (!hasChoices) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No stream chunk included a choices array.",
          details,
          startedAt,
        });
      }

      if (!hasDelta) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No stream chunk included choices[0].delta.",
          details,
          startedAt,
        });
      }

      const warnings: string[] = [];
      if (!contentType.includes("text/event-stream")) {
        warnings.push("content-type");
      }
      if (!parsed.hasDoneMarker) warnings.push("done_marker");

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: warnings.length > 0 ? "warn" : "pass",
        message:
          warnings.length > 0
            ? "Streaming response is parseable, but recommended SSE signals are missing."
            : "Streaming response has parseable SSE chunks with chat deltas.",
        details: {
          ...details,
          missingRecommendedFields: warnings,
        },
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

function hasChoicesArray(chunk: unknown): boolean {
  return (
    isRecord(chunk) &&
    Array.isArray(chunk.choices) &&
    chunk.choices.length > 0
  );
}

function hasDeltaObject(chunk: unknown): boolean {
  if (!hasChoicesArray(chunk)) return false;
  const choices = (chunk as { choices: unknown[] }).choices;
  const firstChoice = choices[0];
  return isRecord(firstChoice) && isRecord(firstChoice.delta);
}

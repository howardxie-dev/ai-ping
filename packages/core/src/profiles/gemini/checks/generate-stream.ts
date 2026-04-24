import { parseSseStream } from "../../../sse";
import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";
import {
  collectTextParts,
  geminiModelPath,
  geminiRequest,
  generateContentBody,
} from "./shared";

const CHECK = {
  id: "gemini.generate.stream",
  title: "Streaming content generation",
  category: "streaming",
  severity: "required",
} as const;

export const geminiGenerateStreamCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.stream(
        geminiRequest(ctx, {
          method: "POST",
          path: `${geminiModelPath(ctx.model, "streamGenerateContent")}?alt=sse`,
          timeoutMs: ctx.timeoutMs,
          body: generateContentBody(),
        }),
      );
      const parsed = parseSseStream(response.rawText);
      const records = parsed.jsonChunks.filter(isRecord);
      const chunksWithCandidates = records.filter(
        (record) => Array.isArray(record.candidates),
      ).length;
      const textParts = records.flatMap(collectTextParts);
      const missingRecommendedFields = collectMissingRecommendedFields(records);
      const contentType = response.headers["content-type"] ?? "";
      if (!contentType.toLowerCase().includes("text/event-stream")) {
        missingRecommendedFields.push("content-type");
      }
      const details = {
        status: response.status,
        dataLineCount: parsed.dataLines.length,
        jsonChunkCount: parsed.jsonChunks.length,
        invalidJsonLineCount: parsed.invalidJsonLines.length,
        chunksWithCandidates,
        textPartCount: textParts.length,
        hasNonEmptyText: textParts.some((text) => text.length > 0),
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

      if (chunksWithCandidates === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No SSE chunk with a candidates array was found.",
          details,
          startedAt,
        });
      }

      if (textParts.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No text part was found in stream candidates.",
          details,
          startedAt,
        });
      }

      if (!details.hasNonEmptyText) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: "Streaming content generation response has only empty text parts.",
          details,
          startedAt,
        });
      }

      if (parsed.invalidJsonLines.length > 0 || missingRecommendedFields.length > 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: `Streaming content generation response is valid, but recommended fields are missing: ${missingRecommendedFields.join(", ")}.`,
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Streaming content generation response is valid.",
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
  records: Record<string, unknown>[],
): string[] {
  const missing = new Set<string>();

  for (const record of records) {
    if (typeof record.modelVersion !== "string") missing.add("modelVersion");
    if (!isRecord(record.usageMetadata)) missing.add("usageMetadata");
  }

  return [...missing];
}

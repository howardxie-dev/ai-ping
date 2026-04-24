import { parseJsonLines } from "../../../json-lines";
import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";

const CHECK = {
  id: "ollama.generate.stream",
  title: "Streaming generation",
  category: "streaming",
  severity: "required",
} as const;

export const ollamaGenerateStreamCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.stream({
        method: "POST",
        path: "/api/generate",
        timeoutMs: ctx.timeoutMs,
        body: {
          model: ctx.model,
          prompt: "Reply with exactly: pong",
          stream: true,
        },
      });
      const parsed = parseJsonLines(response.rawText);
      const records = parsed.jsonObjects.filter(isRecord);
      const responseChunkCount = records.filter(
        (item) => typeof item.response === "string",
      ).length;
      const hasDone = records.some((item) => item.done === true);
      const missingRecommendedFields = collectMissingRecommendedFields(records);
      const details = {
        status: response.status,
        lineCount: parsed.lines.length,
        jsonObjectCount: parsed.jsonObjects.length,
        invalidLineCount: parsed.invalidLines.length,
        responseChunkCount,
        hasDone,
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

      if (parsed.jsonObjects.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected at least one valid JSON line.",
          details,
          startedAt,
        });
      }

      if (responseChunkCount === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No JSON line with a string response field was found.",
          details,
          startedAt,
        });
      }

      if (
        !hasDone ||
        parsed.invalidLines.length > 0 ||
        missingRecommendedFields.length > 0
      ) {
        const reasons = [
          !hasDone ? "done true marker" : undefined,
          parsed.invalidLines.length > 0 ? "valid JSON lines for every chunk" : undefined,
          missingRecommendedFields.length > 0
            ? `recommended fields: ${missingRecommendedFields.join(", ")}`
            : undefined,
        ].filter((reason): reason is string => Boolean(reason));

        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: `Streaming generation response is valid, but missing ${reasons.join("; ")}.`,
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Streaming generation response is valid.",
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
  const finalChunk = records.find((item) => item.done === true);
  if (!finalChunk) return [];

  const missing: string[] = [];
  if (typeof finalChunk.total_duration !== "number") missing.push("total_duration");
  if (typeof finalChunk.eval_count !== "number") missing.push("eval_count");
  return missing;
}

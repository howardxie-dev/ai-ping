import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";

const CHECK = {
  id: "ollama.generate.basic",
  title: "Basic generation",
  category: "generation",
  severity: "required",
} as const;

export const ollamaGenerateBasicCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json({
        method: "POST",
        path: "/api/generate",
        timeoutMs: ctx.timeoutMs,
        body: {
          model: ctx.model,
          prompt: "Reply with exactly: pong",
          stream: false,
        },
      });
      const detailsBase = {
        status: response.status,
      };

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

      if (!("response" in response.body) || typeof response.body.response !== "string") {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.response to be a string.",
          details: detailsBase,
          startedAt,
        });
      }

      const missingRecommendedFields = collectMissingRecommendedFields(response.body);
      const details = {
        ...detailsBase,
        hasResponse: response.body.response.length > 0,
        responseLength: response.body.response.length,
        hasDone: typeof response.body.done === "boolean",
        missingRecommendedFields,
      };

      if (response.body.response.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: "Basic generation response has an empty response string.",
          details,
          startedAt,
        });
      }

      if (missingRecommendedFields.length > 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: `Basic generation response is valid, but recommended fields are missing: ${missingRecommendedFields.join(", ")}.`,
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Basic generation response is valid.",
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

function collectMissingRecommendedFields(body: Record<string, unknown>): string[] {
  const missing: string[] = [];

  if (typeof body.done !== "boolean") missing.push("done");
  if (typeof body.total_duration !== "number") missing.push("total_duration");
  if (typeof body.eval_count !== "number") missing.push("eval_count");

  return missing;
}

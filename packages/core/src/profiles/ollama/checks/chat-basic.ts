import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";

const CHECK = {
  id: "ollama.chat.basic",
  title: "Basic chat",
  category: "generation",
  severity: "required",
} as const;

export const ollamaChatBasicCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json({
        method: "POST",
        path: "/api/chat",
        timeoutMs: ctx.timeoutMs,
        body: {
          model: ctx.model,
          messages: [{ role: "user", content: "Reply with exactly: pong" }],
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

      if (!isRecord(response.body.message)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.message to be a JSON object.",
          details: detailsBase,
          startedAt,
        });
      }

      if (typeof response.body.message.content !== "string") {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.message.content to be a string.",
          details: detailsBase,
          startedAt,
        });
      }

      const missingRecommendedFields = collectMissingRecommendedFields(response.body);
      const details = {
        ...detailsBase,
        hasMessage: true,
        hasRole: typeof response.body.message.role === "string",
        contentLength: response.body.message.content.length,
        hasDone: typeof response.body.done === "boolean",
        missingRecommendedFields,
      };

      if (response.body.message.content.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: "Basic chat response has an empty message content string.",
          details,
          startedAt,
        });
      }

      if (missingRecommendedFields.length > 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: `Basic chat response is valid, but recommended fields are missing: ${missingRecommendedFields.join(", ")}.`,
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Basic chat response is valid.",
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
  if (typeof body.model !== "string") missing.push("model");
  if (typeof body.created_at !== "string") missing.push("created_at");
  if (isRecord(body.message) && typeof body.message.role !== "string") {
    missing.push("message.role");
  }

  return missing;
}

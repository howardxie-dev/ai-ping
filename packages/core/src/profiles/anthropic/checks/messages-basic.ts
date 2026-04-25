import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";
import { anthropicRequest, collectTextBlocks, messagesBody } from "./shared";

const CHECK = {
  id: "anthropic.messages.basic",
  title: "Basic message",
  category: "generation",
  severity: "required",
} as const;

export const anthropicMessagesBasicCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json(
        anthropicRequest(ctx, {
          method: "POST",
          path: "/messages",
          timeoutMs: ctx.timeoutMs,
          body: messagesBody(ctx.model),
        }),
      );
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

      if (!("content" in response.body) || !Array.isArray(response.body.content)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.content to be an array.",
          details: detailsBase,
          startedAt,
        });
      }

      const textBlocks = collectTextBlocks(response.body);
      const missingRecommendedFields = collectMissingRecommendedFields(response.body);
      const details = {
        ...detailsBase,
        contentBlockCount: response.body.content.length,
        textBlockCount: textBlocks.length,
        hasNonEmptyText: textBlocks.some((text) => text.length > 0),
        missingRecommendedFields,
      };

      if (response.body.content.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected at least one content block.",
          details,
          startedAt,
        });
      }

      if (textBlocks.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No text block was found in response content.",
          details,
          startedAt,
        });
      }

      if (!details.hasNonEmptyText) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: "Basic message response has only empty text blocks.",
          details,
          startedAt,
        });
      }

      if (missingRecommendedFields.length > 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: `Basic message response is valid, but recommended fields are missing: ${missingRecommendedFields.join(", ")}.`,
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Basic message response is valid.",
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
  const missing = new Set<string>();

  if (typeof body.id !== "string") missing.add("id");
  if (typeof body.type !== "string") missing.add("type");
  if (typeof body.role !== "string") missing.add("role");
  if (typeof body.model !== "string") missing.add("model");
  if (typeof body.stop_reason !== "string") missing.add("stop_reason");
  if (!isRecord(body.usage)) missing.add("usage");

  return [...missing];
}

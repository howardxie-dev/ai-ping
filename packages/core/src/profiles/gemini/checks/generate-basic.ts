import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";
import {
  collectTextParts,
  geminiModelPath,
  geminiRequest,
  generateContentBody,
  hasCandidateParts,
} from "./shared";

const CHECK = {
  id: "gemini.generate.basic",
  title: "Basic content generation",
  category: "generation",
  severity: "required",
} as const;

export const geminiGenerateBasicCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json(
        geminiRequest(ctx, {
          method: "POST",
          path: geminiModelPath(ctx.model, "generateContent"),
          timeoutMs: ctx.timeoutMs,
          body: generateContentBody(),
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

      if (!("candidates" in response.body) || !Array.isArray(response.body.candidates)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.candidates to be an array.",
          details: detailsBase,
          startedAt,
        });
      }

      const textParts = collectTextParts(response.body);
      const missingRecommendedFields = collectMissingRecommendedFields(response.body);
      const details = {
        ...detailsBase,
        candidateCount: response.body.candidates.length,
        hasCandidateParts: hasCandidateParts(response.body),
        textPartCount: textParts.length,
        hasNonEmptyText: textParts.some((text) => text.length > 0),
        missingRecommendedFields,
      };

      if (response.body.candidates.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected at least one candidate.",
          details,
          startedAt,
        });
      }

      if (!details.hasCandidateParts) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No candidate with content.parts was found.",
          details,
          startedAt,
        });
      }

      if (textParts.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No text part was found in response candidates.",
          details,
          startedAt,
        });
      }

      if (!details.hasNonEmptyText) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: "Basic content generation response has only empty text parts.",
          details,
          startedAt,
        });
      }

      if (missingRecommendedFields.length > 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: `Basic content generation response is valid, but recommended fields are missing: ${missingRecommendedFields.join(", ")}.`,
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Basic content generation response is valid.",
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

  if (typeof body.modelVersion !== "string") missing.add("modelVersion");
  if (!isRecord(body.usageMetadata)) missing.add("usageMetadata");

  if (Array.isArray(body.candidates)) {
    for (const candidate of body.candidates) {
      if (!isRecord(candidate) || typeof candidate.finishReason !== "string") {
        missing.add("finishReason");
      }
    }
  }

  return [...missing];
}

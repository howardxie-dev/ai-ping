import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";
import { geminiModelPath, geminiRequest } from "./shared";

const CHECK = {
  id: "gemini.error.format",
  title: "Error response format",
  category: "errors",
  severity: "recommended",
} as const;

export const geminiErrorFormatCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json(
        geminiRequest(ctx, {
          method: "POST",
          path: geminiModelPath(ctx.model, "generateContent"),
          timeoutMs: ctx.timeoutMs,
          body: {},
        }),
      );
      const detailsBase = { status: response.status };

      if (response.status >= 200 && response.status <= 299) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Invalid request unexpectedly returned a 2xx response.",
          details: detailsBase,
          startedAt,
        });
      }

      if (!isRecord(response.body)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected error response body to be a JSON object.",
          details: detailsBase,
          startedAt,
        });
      }

      const errorBody = response.body.error;
      if (!isRecord(errorBody)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.error to be a JSON object.",
          details: detailsBase,
          startedAt,
        });
      }

      if (typeof errorBody.message !== "string") {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.error.message to be a string.",
          details: detailsBase,
          startedAt,
        });
      }

      const hasCode = typeof errorBody.code === "number";
      const hasStatus = typeof errorBody.status === "string";
      if (!hasCode && !hasStatus) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.error.code or response.error.status.",
          details: detailsBase,
          startedAt,
        });
      }

      const missingRecommendedFields = ["code", "status", "details"].filter(
        (field) => !(field in errorBody),
      );
      const shouldWarn =
        response.status < 400 ||
        response.status > 499 ||
        missingRecommendedFields.length > 0;

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: shouldWarn ? "warn" : "pass",
        message: shouldWarn
          ? "Error response is parseable, but recommended Gemini error metadata is missing or status is not 4xx."
          : "Error response has the expected Gemini shape.",
        details: {
          ...detailsBase,
          hasErrorObject: true,
          hasMessage: true,
          hasCode,
          hasStatus,
          missingRecommendedFields,
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

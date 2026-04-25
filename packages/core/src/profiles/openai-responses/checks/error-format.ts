import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "../utils";

const CHECK = {
  id: "openai-responses.error.format",
  title: "Error response format",
  category: "errors",
  severity: "recommended",
} as const;

export const openaiResponsesErrorFormatCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json({
        method: "POST",
        path: "/responses",
        timeoutMs: ctx.timeoutMs,
        body: {},
      });
      const detailsBase = { status: response.status };

      if (response.status >= 200 && response.status <= 299) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Invalid request unexpectedly returned a 2xx response.",
          details: {
            ...detailsBase,
            hasErrorObject: false,
            hasMessage: false,
            hasType: false,
            hasParam: false,
            hasCode: false,
            missingRecommendedFields: ["error"],
          },
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

      const error = response.body.error;
      if (!isRecord(error)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Error response is missing an error object.",
          details: buildDetails(response.body, detailsBase),
          startedAt,
        });
      }

      if (typeof error.message !== "string") {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Error response is missing error.message.",
          details: buildDetails(response.body, detailsBase),
          startedAt,
        });
      }

      const hasType = typeof error.type === "string";
      const hasCode = "code" in error;
      if (!hasType && !hasCode) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Error response is missing both error.type and error.code.",
          details: buildDetails(response.body, detailsBase),
          startedAt,
        });
      }

      const details = buildDetails(response.body, detailsBase);
      const missingRecommendedFields =
        details.missingRecommendedFields as string[];
      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: missingRecommendedFields.length > 0 ? "warn" : "pass",
        message:
          missingRecommendedFields.length > 0
            ? "Error response is parseable, but recommended error metadata is missing."
            : "Error response has the expected minimum shape.",
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

function buildDetails(
  body: Record<string, unknown>,
  detailsBase: { status: number },
): Record<string, unknown> {
  const error = body.error;
  const hasErrorObject = isRecord(error);
  const hasMessage = hasErrorObject && typeof error.message === "string";
  const hasType = hasErrorObject && typeof error.type === "string";
  const hasParam = hasErrorObject && "param" in error;
  const hasCode = hasErrorObject && "code" in error;
  const missingRecommendedFields = ["type", "param", "code"].filter(
    (field) => !hasErrorObject || !(field in error),
  );

  return {
    ...detailsBase,
    hasErrorObject,
    hasMessage,
    hasType,
    hasParam,
    hasCode,
    missingRecommendedFields,
  };
}

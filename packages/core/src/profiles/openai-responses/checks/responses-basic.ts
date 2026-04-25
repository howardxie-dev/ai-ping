import type { CheckContext, WireCheck } from "../../../types";
import {
  checkResult,
  collectResponseOutputTexts,
  failureMessage,
  getArrayField,
  getStringField,
  isRecord,
  responsesPayload,
} from "../utils";

const CHECK = {
  id: "openai-responses.responses.basic",
  title: "Basic response",
  category: "generation",
  severity: "required",
} as const;

export const openaiResponsesBasicCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json({
        method: "POST",
        path: "/responses",
        timeoutMs: ctx.timeoutMs,
        body: responsesPayload(ctx.model),
      });
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

      if ("output" in response.body && !Array.isArray(response.body.output)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.output to be an array when present.",
          details: buildDetails(response.body, detailsBase),
          startedAt,
        });
      }

      if (
        "output_text" in response.body &&
        typeof response.body.output_text !== "string"
      ) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.output_text to be a string when present.",
          details: buildDetails(response.body, detailsBase),
          startedAt,
        });
      }

      const texts = collectResponseOutputTexts(response.body);
      const details = buildDetails(response.body, detailsBase, texts);

      if (texts.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Response did not include any recognizable output text.",
          details,
          startedAt,
        });
      }

      const missingRecommendedFields = collectMissingRecommendedFields(response.body);
      const hasEmptyOutputText = getStringField(response.body, "output_text") === "";
      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status:
          missingRecommendedFields.length > 0 || hasEmptyOutputText
            ? "warn"
            : "pass",
        message:
          missingRecommendedFields.length > 0 || hasEmptyOutputText
            ? "Responses API generation works, but recommended fields or output signals are missing."
            : "Responses API generation returned recognizable output text.",
        details: {
          ...details,
          missingRecommendedFields: [
            ...missingRecommendedFields,
            ...(hasEmptyOutputText ? ["output_text_empty"] : []),
          ],
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

function buildDetails(
  body: Record<string, unknown>,
  detailsBase: { status: number },
  texts = collectResponseOutputTexts(body),
): Record<string, unknown> {
  return {
    ...detailsBase,
    hasId: typeof body.id === "string",
    objectType: getStringField(body, "object"),
    hasOutputArray: Boolean(getArrayField(body, "output")),
    hasOutputText: typeof body.output_text === "string",
    outputTextCount: texts.length,
    totalTextLength: texts.reduce((sum, text) => sum + text.length, 0),
    missingRecommendedFields: collectMissingRecommendedFields(body),
  };
}

function collectMissingRecommendedFields(body: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (!("usage" in body)) missing.push("usage");
  if (!("model" in body)) missing.push("model");
  if (!("status" in body)) missing.push("status");
  if (body.object !== "response") missing.push("object");
  return missing;
}

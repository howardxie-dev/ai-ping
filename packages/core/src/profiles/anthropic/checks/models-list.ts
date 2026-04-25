import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";
import { anthropicRequest } from "./shared";

const CHECK = {
  id: "anthropic.models.list",
  title: "Models list",
  category: "models",
  severity: "recommended",
} as const;

export const anthropicModelsListCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json(
        anthropicRequest(ctx, {
          method: "GET",
          path: "/models",
          timeoutMs: ctx.timeoutMs,
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

      if (!("data" in response.body) || !Array.isArray(response.body.data)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.data to be an array.",
          details: detailsBase,
          startedAt,
        });
      }

      const models = response.body.data;
      const modelIds = models
        .filter(isRecord)
        .map((model) => model.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      const missingRecommendedFields = collectMissingRecommendedFields(
        response.body,
        models,
      );
      const details = {
        ...detailsBase,
        modelCount: models.length,
        sampleModelIds: modelIds.slice(0, 5),
        missingRecommendedFields,
      };

      if (models.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: "Anthropic models list response has an empty data array.",
          details,
          startedAt,
        });
      }

      if (modelIds.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No model item with a string id was found.",
          details,
          startedAt,
        });
      }

      if (missingRecommendedFields.length > 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: `Anthropic models list response is valid, but recommended fields are missing: ${missingRecommendedFields.join(", ")}.`,
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Anthropic models list response is valid.",
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
  body: Record<string, unknown>,
  models: unknown[],
): string[] {
  const missing = new Set<string>();

  if (typeof body.has_more !== "boolean") missing.add("has_more");

  for (const model of models) {
    if (!isRecord(model)) {
      missing.add("type");
      missing.add("display_name");
      missing.add("created_at");
      continue;
    }

    if (typeof model.type !== "string") missing.add("type");
    if (typeof model.display_name !== "string") missing.add("display_name");
    if (typeof model.created_at !== "string") missing.add("created_at");
  }

  return [...missing];
}

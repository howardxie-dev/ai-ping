import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";

const CHECK = {
  id: "ollama.tags",
  title: "Tags / models list",
  category: "models",
  severity: "recommended",
} as const;

export const ollamaTagsCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json({
        method: "GET",
        path: "/api/tags",
        timeoutMs: ctx.timeoutMs,
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

      if (!("models" in response.body) || !Array.isArray(response.body.models)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.models to be an array.",
          details: detailsBase,
          startedAt,
        });
      }

      const models = response.body.models;
      const modelNames = models
        .filter(isRecord)
        .map((item) => item.name)
        .filter((name): name is string => typeof name === "string" && name.length > 0);
      const missingRecommendedFields = collectMissingRecommendedFields(models);
      const details = {
        ...detailsBase,
        modelCount: models.length,
        sampleModelNames: modelNames.slice(0, 5),
        missingRecommendedFields,
      };

      if (models.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: "Ollama tags response has an empty models array.",
          details,
          startedAt,
        });
      }

      if (modelNames.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "No model item with a string name was found.",
          details,
          startedAt,
        });
      }

      if (missingRecommendedFields.length > 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: `Ollama tags response is valid, but recommended fields are missing: ${missingRecommendedFields.join(", ")}.`,
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Ollama tags response is valid.",
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

function collectMissingRecommendedFields(models: unknown[]): string[] {
  const missing = new Set<string>();

  for (const model of models) {
    if (!isRecord(model)) {
      missing.add("modified_at");
      missing.add("size");
      missing.add("digest");
      continue;
    }

    if (typeof model.modified_at !== "string") missing.add("modified_at");
    if (typeof model.size !== "number") missing.add("size");
    if (typeof model.digest !== "string") missing.add("digest");
  }

  return [...missing];
}

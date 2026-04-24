import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";
import { geminiRequest } from "./shared";

const CHECK = {
  id: "gemini.models.list",
  title: "Models list",
  category: "models",
  severity: "recommended",
} as const;

export const geminiModelsListCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json(
        geminiRequest(ctx, {
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
        .map((model) => model.name)
        .filter((name): name is string => typeof name === "string" && name.length > 0);
      const supportsGenerateContent = models
        .filter(isRecord)
        .some(
          (model) =>
            Array.isArray(model.supportedGenerationMethods) &&
            model.supportedGenerationMethods.includes("generateContent"),
        );
      const missingRecommendedFields = collectMissingRecommendedFields(models);
      if (!supportsGenerateContent) {
        missingRecommendedFields.push("supportedGenerationMethods.generateContent");
      }
      const details = {
        ...detailsBase,
        modelCount: models.length,
        sampleModelNames: modelNames.slice(0, 5),
        supportsGenerateContent,
        missingRecommendedFields,
      };

      if (models.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: "Gemini models list response has an empty models array.",
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
          message: `Gemini models list response is valid, but recommended fields are missing: ${missingRecommendedFields.join(", ")}.`,
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Gemini models list response is valid.",
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
      missing.add("baseModelId");
      missing.add("version");
      missing.add("displayName");
      missing.add("supportedGenerationMethods");
      continue;
    }

    if (typeof model.baseModelId !== "string") missing.add("baseModelId");
    if (typeof model.version !== "string") missing.add("version");
    if (typeof model.displayName !== "string") missing.add("displayName");
    if (!Array.isArray(model.supportedGenerationMethods)) {
      missing.add("supportedGenerationMethods");
    }
  }

  return [...missing];
}

import type { CheckContext, WireCheck } from "../../../types";
import { checkResult, failureMessage, isRecord } from "./result";

const CHECK = {
  id: "openai.models.list",
  title: "Models list",
  category: "models",
  severity: "recommended",
} as const;

export const openaiModelsListCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json({
        method: "GET",
        path: "/models",
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

      if (!("data" in response.body)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.data to be an array.",
          details: {
            ...detailsBase,
            hasRootObject: typeof response.body.object === "string",
          },
          startedAt,
        });
      }

      const data = response.body.data;
      if (!Array.isArray(data)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Expected response.data to be an array.",
          details: {
            ...detailsBase,
            hasRootObject: typeof response.body.object === "string",
          },
          startedAt,
        });
      }

      const modelIds = data
        .filter(isRecord)
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      const missingRecommendedFields = collectMissingRecommendedFields(
        response.body,
        data,
      );
      const details = {
        ...detailsBase,
        modelCount: data.length,
        hasRootObject: typeof response.body.object === "string",
        missingRecommendedFields,
        sampleModelIds: modelIds.slice(0, 5),
      };

      if (data.length === 0) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "warn",
          message: "Models list response has an empty data array.",
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
          message: `Models list response is valid, but recommended fields are missing: ${missingRecommendedFields.join(", ")}.`,
          details,
          startedAt,
        });
      }

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: "pass",
        message: "Models list response is valid.",
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
  data: unknown[],
): string[] {
  const missing = new Set<string>();

  if (typeof body.object !== "string") {
    missing.add("object");
  }

  for (const item of data) {
    if (!isRecord(item)) {
      missing.add("object");
      missing.add("created");
      missing.add("owned_by");
      continue;
    }

    if (typeof item.object !== "string") {
      missing.add("item.object");
    }
    if (typeof item.created !== "number") {
      missing.add("item.created");
    }
    if (typeof item.owned_by !== "string") {
      missing.add("item.owned_by");
    }
  }

  return [...missing];
}

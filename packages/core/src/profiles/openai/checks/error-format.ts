import type { CheckContext, WireCheck } from "../../../types";
import { invalidChatCompletionPayload } from "../payloads";
import { OpenAIErrorMinimumSchema } from "../schemas";
import { checkResult, failureMessage } from "./result";

const CHECK = {
  id: "openai-chat.error.format",
  aliases: ["openai.error.format"],
  title: "Error response format",
  category: "errors",
  severity: "recommended",
} as const;

export const openaiErrorFormatCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json({
        method: "POST",
        path: "/chat/completions",
        body: invalidChatCompletionPayload(),
      });
      const details = { status: response.status };

      if (response.status >= 200 && response.status <= 299) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Invalid request unexpectedly returned a 2xx response.",
          details,
          startedAt,
        });
      }

      const parsed = OpenAIErrorMinimumSchema.safeParse(response.body);
      if (!parsed.success) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Error response is missing error.message.",
          details: { ...details, hasErrorObject: hasErrorObject(response.body), hasMessage: false },
          startedAt,
        });
      }

      const missingRecommendedFields = missingRecommended(parsed.data.error);
      const isServerError = response.status >= 500;
      const shouldWarn = isServerError || missingRecommendedFields.length > 0;

      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: shouldWarn ? "warn" : "pass",
        message: shouldWarn
          ? "Error response is parseable, but recommended error metadata is missing or status is 5xx."
          : "Error response has the expected minimum shape.",
        details: {
          ...details,
          hasErrorObject: true,
          hasMessage: true,
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

function missingRecommended(error: Record<string, unknown>): string[] {
  return ["type", "code", "param"].filter((field) => !(field in error));
}

function hasErrorObject(body: unknown): boolean {
  return (
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "error" in body
  );
}

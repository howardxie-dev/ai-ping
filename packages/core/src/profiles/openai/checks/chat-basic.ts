import { chatCompletionPayload } from "../payloads";
import { OpenAIChatBasicMinimumSchema } from "../schemas";
import { checkResult, failureMessage } from "./result";
import type { CheckContext, WireCheck } from "../../../types";

const CHECK = {
  id: "openai-chat.chat.basic",
  aliases: ["openai.chat.basic"],
  title: "Basic chat completion",
  category: "generation",
  severity: "required",
} as const;

export const openaiChatBasicCheck: WireCheck = {
  ...CHECK,
  async run(ctx: CheckContext) {
    const startedAt = performance.now();

    try {
      const response = await ctx.request.json({
        method: "POST",
        path: "/chat/completions",
        body: chatCompletionPayload(ctx.model, false),
      });
      const details = { status: response.status };

      if (response.status < 200 || response.status > 299) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: `Expected 2xx response, received ${response.status}.`,
          details,
          startedAt,
        });
      }

      const parsed = OpenAIChatBasicMinimumSchema.safeParse(response.body);
      if (!parsed.success) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Response is missing the minimum chat completion shape.",
          details: { ...details, issues: parsed.error.issues.map((i) => i.path.join(".")) },
          startedAt,
        });
      }

      const firstChoice = parsed.data.choices[0];
      if (!hasUsableContent(firstChoice.message)) {
        return checkResult({
          ...CHECK,
          profile: ctx.profile,
          status: "fail",
          message: "Response choice does not include usable message content.",
          details,
          startedAt,
        });
      }

      const missingRecommendedFields = missingRecommended(response.body);
      return checkResult({
        ...CHECK,
        profile: ctx.profile,
        status: missingRecommendedFields.length > 0 ? "warn" : "pass",
        message:
          missingRecommendedFields.length > 0
            ? "Chat completion works, but recommended fields are missing."
            : "Chat completion response has the expected minimum shape.",
        details: {
          ...details,
          missingRecommendedFields,
          responseShape: "chat.completion",
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

function hasUsableContent(message: {
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: unknown[];
}): boolean {
  return (
    typeof message.content === "string" ||
    typeof message.reasoning_content === "string" ||
    (Array.isArray(message.tool_calls) && message.tool_calls.length > 0)
  );
}

function missingRecommended(body: unknown): string[] {
  const missing: string[] = [];
  const record = body as Record<string, unknown>;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const firstChoice = choices[0] as Record<string, unknown> | undefined;

  for (const field of ["id", "created", "model", "usage"]) {
    if (!(field in record)) missing.push(field);
  }

  if (!firstChoice || !("finish_reason" in firstChoice)) {
    missing.push("finish_reason");
  }

  return missing;
}

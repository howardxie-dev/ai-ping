import { z } from "zod";

export const OpenAIChatBasicMinimumSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z
              .object({
                content: z.string().nullable().optional(),
                reasoning_content: z.string().nullable().optional(),
                tool_calls: z.array(z.unknown()).optional(),
              })
              .passthrough(),
            finish_reason: z.string().nullable().optional(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

export const OpenAIErrorMinimumSchema = z
  .object({
    error: z
      .object({
        message: z.string(),
        type: z.string().optional(),
        code: z.union([z.string(), z.number()]).optional().nullable(),
        param: z.string().optional().nullable(),
      })
      .passthrough(),
  })
  .passthrough();

export type OpenAIChatBasicResponse = z.infer<
  typeof OpenAIChatBasicMinimumSchema
>;

export type OpenAIErrorResponse = z.infer<typeof OpenAIErrorMinimumSchema>;

import type { CheckContext, HttpRequestInput } from "../../../types";
import { isRecord } from "./result";

export const GEMINI_PROMPT = "Reply with exactly: pong";

export function geminiRequest(
  ctx: CheckContext,
  input: HttpRequestInput,
): HttpRequestInput {
  return {
    ...input,
    headers: {
      ...input.headers,
      ...(ctx.apiKey ? { "x-goog-api-key": ctx.apiKey } : {}),
    },
    skipDefaultAuth: true,
  };
}

export function geminiModelPath(model: string, action: string): string {
  const normalized = model.replace(/^models\//, "");
  return `/models/${normalized}:${action}`;
}

export function generateContentBody(): Record<string, unknown> {
  return {
    contents: [
      {
        role: "user",
        parts: [{ text: GEMINI_PROMPT }],
      },
    ],
  };
}

export function collectTextParts(body: unknown): string[] {
  if (!isRecord(body) || !Array.isArray(body.candidates)) return [];

  const texts: string[] = [];
  for (const candidate of body.candidates) {
    if (!isRecord(candidate)) continue;
    if (!isRecord(candidate.content)) continue;
    if (!Array.isArray(candidate.content.parts)) continue;

    for (const part of candidate.content.parts) {
      if (isRecord(part) && typeof part.text === "string") {
        texts.push(part.text);
      }
    }
  }

  return texts;
}

export function hasCandidateParts(body: unknown): boolean {
  if (!isRecord(body) || !Array.isArray(body.candidates)) return false;
  return body.candidates.some((candidate) => {
    if (!isRecord(candidate)) return false;
    if (!isRecord(candidate.content)) return false;
    return Array.isArray(candidate.content.parts);
  });
}

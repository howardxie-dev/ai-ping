import type { CheckContext, HttpRequestInput } from "../../../types";
import { isRecord } from "./result";

export const ANTHROPIC_VERSION = "2023-06-01";
export const ANTHROPIC_PROMPT = "Reply with exactly: pong";

export function anthropicRequest(
  ctx: CheckContext,
  input: HttpRequestInput,
): HttpRequestInput {
  return {
    ...input,
    headers: {
      "anthropic-version": ANTHROPIC_VERSION,
      ...input.headers,
      ...(ctx.apiKey ? { "x-api-key": ctx.apiKey } : {}),
    },
    skipDefaultAuth: true,
  };
}

export function messagesBody(
  model: string,
  options: { stream?: boolean } = {},
): Record<string, unknown> {
  return {
    model,
    max_tokens: 64,
    ...(options.stream ? { stream: true } : {}),
    messages: [
      {
        role: "user",
        content: ANTHROPIC_PROMPT,
      },
    ],
  };
}

export function collectTextBlocks(body: unknown): string[] {
  if (!isRecord(body) || !Array.isArray(body.content)) return [];

  const texts: string[] = [];
  for (const block of body.content) {
    if (isRecord(block) && typeof block.text === "string") {
      texts.push(block.text);
    }
  }

  return texts;
}

export function collectTextDeltas(records: Record<string, unknown>[]): string[] {
  const texts: string[] = [];

  for (const record of records) {
    if (!isRecord(record.delta)) continue;
    if (typeof record.delta.text === "string") {
      texts.push(record.delta.text);
    }
  }

  return texts;
}

export function hasAnthropicEvent(record: Record<string, unknown>): boolean {
  return typeof record.type === "string" && knownEventTypes.has(record.type);
}

const knownEventTypes = new Set([
  "message_start",
  "content_block_start",
  "content_block_delta",
  "content_block_stop",
  "message_delta",
  "message_stop",
  "ping",
  "error",
]);

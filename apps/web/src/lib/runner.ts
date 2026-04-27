import { runChecks, type WireCheckReport } from "@starroy/ai-ping-core";
import type { WebProfileId } from "./profiles";

export interface WebRunInput {
  profile: WebProfileId;
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
}

const webCheckSubset: Record<WebProfileId, string[]> = {
  "openai-chat": [
    "openai-chat.models.list",
    "openai-chat.chat.basic",
    "openai-chat.chat.stream",
    "openai-chat.error.format",
  ],
  "openai-responses": [
    "openai-responses.models.list",
    "openai-responses.responses.basic",
    "openai-responses.responses.stream",
    "openai-responses.error.format",
  ],
};

export function runWebChecks(input: WebRunInput): Promise<WireCheckReport> {
  return runChecks({
    ...input,
    only: webCheckSubset[input.profile],
  });
}

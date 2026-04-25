import { openaiChatProfile } from "./profiles/openai";
import { ollamaProfile } from "./profiles/ollama";
import { geminiProfile } from "./profiles/gemini";
import { anthropicProfile } from "./profiles/anthropic";
import type { ProtocolProfile, WireCheck } from "./types";

const profiles: ProtocolProfile[] = [
  openaiChatProfile,
  ollamaProfile,
  geminiProfile,
  anthropicProfile,
];

export function listProfiles(): ProtocolProfile[] {
  return profiles;
}

export function getProfile(profileId: string): ProtocolProfile | undefined {
  return profiles.find(
    (profile) =>
      profile.id === profileId || (profile.aliases ?? []).includes(profileId),
  );
}

export function listChecks(profileId: string): WireCheck[] {
  return getProfile(profileId)?.checks ?? [];
}

export function resolveCheckId(
  checks: WireCheck[],
  checkId: string,
): string | undefined {
  return checks.find(
    (check) =>
      check.id === checkId || (check.aliases ?? []).includes(checkId),
  )?.id;
}

import { openaiProfile } from "./profiles/openai";
import { ollamaProfile } from "./profiles/ollama";
import type { ProtocolProfile, WireCheck } from "./types";

const profiles: ProtocolProfile[] = [openaiProfile, ollamaProfile];

export function listProfiles(): ProtocolProfile[] {
  return profiles;
}

export function getProfile(profileId: string): ProtocolProfile | undefined {
  return profiles.find((profile) => profile.id === profileId);
}

export function listChecks(profileId: string): WireCheck[] {
  return getProfile(profileId)?.checks ?? [];
}

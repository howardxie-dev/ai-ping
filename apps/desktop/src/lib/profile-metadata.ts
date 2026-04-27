import type { ProtocolProfile } from "@starroy/ai-ping-core";
import {
  getLocalizedProfileDescription,
  getLocalizedProfileLabel,
  t,
} from "./i18n";
import type { Locale } from "./locales";

export interface ProfileDefaults {
  baseUrl: string;
  model: string;
  requiresApiKey: boolean;
}

export type DesktopLocale = Locale;
type LocalizedProfileId = Parameters<typeof getLocalizedProfileLabel>[1];

const defaultsByProfile: Record<string, ProfileDefaults> = {
  "openai-chat": {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5.5",
    requiresApiKey: true,
  },
  "openai-responses": {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5.5",
    requiresApiKey: true,
  },
  ollama: {
    baseUrl: "http://localhost:11434",
    model: "llama3.2",
    requiresApiKey: false,
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4.6",
    requiresApiKey: true,
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-3-flash",
    requiresApiKey: true,
  },
};

const fallbackDefaults: ProfileDefaults = {
  baseUrl: "",
  model: "",
  requiresApiKey: true,
};

export function getProfileDefaults(profileId: string): ProfileDefaults {
  return defaultsByProfile[profileId] ?? fallbackDefaults;
}

export function getProfileLabel(profile: ProtocolProfile, locale: DesktopLocale): string {
  return isLocalizedProfileId(profile.id)
    ? getLocalizedProfileLabel(locale, profile.id)
    : profile.name;
}

export function getProfileDescription(profileId: string, locale: DesktopLocale): string {
  return isLocalizedProfileId(profileId)
    ? getLocalizedProfileDescription(locale, profileId)
    : t(locale, "configuration.chooseProfile");
}

function isLocalizedProfileId(profileId: string): profileId is LocalizedProfileId {
  return Object.prototype.hasOwnProperty.call(defaultsByProfile, profileId);
}

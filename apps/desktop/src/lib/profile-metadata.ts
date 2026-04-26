import type { ProtocolProfile } from "@starroy/ai-ping-core";

export interface ProfileDefaults {
  baseUrl: string;
  model: string;
  requiresApiKey: boolean;
  description: string;
  label: string;
}

const defaultsByProfile: Record<string, ProfileDefaults> = {
  "openai-chat": {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5.5",
    requiresApiKey: true,
    description: "For OpenAI-compatible /chat/completions endpoints.",
    label: "OpenAI Chat",
  },
  "openai-responses": {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5.5",
    requiresApiKey: true,
    description: "For OpenAI-compatible /responses endpoints.",
    label: "OpenAI Responses",
  },
  ollama: {
    baseUrl: "http://localhost:11434",
    model: "llama3.2",
    requiresApiKey: false,
    description: "For Ollama native /api endpoints.",
    label: "Ollama",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4.6",
    requiresApiKey: true,
    description: "For Anthropic Claude Messages API endpoints.",
    label: "Anthropic",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-3-flash",
    requiresApiKey: true,
    description: "For Gemini Developer API REST endpoints.",
    label: "Gemini",
  },
};

const fallbackDefaults: ProfileDefaults = {
  baseUrl: "",
  model: "",
  requiresApiKey: true,
  description: "Choose a protocol profile.",
  label: "",
};

export function getProfileDefaults(profileId: string): ProfileDefaults {
  return defaultsByProfile[profileId] ?? fallbackDefaults;
}

export function getProfileLabel(profile: ProtocolProfile): string {
  return defaultsByProfile[profile.id]?.label ?? profile.name;
}

export function getProfileDescription(profileId: string): string {
  return getProfileDefaults(profileId).description;
}

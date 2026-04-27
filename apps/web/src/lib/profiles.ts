export type WebProfileId = "openai-chat" | "openai-responses";

export interface WebProfileOption {
  id: WebProfileId;
  defaultBaseUrl: string;
  defaultModel: string;
}

export const webProfiles: readonly WebProfileOption[] = [
  {
    id: "openai-chat",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.5",
  },
  {
    id: "openai-responses",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.5",
  },
];

export function getWebProfile(id: WebProfileId): WebProfileOption {
  return webProfiles.find((profile) => profile.id === id) ?? webProfiles[0];
}

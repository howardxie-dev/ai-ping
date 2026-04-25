export interface ResolveApiKeyOptions {
  explicitApiKey?: string;
  profile: string;
  env: Record<string, string | undefined>;
}

export function resolveApiKey(
  options: ResolveApiKeyOptions,
): string | undefined {
  if (options.explicitApiKey) return options.explicitApiKey;
  if (options.env.AI_PING_API_KEY) return options.env.AI_PING_API_KEY;
  if (options.profile === "openai" && options.env.OPENAI_API_KEY) {
    return options.env.OPENAI_API_KEY;
  }
  if (options.profile === "gemini" && options.env.GEMINI_API_KEY) {
    return options.env.GEMINI_API_KEY;
  }
  if (options.profile === "anthropic" && options.env.ANTHROPIC_API_KEY) {
    return options.env.ANTHROPIC_API_KEY;
  }
  return undefined;
}

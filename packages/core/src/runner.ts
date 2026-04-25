import { createHttpClient } from "./http";
import { getProfile, resolveCheckId } from "./registry";
import { buildSummary } from "./summary";
import packageJson from "../package.json";
import type {
  CheckResult,
  RunChecksOptions,
  WireCheck,
  WireCheckReport,
} from "./types";
import { AiPingConfigError } from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;
const VERSION = packageJson.version;

export async function runChecks(
  options: RunChecksOptions,
): Promise<WireCheckReport> {
  validateOptions(options);

  const profile = getProfile(options.profile);
  if (!profile) {
    throw new AiPingConfigError(`Unknown profile: ${options.profile}`);
  }

  const startedAt = new Date();
  const start = performance.now();
  const checks = filterChecks(profile.checks, options);
  const ctx = {
    profile: profile.id,
    baseUrl: options.baseUrl,
    model: options.model,
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    headers: options.headers ?? {},
    request: createHttpClient({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      headers: options.headers,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    }),
  };

  const results: CheckResult[] = [];
  for (const check of checks) {
    const checkStart = performance.now();
    try {
      results.push(await check.run(ctx));
    } catch (error) {
      results.push({
        id: check.id,
        title: check.title,
        profile: profile.id,
        category: check.category,
        severity: check.severity,
        status: "fail",
        message: `Check crashed: ${errorMessage(error)}`,
        durationMs: Math.round(performance.now() - checkStart),
      });
    }
  }

  const durationMs = Math.round(performance.now() - start);

  return {
    tool: "ai-ping",
    version: VERSION,
    profile: profile.id,
    endpoint: options.baseUrl,
    model: options.model,
    startedAt: startedAt.toISOString(),
    durationMs,
    summary: buildSummary(results),
    results,
  };
}

function validateOptions(options: RunChecksOptions): void {
  if (!options.profile) throw new AiPingConfigError("profile is required");
  if (!options.baseUrl) throw new AiPingConfigError("baseUrl is required");
  if (!options.model) throw new AiPingConfigError("model is required");

  try {
    new URL(options.baseUrl);
  } catch {
    throw new AiPingConfigError(`baseUrl is not a valid URL: ${options.baseUrl}`);
  }
}

function filterChecks(
  checks: WireCheck[],
  options: RunChecksOptions,
): WireCheck[] {
  const only = new Set(resolveCheckIds(checks, options.only ?? []));
  const skip = new Set(resolveCheckIds(checks, options.skip ?? []));

  return checks.filter((check) => {
    if (only.size > 0 && !only.has(check.id)) return false;
    if (skip.has(check.id)) return false;
    return true;
  });
}

function resolveCheckIds(checks: WireCheck[], ids: string[]): string[] {
  return ids.map((id) => resolveCheckId(checks, id) ?? id);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

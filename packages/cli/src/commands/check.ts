import { getProfile, runChecks } from "@starroy/ai-ping-core";
import type { RunChecksOptions, WireCheckReport } from "@starroy/ai-ping-core";
import { resolveApiKey } from "../env";
import { CliUsageError, getExitCodeFromReport } from "../exit-code";
import { parseListOption } from "../parse-list";
import { renderConsoleReport } from "../renderers/console";
import { renderJsonReport } from "../renderers/json";

export interface CheckCommandOptions {
  profile?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  timeout?: string | number;
  json?: boolean;
  only?: string | string[];
  skip?: string | string[];
  verbose?: boolean;
}

export interface CheckCommandDeps {
  runChecks: (options: RunChecksOptions) => Promise<WireCheckReport>;
  env: Record<string, string | undefined>;
  writeStdout: (text: string) => void;
  setExitCode: (code: number) => void;
}

export async function runCheckCommand(
  options: CheckCommandOptions,
  deps: CheckCommandDeps = defaultDeps(),
): Promise<void> {
  const profile = requireOption(options.profile, "--profile");
  const baseUrl = requireOption(options.baseUrl, "--base-url");
  const model = requireOption(options.model, "--model");
  const timeoutMs = parseTimeout(options.timeout);

  if (!getProfile(profile)) {
    throw new CliUsageError(`Unsupported profile: ${profile}`);
  }

  const apiKey = resolveApiKey({
    explicitApiKey: options.apiKey,
    profile,
    env: deps.env,
  });

  const report = await deps.runChecks({
    profile,
    baseUrl,
    model,
    apiKey,
    timeoutMs,
    only: parseListOption(options.only),
    skip: parseListOption(options.skip),
  });

  deps.writeStdout(
    options.json
      ? renderJsonReport(report)
      : renderConsoleReport(report, { verbose: options.verbose }),
  );
  deps.setExitCode(getExitCodeFromReport(report));
}

function requireOption(value: string | undefined, optionName: string): string {
  if (!value) throw new CliUsageError(`Missing required option: ${optionName}`);
  return value;
}

function parseTimeout(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed =
    typeof value === "number" ? value : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliUsageError("Invalid option: --timeout must be a positive integer");
  }
  return parsed;
}

function defaultDeps(): CheckCommandDeps {
  return {
    runChecks,
    env: process.env,
    writeStdout: (text) => {
      console.log(text);
    },
    setExitCode: (code) => {
      process.exitCode = code;
    },
  };
}

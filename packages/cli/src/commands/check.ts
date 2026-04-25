import { getProfile, runChecks } from "@starroy/ai-ping-core";
import type { RunChecksOptions, WireCheckReport } from "@starroy/ai-ping-core";
import { resolveApiKey } from "../env";
import { CliUsageError, getExitCodeFromReport } from "../exit-code";
import { parseListOption } from "../parse-list";
import { renderConsoleReport } from "../renderers/console";
import { renderHtmlReport } from "../renderers/html";
import { renderJsonReport } from "../renderers/json";
import { writeTextFileEnsuringDir } from "../write-file";

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
  html?: string;
}

export interface CheckCommandDeps {
  runChecks: (options: RunChecksOptions) => Promise<WireCheckReport>;
  env: Record<string, string | undefined>;
  writeStdout: (text: string) => void;
  renderHtmlReport: (report: WireCheckReport) => string;
  writeTextFileEnsuringDir: (filePath: string, text: string) => Promise<void>;
  setExitCode: (code: number) => void;
}

export class CliRuntimeError extends Error {
  readonly exitCode = 3;

  constructor(message: string) {
    super(message);
    this.name = "CliRuntimeError";
  }
}

export async function runCheckCommand(
  options: CheckCommandOptions,
  deps: Partial<CheckCommandDeps> = {},
): Promise<void> {
  const resolvedDeps = { ...defaultDeps(), ...deps };
  const profile = requireOption(options.profile, "--profile");
  const baseUrl = requireOption(options.baseUrl, "--base-url");
  const model = requireOption(options.model, "--model");
  const timeoutMs = parseTimeout(options.timeout);
  const htmlPath = parseHtmlPath(options.html);

  const resolvedProfile = getProfile(profile);
  if (!resolvedProfile) {
    throw new CliUsageError(`Unsupported profile: ${profile}`);
  }

  const apiKey = resolveApiKey({
    explicitApiKey: options.apiKey,
    profile,
    env: resolvedDeps.env,
  });

  const report = await resolvedDeps.runChecks({
    profile: resolvedProfile.id,
    baseUrl,
    model,
    apiKey,
    timeoutMs,
    only: parseListOption(options.only),
    skip: parseListOption(options.skip),
  });

  if (htmlPath) {
    await writeHtmlReport(htmlPath, report, resolvedDeps);
  }

  if (options.json) {
    resolvedDeps.writeStdout(renderJsonReport(report));
  } else {
    const output = [
      renderConsoleReport(report, { verbose: options.verbose }),
      htmlPath ? `HTML report written to: ${htmlPath}` : undefined,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");

    resolvedDeps.writeStdout(output);
  }
  resolvedDeps.setExitCode(getExitCodeFromReport(report));
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

function parseHtmlPath(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value.trim().length === 0) {
    throw new CliUsageError("Missing required option: --html");
  }
  return value;
}

async function writeHtmlReport(
  htmlPath: string,
  report: WireCheckReport,
  deps: CheckCommandDeps,
): Promise<void> {
  try {
    await deps.writeTextFileEnsuringDir(
      htmlPath,
      deps.renderHtmlReport(report),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliRuntimeError(`Failed to write HTML report: ${message}`);
  }
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
    renderHtmlReport,
    writeTextFileEnsuringDir,
  };
}

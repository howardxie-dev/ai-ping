import { getProfile, listChecks } from "@starroy/ai-ping-core";
import type { ProtocolProfile, WireCheck } from "@starroy/ai-ping-core";
import { CliUsageError } from "../exit-code";

export interface ChecksCommandOptions {
  profile?: string;
}

export interface ChecksCommandDeps {
  getProfile: (profileId: string) => ProtocolProfile | undefined;
  listChecks: (profileId: string) => WireCheck[];
  writeStdout: (text: string) => void;
  setExitCode: (code: number) => void;
}

export async function runChecksCommand(
  options: ChecksCommandOptions,
  deps: ChecksCommandDeps = defaultDeps(),
): Promise<void> {
  if (!options.profile) {
    throw new CliUsageError("Missing required option: --profile");
  }

  if (!deps.getProfile(options.profile)) {
    throw new CliUsageError(`Unsupported profile: ${options.profile}`);
  }

  const lines = [`Checks for profile: ${options.profile}`];
  for (const check of deps.listChecks(options.profile)) {
    lines.push(
      `${check.severity.padEnd(12, " ")} ${check.id.padEnd(22, " ")} ${check.title}`,
    );
  }

  deps.writeStdout(lines.join("\n"));
  deps.setExitCode(0);
}

function defaultDeps(): ChecksCommandDeps {
  return {
    getProfile,
    listChecks,
    writeStdout: (text) => {
      console.log(text);
    },
    setExitCode: (code) => {
      process.exitCode = code;
    },
  };
}

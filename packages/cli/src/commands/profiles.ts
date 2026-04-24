import { listProfiles } from "@ai-ping/core";
import type { ProtocolProfile } from "@ai-ping/core";

export interface ProfilesCommandDeps {
  listProfiles: () => ProtocolProfile[];
  writeStdout: (text: string) => void;
  setExitCode: (code: number) => void;
}

export async function runProfilesCommand(
  deps: ProfilesCommandDeps = defaultDeps(),
): Promise<void> {
  const lines = ["Available profiles:"];
  for (const profile of deps.listProfiles()) {
    lines.push(profile.id);
    lines.push(`  ${profile.name}`);
    lines.push(`  ${profile.description}`);
  }

  deps.writeStdout(lines.join("\n"));
  deps.setExitCode(0);
}

function defaultDeps(): ProfilesCommandDeps {
  return {
    listProfiles,
    writeStdout: (text) => {
      console.log(text);
    },
    setExitCode: (code) => {
      process.exitCode = code;
    },
  };
}

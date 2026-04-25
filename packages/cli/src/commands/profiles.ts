import { listProfiles } from "@starroy/ai-ping-core";
import type { ProtocolProfile } from "@starroy/ai-ping-core";

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
    if (profile.aliases && profile.aliases.length > 0) {
      lines.push(`  Aliases: ${profile.aliases.join(", ")}`);
    }
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

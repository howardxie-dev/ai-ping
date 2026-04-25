import cac from "cac";
import { runCheckCommand } from "./commands/check";
import { runChecksCommand } from "./commands/checks";
import { runProfilesCommand } from "./commands/profiles";

export async function main(argv = process.argv): Promise<void> {
  const cli = cac("aiping");

  cli
    .command("check", "Run protocol checks")
    .option("--profile <profile>", "Protocol profile")
    .option("--base-url <baseUrl>", "API base URL")
    .option("--model <model>", "Model name")
    .option("--api-key <apiKey>", "API key")
    .option("--timeout <timeout>", "Timeout in milliseconds")
    .option("--json", "Output JSON report")
    .option("--only <checks>", "Only run selected checks")
    .option("--skip <checks>", "Skip selected checks")
    .option("--verbose", "Print verbose details")
    .action(runCheckCommand);

  cli
    .command("profiles", "List available profiles")
    .action(() => runProfilesCommand());

  cli
    .command("checks", "List checks for a profile")
    .option("--profile <profile>", "Protocol profile")
    .action(runChecksCommand);

  cli.help();
  cli.version("0.8.0");
  cli.parse(argv, { run: false });
  await cli.runMatchedCommand();
}

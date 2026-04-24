#!/usr/bin/env node
import { AiPingConfigError } from "@starroy/ai-ping-core";
import { CliUsageError, EXIT_RUNTIME_ERROR } from "./exit-code";
import { main } from "./main";

main(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode =
    error instanceof CliUsageError || error instanceof AiPingConfigError
      ? 2
      : EXIT_RUNTIME_ERROR;
});

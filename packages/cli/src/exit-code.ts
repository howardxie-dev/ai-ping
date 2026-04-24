import type { WireCheckReport } from "@starroy/ai-ping-core";

export const EXIT_OK = 0;
export const EXIT_CHECK_FAILED = 1;
export const EXIT_USAGE_ERROR = 2;
export const EXIT_RUNTIME_ERROR = 3;

export class CliUsageError extends Error {
  readonly exitCode = EXIT_USAGE_ERROR;

  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export function getExitCodeFromReport(report: WireCheckReport): number {
  return report.summary.ok ? EXIT_OK : EXIT_CHECK_FAILED;
}

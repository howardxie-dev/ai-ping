import pc from "picocolors";
import type { CheckResult, WireCheckReport } from "@ai-ping/core";

export interface RenderConsoleOptions {
  verbose?: boolean;
  color?: boolean;
}

export function renderConsoleReport(
  report: WireCheckReport,
  options: RenderConsoleOptions = {},
): string {
  const color = options.color ?? false;
  const lines = [
    "AI Ping",
    `Profile:  ${report.profile}`,
    `Endpoint: ${report.endpoint}`,
    `Model:    ${report.model}`,
  ];

  for (const result of report.results) {
    lines.push(`${formatStatus(result.status, color)}  ${result.id}`);
    lines.push(`      ${result.message}`);

    if (options.verbose) {
      lines.push(
        `      severity=${result.severity} category=${result.category} durationMs=${result.durationMs}`,
      );
      if (result.details) {
        lines.push(`      details=${JSON.stringify(result.details)}`);
      }
    }
  }

  lines.push("Summary:");
  lines.push(`  Passed:  ${report.summary.passed}`);
  lines.push(`  Warned:  ${report.summary.warned}`);
  lines.push(`  Failed:  ${report.summary.failed}`);
  lines.push(`  Skipped: ${report.summary.skipped}`);
  lines.push(`  Result:  ${report.summary.ok ? "OK" : "FAILED"}`);

  return lines.join("\n");
}

function formatStatus(status: CheckResult["status"], color: boolean): string {
  const label = status.toUpperCase().padEnd(4, " ");
  if (!color) return label;
  if (status === "pass") return pc.green(label);
  if (status === "warn") return pc.yellow(label);
  if (status === "fail") return pc.red(label);
  return pc.dim(label);
}

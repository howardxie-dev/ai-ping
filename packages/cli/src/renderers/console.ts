import pc from "picocolors";
import type { CheckResult, WireCheckReport } from "@starroy/ai-ping-core";

export interface RenderConsoleOptions {
  verbose?: boolean;
  color?: boolean;
}

export function renderConsoleReport(
  report: WireCheckReport,
  options: RenderConsoleOptions = {},
): string {
  const color = options.color ?? false;
  const requiredResults = report.results.filter(
    (result) => result.severity === "required",
  );
  const requiredPassed = requiredResults.filter(
    (result) => result.status === "pass" || result.status === "warn",
  ).length;
  const requiredFailed = requiredResults.filter(
    (result) => result.status === "fail",
  ).length;
  const idWidth = Math.max(
    "openai.models.list".length,
    ...report.results.map((result) => result.id.length),
  );
  const severityWidth = Math.max(
    "recommended".length,
    ...report.results.map((result) => result.severity.length),
  );
  const lines = [
    "AI Ping",
    "",
    `Profile:  ${report.profile}`,
    `Endpoint: ${report.endpoint}`,
    `Model:    ${report.model}`,
    `Checks:   ${report.results.length}`,
  ];

  if (report.results.length > 0) {
    lines.push("");
  }

  for (const result of report.results) {
    lines.push(
      `${formatStatus(result.status, color)}  ${result.id.padEnd(idWidth, " ")}  ${result.message}  ${result.severity.padEnd(severityWidth, " ")}  ${result.durationMs}ms`,
    );

    if (options.verbose) {
      if (result.details) {
        lines.push("Details:");
        lines.push(indent(JSON.stringify(result.details, null, 2), 2));
      }
    }
  }

  lines.push("");
  lines.push("Summary:");
  lines.push(`  Required: ${requiredPassed} passed, ${requiredFailed} failed`);
  lines.push(
    `  Total:    ${report.summary.passed} passed, ${report.summary.warned} warned, ${report.summary.failed} failed, ${report.summary.skipped} skipped`,
  );
  lines.push(`  Duration: ${report.durationMs}ms`);
  lines.push(`  Result:   ${report.summary.ok ? "OK" : "FAILED"}`);

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

function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

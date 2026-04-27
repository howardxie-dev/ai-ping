import type { CheckResult, WireCheckReport } from "@starroy/ai-ping-core";

export type AttentionLevel = "idle" | "running" | "ok" | "attention" | "failed";

export interface WebResultMessages {
  statusOk: string;
  statusNeedsAttention: string;
  statusFailed: string;
  allRequiredPassed: string;
  recommendedNeedAttention: string;
  requiredFailed: string;
  noIssues: string;
  basicUsable: string;
  usableWithWarnings: string;
  notUsable: string;
}

export interface WebResultSummary {
  status: "ok" | "attention" | "failed";
  label: string;
  explanation: string;
  usability: string;
  topIssues: CheckResult[];
}

export function getAttentionLevel(
  running: boolean,
  report: WireCheckReport | null,
  error: string | null,
): AttentionLevel {
  if (running) return "running";
  if (error) return "failed";
  if (!report) return "idle";
  if (!report.summary.ok || report.summary.failed > 0) return "failed";
  if (report.summary.warned > 0) return "attention";
  return "ok";
}

export function getTopIssues(report: WireCheckReport | null): CheckResult[] {
  if (!report) return [];
  return report.results
    .filter((result) => result.status === "fail" || result.status === "warn")
    .sort((a, b) => issueWeight(b) - issueWeight(a))
    .slice(0, 3);
}

export function buildWebResultSummary(
  report: WireCheckReport,
  messages: WebResultMessages,
): WebResultSummary {
  const topIssues = getTopIssues(report);

  if (!report.summary.ok || report.summary.failed > 0) {
    return {
      status: "failed",
      label: messages.statusFailed,
      explanation: messages.requiredFailed,
      usability: messages.notUsable,
      topIssues,
    };
  }

  if (report.summary.warned > 0) {
    return {
      status: "attention",
      label: messages.statusNeedsAttention,
      explanation: messages.recommendedNeedAttention,
      usability: messages.usableWithWarnings,
      topIssues,
    };
  }

  return {
    status: "ok",
    label: messages.statusOk,
    explanation: messages.allRequiredPassed,
    usability: messages.basicUsable,
    topIssues,
  };
}

export function formatDuration(durationMs: number | undefined): string {
  if (durationMs === undefined) return "0s";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function issueWeight(result: CheckResult): number {
  const statusWeight = result.status === "fail" ? 20 : result.status === "warn" ? 10 : 0;
  const severityWeight = result.severity === "required" ? 2 : 1;
  return statusWeight + severityWeight;
}

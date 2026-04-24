import type { CheckResult, ReportSummary } from "./types";

export function buildSummary(results: CheckResult[]): ReportSummary {
  const summary = results.reduce(
    (acc, result) => {
      if (result.status === "pass") acc.passed += 1;
      if (result.status === "warn") acc.warned += 1;
      if (result.status === "fail") acc.failed += 1;
      if (result.status === "skip") acc.skipped += 1;
      if (result.status === "fail" && result.severity === "required") {
        acc.requiredFailed += 1;
      }
      return acc;
    },
    {
      passed: 0,
      warned: 0,
      failed: 0,
      skipped: 0,
      total: results.length,
      requiredFailed: 0,
      ok: true,
    },
  );

  return {
    ...summary,
    ok: summary.requiredFailed === 0,
  };
}

import { describe, expect, it } from "vitest";
import type { WireCheckReport } from "@starroy/ai-ping-core";
import { buildWebResultSummary, getTopIssues } from "./result";

const messages = {
  statusOk: "OK",
  statusNeedsAttention: "Needs attention",
  statusFailed: "Failed",
  allRequiredPassed: "All required checks passed.",
  recommendedNeedAttention: "Recommended checks need attention.",
  requiredFailed: "Required failed.",
  noIssues: "No issues.",
  basicUsable: "Basic usable.",
  usableWithWarnings: "Usable with warnings.",
  notUsable: "Not usable.",
};

describe("result helpers", () => {
  it("summarizes a fully passing report", () => {
    const summary = buildWebResultSummary(makeReport(), messages);

    expect(summary.status).toBe("ok");
    expect(summary.label).toBe("OK");
    expect(summary.usability).toBe("Basic usable.");
    expect(summary.topIssues).toHaveLength(0);
  });

  it("prioritizes required failures over recommended warnings", () => {
    const report = makeReport({
      summary: {
        passed: 1,
        warned: 1,
        failed: 1,
        skipped: 0,
        total: 3,
        requiredFailed: 1,
        ok: false,
      },
      results: [
        result("recommended.warn", "warn", "recommended"),
        result("required.fail", "fail", "required"),
        result("optional.fail", "fail", "optional"),
      ],
    });

    expect(buildWebResultSummary(report, messages).status).toBe("failed");
    expect(getTopIssues(report).map((item) => item.id)).toEqual([
      "required.fail",
      "optional.fail",
      "recommended.warn",
    ]);
  });
});

function makeReport(overrides: Partial<WireCheckReport> = {}): WireCheckReport {
  return {
    tool: "ai-ping",
    version: "1.4.0",
    profile: "openai-chat",
    endpoint: "https://example.test/v1",
    model: "test-model",
    startedAt: "2026-04-28T00:00:00.000Z",
    durationMs: 42,
    summary: {
      passed: 1,
      warned: 0,
      failed: 0,
      skipped: 0,
      total: 1,
      requiredFailed: 0,
      ok: true,
    },
    results: [result("required.pass", "pass", "required")],
    ...overrides,
  };
}

function result(
  id: string,
  status: "pass" | "warn" | "fail" | "skip",
  severity: "required" | "recommended" | "optional",
) {
  return {
    id,
    title: id,
    profile: "openai-chat",
    category: "generation" as const,
    severity,
    status,
    message: id,
    durationMs: 1,
  };
}

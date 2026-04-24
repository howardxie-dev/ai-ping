import { describe, expect, it } from "vitest";
import { buildSummary } from "../src/summary";
import type { CheckResult } from "../src/types";

function result(
  status: CheckResult["status"],
  severity: CheckResult["severity"] = "recommended",
): CheckResult {
  return {
    id: `check.${status}.${severity}`,
    title: "Test check",
    profile: "test",
    category: "generation",
    severity,
    status,
    message: status,
    durationMs: 1,
  };
}

describe("buildSummary", () => {
  it("counts statuses and treats required failures as not ok", () => {
    const summary = buildSummary([
      result("pass"),
      result("warn"),
      result("fail", "optional"),
      result("fail", "required"),
      result("skip"),
    ]);

    expect(summary).toEqual({
      passed: 1,
      warned: 1,
      failed: 2,
      skipped: 1,
      total: 5,
      requiredFailed: 1,
      ok: false,
    });
  });

  it("allows optional and recommended failures without failing ok", () => {
    expect(
      buildSummary([result("fail", "optional"), result("fail", "recommended")])
        .ok,
    ).toBe(true);
  });
});

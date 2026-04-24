import { describe, expect, it } from "vitest";
import {
  CliUsageError,
  EXIT_CHECK_FAILED,
  EXIT_OK,
  EXIT_USAGE_ERROR,
  getExitCodeFromReport,
} from "../src/exit-code";
import { makeReport } from "./helpers";

describe("getExitCodeFromReport", () => {
  it("returns zero for a passing report", () => {
    expect(getExitCodeFromReport(makeReport())).toBe(EXIT_OK);
  });

  it("returns the check-failed code for a failed report", () => {
    expect(
      getExitCodeFromReport(
        makeReport({
          summary: {
            passed: 0,
            warned: 0,
            failed: 1,
            skipped: 0,
            total: 1,
            requiredFailed: 1,
            ok: false,
          },
        }),
      ),
    ).toBe(EXIT_CHECK_FAILED);
  });
});

describe("CliUsageError", () => {
  it("carries the usage-error exit code", () => {
    const error = new CliUsageError("bad input");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("CliUsageError");
    expect(error.message).toBe("bad input");
    expect(error.exitCode).toBe(EXIT_USAGE_ERROR);
  });
});

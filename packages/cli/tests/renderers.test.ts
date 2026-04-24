import { describe, expect, it } from "vitest";
import { renderConsoleReport } from "../src/renderers/console";
import { renderJsonReport } from "../src/renderers/json";
import { makeReport, makeResult } from "./helpers";

describe("renderJsonReport", () => {
  it("serializes the report as pretty JSON", () => {
    const report = makeReport();
    const rendered = renderJsonReport(report);

    expect(rendered).toBe(JSON.stringify(report, null, 2));
    expect(JSON.parse(rendered)).toEqual(report);
  });
});

describe("renderConsoleReport", () => {
  it("renders report metadata, results, and summary without verbose details", () => {
    const output = renderConsoleReport(
      makeReport({
        results: [
          makeResult({ id: "chat.basic", status: "pass" }),
          makeResult({
            id: "error.format",
            status: "fail",
            message: "error response was not compatible",
            details: { status: 418 },
          }),
        ],
        summary: {
          passed: 1,
          warned: 0,
          failed: 1,
          skipped: 0,
          total: 2,
          requiredFailed: 1,
          ok: false,
        },
      }),
    );

    expect(output).toContain("AI Ping");
    expect(output).toContain("Profile:  openai");
    expect(output).toContain("Endpoint: https://api.example.test/v1");
    expect(output).toContain("Model:    gpt-test");
    expect(output).toContain("PASS  chat.basic");
    expect(output).toContain("FAIL  error.format");
    expect(output).toContain("      error response was not compatible");
    expect(output).not.toContain("details=");
    expect(output).toContain("  Passed:  1");
    expect(output).toContain("  Failed:  1");
    expect(output).toContain("  Result:  FAILED");
  });

  it("includes severity, category, duration, and details in verbose mode", () => {
    const output = renderConsoleReport(
      makeReport({
        results: [
          makeResult({
            status: "warn",
            severity: "recommended",
            category: "streaming",
            durationMs: 77,
            details: { chunks: 2 },
          }),
        ],
      }),
      { verbose: true },
    );

    expect(output).toContain(
      "      severity=recommended category=streaming durationMs=77",
    );
    expect(output).toContain('      details={"chunks":2}');
  });

  it("pads skipped status labels to align with other statuses", () => {
    const output = renderConsoleReport(
      makeReport({
        results: [makeResult({ id: "chat.stream", status: "skip" })],
      }),
    );

    expect(output).toContain("SKIP  chat.stream");
  });
});

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
  it("renders report metadata, counts, severity, duration, and summary", () => {
    const output = renderConsoleReport(
      makeReport({
        results: [
          makeResult({
            id: "openai.models.list",
            status: "pass",
            severity: "recommended",
            durationMs: 42,
            message: "Models list response is valid.",
          }),
          makeResult({
            id: "openai.chat.stream",
            status: "fail",
            severity: "required",
            durationMs: 301,
            message: "No valid SSE data chunks were found.",
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
        durationMs: 512,
      }),
    );

    expect(output).toContain("AI Ping");
    expect(output).toContain("Profile:  openai");
    expect(output).toContain("Endpoint: https://api.example.test/v1");
    expect(output).toContain("Model:    gpt-test");
    expect(output).toContain("Checks:   2");
    expect(output).toContain("PASS  openai.models.list");
    expect(output).toContain("recommended  42ms");
    expect(output).toContain("FAIL  openai.chat.stream");
    expect(output).toContain("required     301ms");
    expect(output).toContain("  Required: 0 passed, 1 failed");
    expect(output).toContain("  Total:    1 passed, 0 warned, 1 failed, 0 skipped");
    expect(output).toContain("  Duration: 512ms");
    expect(output).toContain("  Result:   FAILED");
  });

  it("includes details in verbose mode", () => {
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

    expect(output).toContain("Details:");
    expect(output).toContain('  "chunks": 2');
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

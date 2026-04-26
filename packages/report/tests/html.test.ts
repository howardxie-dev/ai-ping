import { describe, expect, it } from "vitest";
import type { CheckResult, WireCheckReport } from "@starroy/ai-ping-core";
import {
  escapeHtml,
  renderHtmlReport,
  renderJsonForHtml,
} from "../src/html";

function makeResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    id: "chat.basic",
    title: "Chat basic",
    profile: "openai-chat",
    category: "generation",
    severity: "required",
    status: "pass",
    message: "chat completion succeeded",
    durationMs: 42,
    ...overrides,
  };
}

function makeReport(
  overrides: Partial<WireCheckReport> = {},
): WireCheckReport {
  const results = overrides.results ?? [makeResult()];
  const summary = overrides.summary ?? {
    passed: results.filter((result) => result.status === "pass").length,
    warned: results.filter((result) => result.status === "warn").length,
    failed: results.filter((result) => result.status === "fail").length,
    skipped: results.filter((result) => result.status === "skip").length,
    total: results.length,
    requiredFailed: results.filter(
      (result) => result.status === "fail" && result.severity === "required",
    ).length,
    ok: !results.some(
      (result) => result.status === "fail" && result.severity === "required",
    ),
  };

  return {
    tool: "ai-ping",
    version: "0.10.0",
    profile: "openai-chat",
    endpoint: "https://api.example.test/v1",
    model: "gpt-test",
    startedAt: "2026-04-24T08:00:00.000Z",
    durationMs: 123,
    summary,
    results,
    ...overrides,
  };
}

describe("renderHtmlReport", () => {
  it("renders a complete static HTML report with metadata, summary, checks, and raw JSON", () => {
    const report = makeReport({
      profile: "openai-responses",
      endpoint: "https://api.example.test/v1",
      model: "gpt-5.1-mini",
      results: [
        makeResult({
          id: "openai-responses.responses.basic",
          title: "Basic response",
          profile: "openai-responses",
          status: "pass",
          severity: "required",
          category: "generation",
          durationMs: 42,
          message: "Basic response is valid.",
          details: {
            responseId: "resp_123",
            nested: { events: ["response.created", "response.completed"] },
          },
        }),
        makeResult({
          id: "openai-responses.responses.stream",
          title: "Streaming response",
          profile: "openai-responses",
          status: "warn",
          severity: "recommended",
          category: "streaming",
          durationMs: 77,
          message: "Streaming response had warnings.",
        }),
      ],
      summary: {
        passed: 1,
        warned: 1,
        failed: 0,
        skipped: 0,
        total: 2,
        requiredFailed: 0,
        ok: true,
      },
      durationMs: 119,
    });

    const html = renderHtmlReport(report);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta charset="utf-8" />');
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain("<title>AI Ping Report</title>");
    expect(html).toContain("<style>");
    expect(html).not.toContain("<script");
    expect(html).toContain("AI Ping Report");
    expect(html).toContain("openai-responses");
    expect(html).toContain("https://api.example.test/v1");
    expect(html).toContain("gpt-5.1-mini");
    expect(html).toContain("119ms");
    expect(html).toContain("card-pass");
    expect(html).toContain(">1</span>");
    expect(html).toContain("card-warn");
    expect(html).toContain("openai-responses.responses.basic");
    expect(html).toContain("required");
    expect(html).toContain("42ms");
    expect(html).toContain("<summary>Details</summary>");
    expect(html).toContain("&quot;responseId&quot;: &quot;resp_123&quot;");
    expect(html).toContain("Raw JSON report");
    expect(html).toContain(renderJsonForHtml(report));
  });

  it("escapes dynamic content in metadata, checks, details, and raw JSON", () => {
    const injection = '<script>alert("owned")</script>';
    const report = makeReport({
      profile: injection,
      endpoint: "https://api.example.test/<endpoint>",
      model: "gpt-test",
      results: [
        makeResult({
          id: "chat.<basic>",
          title: injection,
          message: "bad <img src=x onerror=alert(1)>",
          details: {
            html: injection,
            quote: "Tom & 'Jerry'",
          },
        }),
      ],
    });

    const html = renderHtmlReport(report);

    expect(html).not.toContain(injection);
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;script&gt;alert(&quot;owned&quot;)&lt;/script&gt;");
    expect(html).toContain("https://api.example.test/&lt;endpoint&gt;");
    expect(html).toContain("chat.&lt;basic&gt;");
    expect(html).toContain("bad &lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("Tom &amp; &#39;Jerry&#39;");
  });
});

describe("escapeHtml", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(escapeHtml(`<script>alert(1)</script>"'&`)).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#39;&amp;",
    );
  });
});

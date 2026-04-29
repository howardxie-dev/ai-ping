import { describe, expect, it } from "vitest";
import type { WireCheckReport } from "@starroy/ai-ping-core";
import { prepareReportExport } from "./export";

describe("web report export", () => {
  it("prepares JSON as a downloadable Blob", async () => {
    const prepared = prepareReportExport(report, "json");

    expect(prepared.filename).toBe("ai-ping-openai-chat-2026-04-28T00-00-00-000Z.json");
    expect(prepared.blob.type).toBe("application/json");
    await expect(prepared.blob.text()).resolves.toContain('"tool": "ai-ping"');
  });

  it("prepares HTML through the shared report renderer", async () => {
    const prepared = prepareReportExport(report, "html");

    expect(prepared.filename).toBe("ai-ping-openai-chat-2026-04-28T00-00-00-000Z.html");
    expect(prepared.blob.type).toBe("text/html");
    await expect(prepared.blob.text()).resolves.toContain("<title>AI Ping Report</title>");
  });
});

const report: WireCheckReport = {
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
  results: [
    {
      id: "openai-chat.chat.basic",
      title: "Basic chat completion",
      profile: "openai-chat",
      category: "generation",
      severity: "required",
      status: "pass",
      message: "OK",
      durationMs: 1,
    },
  ],
};

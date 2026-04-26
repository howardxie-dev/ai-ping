import type { CheckResult, WireCheckReport } from "@starroy/ai-ping-core";

export function renderHtmlReport(report: WireCheckReport): string {
  const resultLabel = report.summary.ok ? "OK" : "FAILED";
  const checks = report.results.map(renderCheck).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Ping Report</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --panel: #ffffff;
      --text: #1f2937;
      --muted: #5f6b7a;
      --border: #d9e0e8;
      --pass: #16794c;
      --pass-bg: #e8f6ef;
      --warn: #946200;
      --warn-bg: #fff4d6;
      --fail: #b42318;
      --fail-bg: #fde7e7;
      --skip: #596579;
      --skip-bg: #eef1f5;
      --code-bg: #f3f5f7;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }

    main {
      width: min(1100px, calc(100% - 32px));
      margin: 0 auto;
      padding: 40px 0;
    }

    header {
      margin-bottom: 28px;
    }

    h1, h2, h3, p {
      margin-top: 0;
    }

    h1 {
      margin-bottom: 8px;
      font-size: 32px;
    }

    h2 {
      margin-bottom: 14px;
      font-size: 20px;
    }

    header p, .muted {
      color: var(--muted);
    }

    section {
      margin-top: 24px;
    }

    .meta, .summary {
      display: grid;
      gap: 12px;
    }

    .meta {
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    }

    .summary {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }

    .meta-item, .summary-card, .check, .raw-json {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
    }

    .meta-item {
      padding: 12px 14px;
    }

    .meta-item strong, .summary-card strong {
      display: block;
      font-size: 12px;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .meta-item span, .summary-card span {
      overflow-wrap: anywhere;
    }

    .summary-card {
      padding: 14px;
    }

    .summary-card span {
      display: block;
      margin-top: 6px;
      font-size: 28px;
      font-weight: 700;
    }

    .check {
      padding: 16px;
      margin-top: 12px;
    }

    .check-header {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 10px;
    }

    .status, .pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .pill {
      border: 1px solid var(--border);
      color: var(--muted);
      background: #fff;
    }

    .status-pass, .card-pass { color: var(--pass); background: var(--pass-bg); }
    .status-warn, .card-warn { color: var(--warn); background: var(--warn-bg); }
    .status-fail, .card-fail { color: var(--fail); background: var(--fail-bg); }
    .status-skip, .card-skip { color: var(--skip); background: var(--skip-bg); }

    .check-pass { border-left: 4px solid var(--pass); }
    .check-warn { border-left: 4px solid var(--warn); }
    .check-fail { border-left: 4px solid var(--fail); }
    .check-skip { border-left: 4px solid var(--skip); }

    code, pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
    }

    code {
      overflow-wrap: anywhere;
    }

    pre {
      overflow-x: auto;
      padding: 12px;
      border-radius: 6px;
      background: var(--code-bg);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    details {
      margin-top: 12px;
    }

    summary {
      cursor: pointer;
      color: var(--muted);
      font-weight: 700;
    }

    .raw-json {
      padding: 16px;
    }

    @media print {
      body {
        background: #fff;
      }

      main {
        width: 100%;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>AI Ping Report</h1>
      <p>Protocol checks for AI and LLM API endpoints.</p>
    </header>

    <section aria-labelledby="metadata-heading">
      <h2 id="metadata-heading">Metadata</h2>
      <div class="meta">
        ${renderMetaItem("Tool", `${report.tool} ${report.version}`)}
        ${renderMetaItem("Profile", report.profile)}
        ${renderMetaItem("Endpoint", report.endpoint)}
        ${renderMetaItem("Model", report.model)}
        ${renderMetaItem("Started", report.startedAt)}
        ${renderMetaItem("Duration", `${report.durationMs}ms`)}
        ${renderMetaItem("Result", resultLabel)}
      </div>
    </section>

    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading">Summary</h2>
      <div class="summary">
        ${renderSummaryCard("Passed", report.summary.passed, "pass")}
        ${renderSummaryCard("Warned", report.summary.warned, "warn")}
        ${renderSummaryCard("Failed", report.summary.failed, "fail")}
        ${renderSummaryCard("Skipped", report.summary.skipped, "skip")}
      </div>
    </section>

    <section aria-labelledby="checks-heading">
      <h2 id="checks-heading">Checks</h2>
      ${checks}
    </section>

    <section aria-labelledby="raw-json-heading">
      <h2 id="raw-json-heading">Raw JSON</h2>
      <div class="raw-json">
        <details>
          <summary>Raw JSON report</summary>
          <pre>${renderJsonForHtml(report)}</pre>
        </details>
      </div>
    </section>
  </main>
</body>
</html>`;
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderJsonForHtml(value: unknown): string {
  return escapeHtml(JSON.stringify(value, null, 2));
}

function renderMetaItem(label: string, value: unknown): string {
  return `<div class="meta-item"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
}

function renderSummaryCard(
  label: string,
  value: number,
  status: CheckResult["status"],
): string {
  return `<div class="summary-card card-${status}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
}

function renderCheck(result: CheckResult): string {
  return `<article class="check check-${result.status}">
        <div class="check-header">
          <span class="status status-${result.status}">${escapeHtml(result.status)}</span>
          <code>${escapeHtml(result.id)}</code>
          <span class="pill">${escapeHtml(result.severity)}</span>
          <span class="pill">${escapeHtml(result.category)}</span>
          <span class="pill">${escapeHtml(`${result.durationMs}ms`)}</span>
        </div>
        <h3>${escapeHtml(result.title)}</h3>
        <p>${escapeHtml(result.message)}</p>
        ${renderDetails(result.details)}
      </article>`;
}

function renderDetails(details: CheckResult["details"]): string {
  if (!details) return "";
  return `<details>
          <summary>Details</summary>
          <pre>${renderJsonForHtml(details)}</pre>
        </details>`;
}

import { listProfiles, runChecks } from "@starroy/ai-ping-core";
import type {
  CheckResult,
  ProtocolProfile,
  WireCheckReport,
} from "@starroy/ai-ping-core";
import { useEffect, useMemo, useState } from "react";
import {
  getNextProfilePreferences,
  loadDesktopPreferences,
  saveDesktopPreferences,
} from "./lib/desktop-preferences";
import { exportReport, formatJsonReport } from "./lib/export-report";
import {
  getProfileDefaults,
  getProfileDescription,
  getProfileLabel,
} from "./lib/profile-metadata";
import { validateRunForm } from "./lib/validation";

type RunState = "idle" | "running" | "done" | "error";
type AttentionLevel = "idle" | "running" | "ok" | "attention" | "failed";

const profiles = listProfiles();
const profileIds = profiles.map((profile) => profile.id);
const initialProfile = profiles[0]?.id ?? "";
const initialPreferences = loadDesktopPreferences({
  availableProfiles: profileIds,
  fallbackProfile: initialProfile,
});

export function App() {
  const [profile, setProfile] = useState(initialPreferences.profile);
  const [baseUrl, setBaseUrl] = useState(initialPreferences.baseUrl);
  const [model, setModel] = useState(initialPreferences.model);
  const [apiKey, setApiKey] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState(initialPreferences.timeoutSeconds);
  const [profilePreferences, setProfilePreferences] = useState(
    initialPreferences.profiles,
  );
  const [runState, setRunState] = useState<RunState>("idle");
  const [report, setReport] = useState<WireCheckReport | null>(null);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const selectedProfile = useMemo(
    () => profiles.find((item) => item.id === profile),
    [profile],
  );
  const selectedResult = useMemo(
    () =>
      report?.results.find((result) => result.id === selectedCheckId) ??
      report?.results[0] ??
      null,
    [report, selectedCheckId],
  );
  const attention = getAttentionLevel(runState, report);
  const topIssues = useMemo(() => getTopIssues(report), [report]);

  useEffect(() => {
    saveDesktopPreferences({
      profile,
      baseUrl,
      model,
      timeoutSeconds,
      profiles: profilePreferences,
    });
  }, [baseUrl, model, profile, profilePreferences, timeoutSeconds]);

  function handleProfileChange(nextProfile: string) {
    const nextPreferences = getNextProfilePreferences(
      {
        profile,
        baseUrl,
        model,
        timeoutSeconds,
        profiles: profilePreferences,
      },
      nextProfile,
    );
    setProfile(nextPreferences.profile);
    setBaseUrl(nextPreferences.baseUrl);
    setModel(nextPreferences.model);
    setProfilePreferences(nextPreferences.profiles);
    setSelectedCheckId(null);
  }

  async function handleRun() {
    const timeoutMs = timeoutSeconds * 1000;
    const validation = validateRunForm({ profile, baseUrl, model, timeoutMs });
    setErrors(validation.errors);
    setMessage(null);

    if (!validation.ok) {
      setRunState("error");
      return;
    }

    setRunState("running");
    setReport(null);
    setSelectedCheckId(null);

    try {
      const nextReport = await runChecks({
        profile,
        baseUrl,
        model,
        apiKey: apiKey.trim() || undefined,
        timeoutMs,
      });
      setReport(nextReport);
      setSelectedCheckId(nextReport.results[0]?.id ?? null);
      setRunState("done");
    } catch (error) {
      setRunState("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleExport(kind: "json" | "html") {
    if (!report) return;
    setMessage(null);
    try {
      const path = await exportReport(report, kind);
      setMessage(`Saved ${kind.toUpperCase()} report to ${path}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleCopyJson() {
    if (!report) return;
    await copyText(formatJsonReport(report));
  }

  async function handleCopyDetails() {
    if (!selectedResult) return;
    await copyText(JSON.stringify(selectedResult, null, 2));
  }

  async function copyText(text: string) {
    setMessage(null);
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to clipboard.");
    } catch {
      setMessage("Clipboard access is unavailable in this environment.");
    }
  }

  return (
    <main className="app-shell">
      <aside className="configuration" aria-label="Run configuration">
        <h2>Configuration</h2>

        <label>
          <span>Profile</span>
          <select
            value={profile}
            onChange={(event) => handleProfileChange(event.target.value)}
          >
            {profiles.map((item) => (
              <option key={item.id} value={item.id}>
                {getProfileLabel(item)}
              </option>
            ))}
          </select>
          <small className="hint">
            {selectedProfile
              ? getProfileDescription(selectedProfile.id)
              : "Choose a protocol profile."}
          </small>
          {errors.profile ? <small className="error">{errors.profile}</small> : null}
        </label>

        <label>
          <span>Base URL</span>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          {errors.baseUrl ? <small className="error">{errors.baseUrl}</small> : null}
        </label>

        <label>
          <span>Model</span>
          <input value={model} onChange={(event) => setModel(event.target.value)} />
          {errors.model ? <small className="error">{errors.model}</small> : null}
        </label>

        <label>
          <span>API Key</span>
          <div className="secret-field">
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={apiKeyPlaceholder(selectedProfile)}
              type="password"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              aria-label="Clear API key"
              disabled={!apiKey}
              onClick={() => setApiKey("")}
              type="button"
            >
              x
            </button>
          </div>
          <small className="hint">API keys are kept in memory and are not saved.</small>
        </label>

        <label>
          <span>Timeout</span>
          <div className="timeout-field">
            <input
              value={timeoutSeconds}
              min={1}
              step={1}
              type="number"
              onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
            />
            <span>seconds</span>
          </div>
          {errors.timeoutMs ? <small className="error">{errors.timeoutMs}</small> : null}
        </label>

        <p className="hint persistence-hint">
          Profile, base URL, model, and timeout are restored on next launch. API
          keys are not saved.
        </p>

        <div className="side-actions">
          <button
            className="run-button"
            disabled={runState === "running"}
            onClick={handleRun}
            type="button"
          >
            <span aria-hidden="true" className="play-mark" />
            {runState === "running" ? "Running..." : "Run Check"}
          </button>
          <button disabled={!report} onClick={() => handleExport("json")} type="button">
            Export JSON
          </button>
          <button disabled={!report} onClick={() => handleExport("html")} type="button">
            Export HTML
          </button>
        </div>

        {message ? <p className="message">{message}</p> : null}
      </aside>

      <section className="results" aria-label="Check results">
        <header className="app-title">
          <h1>AI Ping Desktop Preview</h1>
        </header>

        <StatusBanner
          attention={attention}
          message={message}
          report={report}
          runState={runState}
        />

        <section className="summary-strip" aria-label="Summary">
          <SummaryCard label="Passed" tone="pass" value={report?.summary.passed ?? 0} />
          <SummaryCard label="Warned" tone="warn" value={report?.summary.warned ?? 0} />
          <SummaryCard label="Failed" tone="fail" value={report?.summary.failed ?? 0} />
          <SummaryCard label="Skipped" tone="skip" value={report?.summary.skipped ?? 0} />
          <SummaryCard
            label="Duration"
            tone="duration"
            value={formatDuration(report?.durationMs)}
          />
        </section>

        <section className="issues-block" aria-label="Top issues">
          <h2>Top issues</h2>
          {report ? (
            topIssues.length > 0 ? (
              <ol>
                {topIssues.map((result) => (
                  <IssueRow
                    key={result.id}
                    result={result}
                    selected={result.id === selectedResult?.id}
                    onSelect={() => setSelectedCheckId(result.id)}
                  />
                ))}
              </ol>
            ) : (
              <p className="positive-callout">No protocol issues found in this run.</p>
            )
          ) : (
            <p className="empty-copy">
              Run a check to see compatibility issues ranked by impact.
            </p>
          )}
        </section>

        {report?.summary.ok ? (
          <div className="usable-callout">
            <span aria-hidden="true" className="ok-mark" />
            <span>{getUsabilityText(report)}</span>
          </div>
        ) : null}

        <details className="advanced" open={Boolean(report)}>
          <summary>
            <span>Show advanced details</span>
            <small>Check IDs, durations, categories, details JSON, and raw report.</small>
          </summary>

          {report ? (
            <div className="advanced-grid">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Check</th>
                    <th>Result</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {report.results.map((result) => (
                    <tr
                      className={result.id === selectedResult?.id ? "selected-row" : ""}
                      key={result.id}
                      onClick={() => setSelectedCheckId(result.id)}
                    >
                      <td>
                        <StatusLabel status={result.status} />
                      </td>
                      <td>
                        <code>{result.id}</code>
                      </td>
                      <td>{result.message}</td>
                      <td>{result.durationMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <aside className="details-inspector">
                <div className="inspector-header">
                  <h3>Selected check</h3>
                  {selectedResult ? <StatusLabel status={selectedResult.status} /> : null}
                </div>
                {selectedResult ? (
                  <CheckDetails result={selectedResult} />
                ) : (
                  <p className="empty-copy">Select a check to inspect details.</p>
                )}
                <div className="inspector-actions">
                  <button disabled={!report} onClick={handleCopyJson} type="button">
                    Copy JSON
                  </button>
                  <button disabled={!selectedResult} onClick={handleCopyDetails} type="button">
                    Copy details
                  </button>
                </div>
              </aside>
            </div>
          ) : (
            <p className="empty-copy">Advanced details will appear after a run.</p>
          )}
        </details>
      </section>
    </main>
  );
}

function StatusBanner({
  attention,
  message,
  report,
  runState,
}: {
  attention: AttentionLevel;
  message: string | null;
  report: WireCheckReport | null;
  runState: RunState;
}) {
  const copy = getBannerCopy(attention, report, message, runState);

  return (
    <section className={`status-banner ${attention}`} aria-label="Run status">
      <span aria-hidden="true" className="banner-icon">
        {attention === "failed" ? "x" : attention === "ok" ? "" : "!"}
      </span>
      <div>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: number | string;
}) {
  return (
    <article className={`summary-card ${tone}`}>
      <span aria-hidden="true" className="summary-icon" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function IssueRow({
  onSelect,
  result,
  selected,
}: {
  onSelect: () => void;
  result: CheckResult;
  selected: boolean;
}) {
  return (
    <li>
      <button className={selected ? "selected" : ""} onClick={onSelect} type="button">
        <span aria-hidden="true" className={`issue-icon ${result.status}`} />
        <span>
          <strong>{result.title}</strong>
          <em>{result.message}</em>
        </span>
        <StatusTag status={result.status} />
        <span aria-hidden="true" className="chevron" />
      </button>
    </li>
  );
}

function StatusTag({ status }: { status: CheckResult["status"] }) {
  const label = status === "warn" ? "Warning" : status;
  return <span className={`status-tag ${status}`}>{label}</span>;
}

function StatusLabel({ status }: { status: CheckResult["status"] }) {
  return (
    <span className={`status-label ${status}`}>
      <span aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}

function CheckDetails({ result }: { result: CheckResult }) {
  return (
    <div className="detail-body">
      <dl>
        <div>
          <dt>Title</dt>
          <dd>{result.title}</dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>{result.severity}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{result.category}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{result.durationMs}ms</dd>
        </div>
        <div className="wide">
          <dt>Message</dt>
          <dd>{result.message}</dd>
        </div>
      </dl>
      <pre>{JSON.stringify(result.details ?? {}, null, 2)}</pre>
    </div>
  );
}

function getAttentionLevel(
  runState: RunState,
  report: WireCheckReport | null,
): AttentionLevel {
  if (runState === "running") return "running";
  if (runState === "error") return "failed";
  if (!report) return "idle";
  if (!report.summary.ok || report.summary.failed > 0) return "failed";
  if (report.summary.warned > 0) return "attention";
  return "ok";
}

function getBannerCopy(
  attention: AttentionLevel,
  report: WireCheckReport | null,
  message: string | null,
  runState: RunState,
): { title: string; body: string } {
  if (runState === "running") {
    return {
      title: "Running checks",
      body: "AI Ping is checking the selected endpoint protocol behavior.",
    };
  }
  if (attention === "failed") {
    return {
      title: "Needs attention",
      body:
        message ??
        "One or more required checks failed. Review the top issues before using this endpoint.",
    };
  }
  if (attention === "attention") {
    return {
      title: "Needs attention",
      body:
        "Required checks passed, but some recommended compatibility checks need attention.",
    };
  }
  if (attention === "ok") {
    return {
      title: "Endpoint looks usable",
      body: "Required and recommended checks passed for this profile.",
    };
  }
  return {
    title: "Ready to check",
    body: report
      ? "Review the latest run below."
      : "Choose a profile, enter endpoint details, and run protocol checks.",
  };
}

function getTopIssues(report: WireCheckReport | null): CheckResult[] {
  if (!report) return [];
  return report.results
    .filter((result) => result.status === "fail" || result.status === "warn")
    .sort((a, b) => issueWeight(b) - issueWeight(a))
    .slice(0, 3);
}

function issueWeight(result: CheckResult): number {
  const statusWeight = result.status === "fail" ? 20 : result.status === "warn" ? 10 : 0;
  const severityWeight = result.severity === "required" ? 2 : 1;
  return statusWeight + severityWeight;
}

function getUsabilityText(report: WireCheckReport): string {
  if (report.summary.warned > 0) {
    return "Basic required checks are usable. Review recommended compatibility warnings before shipping.";
  }
  return "Basic and recommended compatibility checks are usable.";
}

function formatDuration(durationMs: number | undefined): string {
  if (durationMs === undefined) return "0s";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function statusLabel(status: CheckResult["status"]): string {
  if (status === "pass") return "Passed";
  if (status === "warn") return "Warned";
  if (status === "fail") return "Failed";
  return "Skipped";
}

function apiKeyPlaceholder(profile?: ProtocolProfile): string {
  if (!profile) return "Optional";
  return getProfileDefaults(profile.id).requiresApiKey
    ? "Required by most hosted APIs"
    : "Optional";
}

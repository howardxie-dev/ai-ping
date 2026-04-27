import { listProfiles, runChecks } from "@starroy/ai-ping-core";
import type {
  CheckResult,
  ProtocolProfile,
  WireCheckReport,
} from "@starroy/ai-ping-core";
import { useMemo, useState } from "react";
import { exportReport, formatJsonReport } from "./lib/export-report";
import { detectSystemLocale, t } from "./lib/i18n";
import {
  getProfileDefaults,
  getProfileDescription,
  getProfileLabel,
  type DesktopLocale,
} from "./lib/profile-metadata";
import { validateRunForm } from "./lib/validation";

type RunState = "idle" | "running" | "done" | "error";
type AttentionLevel = "idle" | "running" | "ok" | "attention" | "failed";

const profiles = listProfiles();
const initialProfile = profiles[0]?.id ?? "";
const initialDefaults = getProfileDefaults(initialProfile);
const localeLabels: Record<DesktopLocale, string> = {
  en: "English",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

export function App() {
  const [locale, setLocale] = useState<DesktopLocale>(() => detectSystemLocale());
  const [profile, setProfile] = useState(initialProfile);
  const [baseUrl, setBaseUrl] = useState(initialDefaults.baseUrl);
  const [model, setModel] = useState(initialDefaults.model);
  const [apiKey, setApiKey] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
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

  function handleProfileChange(nextProfile: string) {
    const defaults = getProfileDefaults(nextProfile);
    setProfile(nextProfile);
    setBaseUrl(defaults.baseUrl);
    setModel(defaults.model);
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
      setMessage(t(locale, "feedback.savedReport", { kind: kind.toUpperCase(), path }));
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
      setMessage(t(locale, "feedback.copied"));
    } catch {
      setMessage(t(locale, "feedback.clipboardUnavailable"));
    }
  }

  return (
    <main className="app-shell">
      <aside className="configuration" aria-label={t(locale, "configuration.ariaLabel")}>
        <div className="configuration-heading">
          <h2>{t(locale, "configuration.title")}</h2>
          <label className="language-switcher">
            <span>{t(locale, "language.label")}</span>
            <select
              aria-label={t(locale, "language.label")}
              value={locale}
              onChange={(event) => setLocale(event.target.value as DesktopLocale)}
            >
              {Object.entries(localeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>{t(locale, "configuration.profile")}</span>
          <select
            value={profile}
            onChange={(event) => handleProfileChange(event.target.value)}
          >
            {profiles.map((item) => (
              <option key={item.id} value={item.id}>
                {getProfileLabel(item, locale)}
              </option>
            ))}
          </select>
          <small className="hint">
            {selectedProfile
              ? getProfileDescription(selectedProfile.id, locale)
              : t(locale, "configuration.chooseProfile")}
          </small>
          {errors.profile ? (
            <small className="error">{t(locale, "validation.chooseProfile")}</small>
          ) : null}
        </label>

        <label>
          <span>{t(locale, "configuration.baseUrl")}</span>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          {errors.baseUrl ? (
            <small className="error">{t(locale, "validation.validBaseUrl")}</small>
          ) : null}
        </label>

        <label>
          <span>{t(locale, "configuration.model")}</span>
          <input value={model} onChange={(event) => setModel(event.target.value)} />
          {errors.model ? (
            <small className="error">{t(locale, "validation.enterModel")}</small>
          ) : null}
        </label>

        <label>
          <span>{t(locale, "configuration.apiKey")}</span>
          <div className="secret-field">
            <input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={apiKeyPlaceholder(selectedProfile, locale)}
              type="password"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              aria-label={t(locale, "actions.clear")}
              disabled={!apiKey}
              onClick={() => setApiKey("")}
              type="button"
            >
              x
            </button>
          </div>
          <small className="hint">{t(locale, "configuration.apiKeyNote")}</small>
        </label>

        <label>
          <span>{t(locale, "configuration.timeout")}</span>
          <div className="timeout-field">
            <input
              value={timeoutSeconds}
              min={1}
              step={1}
              type="number"
              onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
            />
            <span>{t(locale, "configuration.seconds")}</span>
          </div>
          {errors.timeoutMs ? (
            <small className="error">{t(locale, "validation.timeoutMin")}</small>
          ) : null}
        </label>

        <div className="side-actions">
          <button
            className="run-button"
            disabled={runState === "running"}
            onClick={handleRun}
            type="button"
          >
            <span aria-hidden="true" className="play-mark" />
            {runState === "running" ? t(locale, "actions.running") : t(locale, "actions.runCheck")}
          </button>
          <button disabled={!report} onClick={() => handleExport("json")} type="button">
            {t(locale, "actions.exportJson")}
          </button>
          <button disabled={!report} onClick={() => handleExport("html")} type="button">
            {t(locale, "actions.exportHtml")}
          </button>
        </div>

        {message ? <p className="message">{message}</p> : null}
      </aside>

      <section className="results" aria-label={t(locale, "result.ariaLabel")}>
        <header className="app-title">
          <h1>{t(locale, "app.title")}</h1>
        </header>

        <StatusBanner
          attention={attention}
          locale={locale}
          message={message}
          report={report}
          runState={runState}
        />

        <section className="summary-strip" aria-label={t(locale, "result.summary")}>
          <SummaryCard label={t(locale, "result.passed")} tone="pass" value={report?.summary.passed ?? 0} />
          <SummaryCard label={t(locale, "result.warned")} tone="warn" value={report?.summary.warned ?? 0} />
          <SummaryCard label={t(locale, "result.failed")} tone="fail" value={report?.summary.failed ?? 0} />
          <SummaryCard label={t(locale, "result.skipped")} tone="skip" value={report?.summary.skipped ?? 0} />
          <SummaryCard
            label={t(locale, "result.duration")}
            tone="duration"
            value={formatDuration(report?.durationMs)}
          />
        </section>

        <section className="issues-block" aria-label={t(locale, "issues.title")}>
          <h2>{t(locale, "issues.title")}</h2>
          {report ? (
            topIssues.length > 0 ? (
              <ol>
                {topIssues.map((result) => (
                  <IssueRow
                    key={result.id}
                    result={result}
                    selected={result.id === selectedResult?.id}
                    locale={locale}
                    onSelect={() => setSelectedCheckId(result.id)}
                  />
                ))}
              </ol>
            ) : (
              <p className="positive-callout">{t(locale, "issues.noneFoundInRun")}</p>
            )
          ) : (
            <p className="empty-copy">{t(locale, "issues.empty")}</p>
          )}
        </section>

        {report?.summary.ok ? (
          <div className="usable-callout">
            <span aria-hidden="true" className="ok-mark" />
            <span>{getUsabilityText(report, locale)}</span>
          </div>
        ) : null}

        <details className="advanced" open={Boolean(report)}>
          <summary>
            <span>{t(locale, "advanced.show")}</span>
            <small>{t(locale, "advanced.help")}</small>
          </summary>

          {report ? (
            <div className="advanced-grid">
              <table>
                <thead>
                  <tr>
                    <th>{t(locale, "advanced.status")}</th>
                    <th>{t(locale, "advanced.check")}</th>
                    <th>{t(locale, "advanced.result")}</th>
                    <th>{t(locale, "result.duration")}</th>
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
                        <StatusLabel status={result.status} locale={locale} />
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
                  <h3>{t(locale, "advanced.selectedCheck")}</h3>
                  {selectedResult ? (
                    <StatusLabel status={selectedResult.status} locale={locale} />
                  ) : null}
                </div>
                {selectedResult ? (
                  <CheckDetails result={selectedResult} locale={locale} />
                ) : (
                  <p className="empty-copy">{t(locale, "advanced.selectCheck")}</p>
                )}
                <div className="inspector-actions">
                  <button disabled={!report} onClick={handleCopyJson} type="button">
                    {t(locale, "actions.copyJson")}
                  </button>
                  <button disabled={!selectedResult} onClick={handleCopyDetails} type="button">
                    {t(locale, "actions.copyDetails")}
                  </button>
                </div>
              </aside>
            </div>
          ) : (
            <p className="empty-copy">{t(locale, "advanced.empty")}</p>
          )}
        </details>
      </section>
    </main>
  );
}

function StatusBanner({
  attention,
  locale,
  message,
  report,
  runState,
}: {
  attention: AttentionLevel;
  locale: DesktopLocale;
  message: string | null;
  report: WireCheckReport | null;
  runState: RunState;
}) {
  const copy = getBannerCopy(attention, report, message, runState, locale);

  return (
    <section className={`status-banner ${attention}`} aria-label={t(locale, "advanced.status")}>
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
  locale,
  onSelect,
  result,
  selected,
}: {
  locale: DesktopLocale;
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
        <StatusTag status={result.status} locale={locale} />
        <span aria-hidden="true" className="chevron" />
      </button>
    </li>
  );
}

function StatusTag({
  locale,
  status,
}: {
  locale: DesktopLocale;
  status: CheckResult["status"];
}) {
  const label = status === "warn" ? t(locale, "status.warning") : statusLabel(status, locale);
  return <span className={`status-tag ${status}`}>{label}</span>;
}

function StatusLabel({
  locale,
  status,
}: {
  locale: DesktopLocale;
  status: CheckResult["status"];
}) {
  return (
    <span className={`status-label ${status}`}>
      <span aria-hidden="true" />
      {statusLabel(status, locale)}
    </span>
  );
}

function CheckDetails({ locale, result }: { locale: DesktopLocale; result: CheckResult }) {
  return (
    <div className="detail-body">
      <dl>
        <div>
          <dt>{t(locale, "advanced.titleField")}</dt>
          <dd>{result.title}</dd>
        </div>
        <div>
          <dt>{t(locale, "advanced.severity")}</dt>
          <dd>{result.severity}</dd>
        </div>
        <div>
          <dt>{t(locale, "advanced.category")}</dt>
          <dd>{result.category}</dd>
        </div>
        <div>
          <dt>{t(locale, "result.duration")}</dt>
          <dd>{result.durationMs}ms</dd>
        </div>
        <div className="wide">
          <dt>{t(locale, "advanced.message")}</dt>
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
  locale: DesktopLocale,
): { title: string; body: string } {
  if (runState === "running") {
    return {
      title: t(locale, "status.running"),
      body: t(locale, "result.runningBody"),
    };
  }
  if (attention === "failed") {
    return {
      title: t(locale, "status.needsAttention"),
      body: message ?? t(locale, "result.requiredFailedReview"),
    };
  }
  if (attention === "attention") {
    return {
      title: t(locale, "status.needsAttention"),
      body: t(locale, "result.recommendedNeedAttention"),
    };
  }
  if (attention === "ok") {
    return {
      title: t(locale, "status.ok"),
      body: t(locale, "result.allChecksPassed"),
    };
  }
  return {
    title: t(locale, "status.ready"),
    body: report ? t(locale, "result.reviewLatestRun") : t(locale, "result.readyBody"),
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

function getUsabilityText(report: WireCheckReport, locale: DesktopLocale): string {
  if (report.summary.warned > 0) {
    return t(locale, "result.usableWithWarnings");
  }
  return t(locale, "result.usable");
}

function formatDuration(durationMs: number | undefined): string {
  if (durationMs === undefined) return "0s";
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function statusLabel(status: CheckResult["status"], locale: DesktopLocale): string {
  if (status === "pass") return t(locale, "result.passed");
  if (status === "warn") return t(locale, "result.warned");
  if (status === "fail") return t(locale, "result.failed");
  return t(locale, "result.skipped");
}

function apiKeyPlaceholder(profile: ProtocolProfile | undefined, locale: DesktopLocale): string {
  if (!profile) return t(locale, "profile.apiKeyPlaceholder.optional");
  return getProfileDefaults(profile.id).requiresApiKey
    ? t(locale, "profile.apiKeyPlaceholder.required")
    : t(locale, "profile.apiKeyPlaceholder.optional");
}

import type { CheckResult, WireCheckReport } from "@starroy/ai-ping-core";
import { useMemo, useState } from "react";
import { AdvancedDetails } from "./components/AdvancedDetails";
import { CorsNotice } from "./components/CorsNotice";
import { ExportButtons } from "./components/ExportButtons";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { PrivacyNotice } from "./components/PrivacyNotice";
import { SummaryCards } from "./components/SummaryCards";
import { TopIssues } from "./components/TopIssues";
import { detectLocale, list, t, type Locale } from "./i18n";
import { isLikelyCorsError } from "./lib/cors";
import { getAttentionLevel } from "./lib/result";
import { runWebChecks } from "./lib/runner";
import { getWebProfile, webProfiles, type WebProfileId } from "./lib/profiles";

const initialProfile = webProfiles[0];

export function App() {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [profile, setProfile] = useState<WebProfileId>(initialProfile.id);
  const [baseUrl, setBaseUrl] = useState(initialProfile.defaultBaseUrl);
  const [model, setModel] = useState(initialProfile.defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<WireCheckReport | null>(null);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<"baseUrl" | "model" | "timeout", string>>>({});

  const selectedResult = useMemo(
    () =>
      report?.results.find((result) => result.id === selectedCheckId) ??
      report?.results[0] ??
      null,
    [report, selectedCheckId],
  );
  const attention = getAttentionLevel(running, report, error);
  const profileDescription =
    profile === "openai-chat"
      ? t(locale, "profile.chatDescription")
      : t(locale, "profile.responsesDescription");

  function handleProfileChange(nextProfile: WebProfileId) {
    const next = getWebProfile(nextProfile);
    setProfile(next.id);
    setBaseUrl(next.defaultBaseUrl);
    setModel(next.defaultModel);
    setSelectedCheckId(null);
  }

  async function handleRun() {
    const validation = validateForm(baseUrl, model, timeoutSeconds);
    setErrors(validation.errors);
    setError(null);
    if (!validation.ok) return;

    setRunning(true);
    setReport(null);
    setSelectedCheckId(null);
    try {
      const nextReport = await runWebChecks({
        profile,
        baseUrl,
        model,
        apiKey: apiKey.trim() || undefined,
        timeoutMs: timeoutSeconds * 1000,
      });
      setReport(nextReport);
      setSelectedCheckId(nextReport.results[0]?.id ?? null);
    } catch (runError) {
      setError(
        isLikelyCorsError(runError)
          ? t(locale, "result.corsBody")
          : runError instanceof Error
            ? runError.message
            : String(runError),
      );
    } finally {
      setRunning(false);
    }
  }

  function handleSelectResult(result: CheckResult) {
    setSelectedCheckId(result.id);
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <div>
          <p className="eyebrow">{t(locale, "app.eyebrow")}</p>
          <h1>{t(locale, "app.title")}</h1>
        </div>
        <nav aria-label="Project links">
          <a href="https://github.com/howardxie-dev/ai-ping">{t(locale, "nav.github")}</a>
          <a href="https://www.npmjs.com/package/@starroy/ai-ping">{t(locale, "nav.npm")}</a>
          <a href="https://github.com/howardxie-dev/ai-ping/releases">{t(locale, "nav.desktop")}</a>
          <LanguageSwitcher
            label={t(locale, "nav.language")}
            locale={locale}
            onChange={setLocale}
          />
        </nav>
      </header>

      <section className="notice-grid">
        <PrivacyNotice items={list(locale, "notice.privacyItems")} title={t(locale, "notice.privacyTitle")} />
        <CorsNotice body={t(locale, "notice.corsBody")} title={t(locale, "notice.corsTitle")} />
      </section>

      <div className="workspace-grid">
        <aside className="configuration">
          <h2>{t(locale, "config.title")}</h2>
          <label>
            <span>{t(locale, "config.profile")}</span>
            <select value={profile} onChange={(event) => handleProfileChange(event.target.value as WebProfileId)}>
              {webProfiles.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(locale, `profile.${item.id}`)}
                </option>
              ))}
            </select>
            <small>{profileDescription}</small>
          </label>

          <label>
            <span>{t(locale, "config.baseUrl")}</span>
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
            {errors.baseUrl ? <small className="error">{t(locale, "validation.baseUrl")}</small> : null}
          </label>

          <label>
            <span>{t(locale, "config.model")}</span>
            <input value={model} onChange={(event) => setModel(event.target.value)} />
            {errors.model ? <small className="error">{t(locale, "validation.model")}</small> : null}
          </label>

          <label>
            <span>{t(locale, "config.apiKey")}</span>
            <div className="secret-field">
              <input
                autoComplete="off"
                spellCheck={false}
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
              <button disabled={!apiKey} onClick={() => setApiKey("")} type="button">
                {t(locale, "config.clear")}
              </button>
            </div>
            <small>{t(locale, "config.keyNote")}</small>
          </label>

          <label>
            <span>{t(locale, "config.timeout")}</span>
            <div className="timeout-field">
              <input
                min={1}
                step={1}
                type="number"
                value={timeoutSeconds}
                onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
              />
              <span>{t(locale, "config.seconds")}</span>
            </div>
            {errors.timeout ? <small className="error">{t(locale, "validation.timeout")}</small> : null}
          </label>

          <button className="run-button" disabled={running} onClick={handleRun} type="button">
            {running ? t(locale, "config.running") : t(locale, "config.run")}
          </button>
          <ExportButtons
            disabledLabel={t(locale, "export.disabled")}
            htmlLabel={t(locale, "export.html")}
            jsonLabel={t(locale, "export.json")}
            report={report}
          />
        </aside>

        <section className="results" aria-label={t(locale, "result.title")}>
          <StatusBanner attention={attention} error={error} locale={locale} report={report} />
          <SummaryCards
            labels={{
              passed: t(locale, "result.passed"),
              warned: t(locale, "result.warned"),
              failed: t(locale, "result.failed"),
              skipped: t(locale, "result.skipped"),
              duration: t(locale, "result.duration"),
            }}
            report={report}
          />
          <TopIssues
            emptyLabel={t(locale, "result.emptyIssues")}
            noIssuesLabel={t(locale, "result.noIssues")}
            onSelect={handleSelectResult}
            report={report}
            selectedId={selectedResult?.id ?? null}
            title={t(locale, "result.topIssues")}
          />
          {report?.summary.ok ? (
            <p className="usable-callout">
              {report.summary.warned > 0
                ? t(locale, "result.usableWithWarnings")
                : t(locale, "result.usable")}
            </p>
          ) : null}
          <AdvancedDetails
            labels={{
              title: t(locale, "advanced.title"),
              help: t(locale, "advanced.help"),
              status: t(locale, "advanced.status"),
              check: t(locale, "advanced.check"),
              severity: t(locale, "advanced.severity"),
              category: t(locale, "advanced.category"),
              message: t(locale, "advanced.message"),
              details: t(locale, "advanced.details"),
            }}
            onSelect={handleSelectResult}
            report={report}
            selected={selectedResult}
          />
        </section>
      </div>

      <footer>{t(locale, "footer.noProxy")}</footer>
    </main>
  );
}

function StatusBanner({
  attention,
  error,
  locale,
  report,
}: {
  attention: string;
  error: string | null;
  locale: Locale;
  report: WireCheckReport | null;
}) {
  const copy = getBannerCopy(attention, error, locale, report);
  return (
    <section className={`status-banner ${attention}`}>
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
    </section>
  );
}

function getBannerCopy(
  attention: string,
  error: string | null,
  locale: Locale,
  report: WireCheckReport | null,
): { title: string; body: string } {
  if (attention === "running") {
    return { title: t(locale, "result.runningTitle"), body: t(locale, "result.runningBody") };
  }
  if (attention === "ok") {
    return { title: t(locale, "result.okTitle"), body: t(locale, "result.okBody") };
  }
  if (attention === "attention") {
    return { title: t(locale, "result.attentionTitle"), body: t(locale, "result.attentionBody") };
  }
  if (attention === "failed") {
    return { title: t(locale, "result.failedTitle"), body: error ?? t(locale, "result.failedBody") };
  }
  return {
    title: t(locale, "result.readyTitle"),
    body: report ? t(locale, "result.okBody") : t(locale, "result.readyBody"),
  };
}

function validateForm(
  baseUrl: string,
  model: string,
  timeoutSeconds: number,
): { ok: boolean; errors: Partial<Record<"baseUrl" | "model" | "timeout", string>> } {
  const errors: Partial<Record<"baseUrl" | "model" | "timeout", string>> = {};
  try {
    new URL(baseUrl);
  } catch {
    errors.baseUrl = "invalid";
  }
  if (!model.trim()) errors.model = "required";
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 1) errors.timeout = "invalid";
  return { ok: Object.keys(errors).length === 0, errors };
}

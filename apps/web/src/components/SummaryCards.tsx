import type { WireCheckReport } from "@starroy/ai-ping-core";
import { formatDuration } from "../lib/result";

export function SummaryCards({
  labels,
  report,
}: {
  labels: {
    passed: string;
    warned: string;
    failed: string;
    skipped: string;
    duration: string;
  };
  report: WireCheckReport | null;
}) {
  return (
    <section className="summary-strip">
      <SummaryCard label={labels.passed} tone="pass" value={report?.summary.passed ?? 0} />
      <SummaryCard label={labels.warned} tone="warn" value={report?.summary.warned ?? 0} />
      <SummaryCard label={labels.failed} tone="fail" value={report?.summary.failed ?? 0} />
      <SummaryCard label={labels.skipped} tone="skip" value={report?.summary.skipped ?? 0} />
      <SummaryCard label={labels.duration} tone="duration" value={formatDuration(report?.durationMs)} />
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
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

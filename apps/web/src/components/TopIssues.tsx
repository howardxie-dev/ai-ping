import type { CheckResult, WireCheckReport } from "@starroy/ai-ping-core";
import { getTopIssues } from "../lib/result";

export function TopIssues({
  emptyLabel,
  noIssuesLabel,
  onSelect,
  report,
  selectedId,
  title,
}: {
  emptyLabel: string;
  noIssuesLabel: string;
  onSelect: (result: CheckResult) => void;
  report: WireCheckReport | null;
  selectedId: string | null;
  title: string;
}) {
  const issues = getTopIssues(report);
  return (
    <section className="issues-block">
      <h2>{title}</h2>
      {report ? (
        issues.length > 0 ? (
          <ol>
            {issues.map((result) => (
              <li key={result.id}>
                <button
                  className={result.id === selectedId ? "selected" : ""}
                  onClick={() => onSelect(result)}
                  type="button"
                >
                  <strong>{result.title}</strong>
                  <span>{result.message}</span>
                  <em>{result.status}</em>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="positive-callout">{noIssuesLabel}</p>
        )
      ) : (
        <p className="empty-copy">{emptyLabel}</p>
      )}
    </section>
  );
}

import type { CheckResult, WireCheckReport } from "@starroy/ai-ping-core";

export function AdvancedDetails({
  labels,
  onSelect,
  report,
  selected,
}: {
  labels: {
    title: string;
    help: string;
    status: string;
    check: string;
    severity: string;
    category: string;
    message: string;
    details: string;
  };
  onSelect: (result: CheckResult) => void;
  report: WireCheckReport | null;
  selected: CheckResult | null;
}) {
  return (
    <details className="advanced">
      <summary>
        <span>{labels.title}</span>
        <small>{labels.help}</small>
      </summary>
      {report ? (
        <div className="advanced-grid">
          <table>
            <thead>
              <tr>
                <th>{labels.status}</th>
                <th>{labels.check}</th>
                <th>{labels.message}</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((result) => (
                <tr
                  className={result.id === selected?.id ? "selected-row" : ""}
                  key={result.id}
                  onClick={() => onSelect(result)}
                >
                  <td>{result.status}</td>
                  <td>
                    <code>{result.id}</code>
                  </td>
                  <td>{result.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <aside className="details-inspector">
            {selected ? (
              <>
                <dl>
                  <div>
                    <dt>{labels.severity}</dt>
                    <dd>{selected.severity}</dd>
                  </div>
                  <div>
                    <dt>{labels.category}</dt>
                    <dd>{selected.category}</dd>
                  </div>
                  <div className="wide">
                    <dt>{labels.message}</dt>
                    <dd>{selected.message}</dd>
                  </div>
                </dl>
                <h3>{labels.details}</h3>
                <pre>{JSON.stringify(selected.details ?? {}, null, 2)}</pre>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
    </details>
  );
}

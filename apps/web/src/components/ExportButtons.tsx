import type { WireCheckReport } from "@starroy/ai-ping-core";
import { downloadReport } from "../lib/export";

export function ExportButtons({
  disabledLabel,
  htmlLabel,
  jsonLabel,
  report,
}: {
  disabledLabel: string;
  htmlLabel: string;
  jsonLabel: string;
  report: WireCheckReport | null;
}) {
  return (
    <div className="export-actions" title={!report ? disabledLabel : undefined}>
      <button disabled={!report} onClick={() => report && downloadReport(report, "json")} type="button">
        {jsonLabel}
      </button>
      <button disabled={!report} onClick={() => report && downloadReport(report, "html")} type="button">
        {htmlLabel}
      </button>
    </div>
  );
}

import { renderHtmlReport } from "@starroy/ai-ping-report";
import type { WireCheckReport } from "@starroy/ai-ping-core";

export type ExportKind = "json" | "html";

export function buildReportBlob(report: WireCheckReport, kind: ExportKind): Blob {
  if (kind === "html") {
    return new Blob([renderHtmlReport(report)], { type: "text/html" });
  }
  return new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
}

export function reportFilename(report: WireCheckReport, kind: ExportKind): string {
  const startedAt = report.startedAt.replace(/[:.]/g, "-");
  return `ai-ping-${report.profile}-${startedAt}.${kind}`;
}

export function prepareReportExport(
  report: WireCheckReport,
  kind: ExportKind,
): { blob: Blob; filename: string } {
  return {
    blob: buildReportBlob(report, kind),
    filename: reportFilename(report, kind),
  };
}

export function downloadReport(report: WireCheckReport, kind: ExportKind): void {
  const { blob, filename } = prepareReportExport(report, kind);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

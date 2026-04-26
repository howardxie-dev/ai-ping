declare module "@starroy/ai-ping-report" {
  import type { WireCheckReport } from "@starroy/ai-ping-core";

  export function renderHtmlReport(report: WireCheckReport): string;
}

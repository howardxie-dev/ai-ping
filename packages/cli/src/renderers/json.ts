import type { WireCheckReport } from "@starroy/ai-ping-core";

export function renderJsonReport(report: WireCheckReport): string {
  return JSON.stringify(report, null, 2);
}

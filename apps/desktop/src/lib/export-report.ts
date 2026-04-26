import type { WireCheckReport } from "@starroy/ai-ping-core";
import { renderHtmlReport } from "@starroy/ai-ping-report";

export type ExportKind = "json" | "html";

export class DesktopExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DesktopExportError";
  }
}

export async function exportReport(
  report: WireCheckReport,
  kind: ExportKind,
): Promise<string> {
  const content = kind === "json" ? formatJsonReport(report) : renderHtmlReport(report);
  const extension = kind === "json" ? "json" : "html";
  const defaultPath = `ai-ping-${report.profile}-${timestampForFile(report.startedAt)}.${extension}`;

  try {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const path = await save({
      defaultPath,
      filters: [
        {
          name: kind === "json" ? "JSON" : "HTML",
          extensions: [extension],
        },
      ],
    });

    if (!path) {
      throw new DesktopExportError("Export canceled.");
    }

    await writeTextFile(path, content);
    return path;
  } catch (error) {
    if (error instanceof DesktopExportError) {
      throw error;
    }
    if (isBrowserPreview()) {
      throw new DesktopExportError(
        "Export is available in the Tauri desktop app, not in browser preview.",
      );
    }
    throw new DesktopExportError(
      error instanceof Error ? `Desktop export failed: ${error.message}` : "Desktop export failed.",
    );
  }
}

export function formatJsonReport(report: WireCheckReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function timestampForFile(isoDate: string): string {
  return isoDate.replace(/[:.]/g, "-");
}

function isBrowserPreview(): boolean {
  return !("__TAURI_INTERNALS__" in window);
}

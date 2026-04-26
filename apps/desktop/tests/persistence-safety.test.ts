import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const desktopDir = join(testDir, "..");
const srcDir = join(desktopDir, "src");

describe("desktop persistence safety", () => {
  it("keeps API keys out of browser persistence APIs", () => {
    const findings = sourceFiles(srcDir)
      .map((filePath) => ({
        filePath,
        source: readFileSync(filePath, "utf8"),
      }))
      .filter(({ source }) => mentionsPersistence(source) && mentionsApiKey(source))
      .map(({ filePath }) => relative(desktopDir, filePath));

    expect(findings).toEqual([]);
  });

  it("documents that API keys are memory-only in the UI copy", () => {
    const appSource = readFileSync(join(srcDir, "App.tsx"), "utf8");

    expect(appSource).toContain(
      "API keys are kept in memory and are not saved.",
    );
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      return sourceFiles(filePath);
    }

    return /\.(ts|tsx)$/.test(entry) ? [filePath] : [];
  });
}

function mentionsPersistence(source: string): boolean {
  return /\b(localStorage|sessionStorage|indexedDB|IndexedDB)\b/.test(source);
}

function mentionsApiKey(source: string): boolean {
  return /\b(apiKey|api key|API key|authorization|Authorization)\b/.test(source);
}

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeTextFileEnsuringDir } from "../src/write-file";

describe("writeTextFileEnsuringDir", () => {
  let tempDir: string;
  let previousCwd: string;

  beforeEach(async () => {
    previousCwd = process.cwd();
    tempDir = await mkdtemp(join(tmpdir(), "ai-ping-write-file-"));
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(tempDir, { recursive: true, force: true });
  });

  it("writes a utf8 file in the current directory", async () => {
    process.chdir(tempDir);
    const filePath = "report.html";
    const content = "AI Ping café report";

    await writeTextFileEnsuringDir(filePath, content);

    await expect(readFile(join(tempDir, filePath), "utf8")).resolves.toBe(
      content,
    );
  });

  it("creates parent directories before writing a nested utf8 file", async () => {
    const filePath = join(tempDir, "nested", "reports", "report.html");
    const content = "nested report 測試";

    await writeTextFileEnsuringDir(filePath, content);

    await expect(readFile(filePath, "utf8")).resolves.toBe(content);
  });
});

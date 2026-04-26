import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../src/main";

vi.mock("@starroy/ai-ping-core", () => ({
  getProfile: vi.fn(),
  listChecks: vi.fn(),
  listProfiles: vi.fn(),
  runChecks: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

async function helpOutput(argv: string[]): Promise<string> {
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

  await main(["node", "aiping", ...argv]);

  return log.mock.calls.map(([message]) => String(message)).join("\n");
}

describe("CLI help stability", () => {
  it("keeps the stable public commands in root help", async () => {
    const output = await helpOutput(["--help"]);

    expect(output).toContain("aiping check");
    expect(output).toContain("aiping profiles");
    expect(output).toContain("aiping checks");
  });

  it("keeps stable check options in command help", async () => {
    const output = await helpOutput(["check", "--help"]);

    expect(output).toContain("--profile");
    expect(output).toContain("--base-url");
    expect(output).toContain("--model");
    expect(output).toContain("--api-key");
    expect(output).toContain("--timeout");
    expect(output).toContain("--json");
    expect(output).toContain("--html");
    expect(output).toContain("--only");
    expect(output).toContain("--skip");
    expect(output).toContain("--verbose");
  });

  it("prints the v1 CLI version", async () => {
    const output = await helpOutput(["--version"]);

    expect(output).toContain("aiping/1.2.0");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProtocolProfile, RunChecksOptions } from "@starroy/ai-ping-core";
import { runCheckCommand } from "../src/commands/check";
import { runChecksCommand } from "../src/commands/checks";
import { runProfilesCommand } from "../src/commands/profiles";
import { CliUsageError, EXIT_CHECK_FAILED, EXIT_OK } from "../src/exit-code";
import { makeCheck, makeProfile, makeReport, makeResult } from "./helpers";

const coreMocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  listChecks: vi.fn(),
  listProfiles: vi.fn(),
  runChecks: vi.fn(),
}));

vi.mock("@starroy/ai-ping-core", () => coreMocks);

describe("runCheckCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coreMocks.getProfile.mockReturnValue(makeProfile());
  });

  it("runs checks with parsed options, resolved API key, and console output", async () => {
    const report = makeReport();
    const runChecks = vi.fn().mockResolvedValue(report);
    const writeStdout = vi.fn();
    const setExitCode = vi.fn();

    await runCheckCommand(
      {
        profile: "openai",
        baseUrl: "https://api.example.test/v1",
        model: "gpt-test",
        timeout: "2500",
        only: ["chat.basic,error.format", "chat.basic"],
        skip: "chat.stream",
        verbose: true,
      },
      {
        runChecks,
        env: { OPENAI_API_KEY: "openai-key" },
        writeStdout,
        setExitCode,
      },
    );

    expect(coreMocks.getProfile).toHaveBeenCalledWith("openai");
    expect(runChecks).toHaveBeenCalledWith({
      profile: "openai",
      baseUrl: "https://api.example.test/v1",
      model: "gpt-test",
      apiKey: "openai-key",
      timeoutMs: 2500,
      only: ["chat.basic", "error.format"],
      skip: ["chat.stream"],
    } satisfies RunChecksOptions);
    expect(writeStdout).toHaveBeenCalledWith(
      expect.stringContaining("AI Ping"),
    );
    expect(writeStdout).toHaveBeenCalledWith(
      expect.stringContaining("required     42ms"),
    );
    expect(setExitCode).toHaveBeenCalledWith(EXIT_OK);
  });

  it("prefers the explicit API key and renders JSON when requested", async () => {
    const report = makeReport({
      results: [makeResult({ status: "fail" })],
      summary: {
        passed: 0,
        warned: 0,
        failed: 1,
        skipped: 0,
        total: 1,
        requiredFailed: 1,
        ok: false,
      },
    });
    const runChecks = vi.fn().mockResolvedValue(report);
    const writeStdout = vi.fn();
    const setExitCode = vi.fn();

    await runCheckCommand(
      {
        profile: "openai",
        baseUrl: "https://api.example.test/v1",
        model: "gpt-test",
        apiKey: "explicit-key",
        json: true,
      },
      {
        runChecks,
        env: { AI_PING_API_KEY: "env-key" },
        writeStdout,
        setExitCode,
      },
    );

    expect(runChecks).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "explicit-key" }),
    );
    expect(writeStdout).toHaveBeenCalledWith(JSON.stringify(report, null, 2));
    expect(setExitCode).toHaveBeenCalledWith(EXIT_CHECK_FAILED);
  });

  it("runs Ollama checks without requiring an API key", async () => {
    coreMocks.getProfile.mockReturnValue(
      makeProfile({
        id: "ollama",
        name: "Ollama API",
        description: "Checks common Ollama local API behaviors.",
      }),
    );
    const report = makeReport({
      profile: "ollama",
      endpoint: "http://localhost:11434",
      model: "llama3.2",
    });
    const runChecks = vi.fn().mockResolvedValue(report);

    await runCheckCommand(
      {
        profile: "ollama",
        baseUrl: "http://localhost:11434",
        model: "llama3.2",
      },
      {
        runChecks,
        env: {},
        writeStdout: vi.fn(),
        setExitCode: vi.fn(),
      },
    );

    expect(runChecks).toHaveBeenCalledWith({
      profile: "ollama",
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
      apiKey: undefined,
      timeoutMs: undefined,
      only: undefined,
      skip: undefined,
    } satisfies RunChecksOptions);
  });

  it("runs Gemini checks with GEMINI_API_KEY", async () => {
    coreMocks.getProfile.mockReturnValue(
      makeProfile({
        id: "gemini",
        name: "Gemini API",
        description: "Checks common Gemini Developer API REST behaviors.",
      }),
    );
    const report = makeReport({
      profile: "gemini",
      endpoint: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-2.5-flash",
    });
    const runChecks = vi.fn().mockResolvedValue(report);

    await runCheckCommand(
      {
        profile: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        model: "gemini-2.5-flash",
      },
      {
        runChecks,
        env: { GEMINI_API_KEY: "gemini-key" },
        writeStdout: vi.fn(),
        setExitCode: vi.fn(),
      },
    );

    expect(runChecks).toHaveBeenCalledWith({
      profile: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-2.5-flash",
      apiKey: "gemini-key",
      timeoutMs: undefined,
      only: undefined,
      skip: undefined,
    } satisfies RunChecksOptions);
  });


  it.each([
    [{ baseUrl: "https://api.example.test/v1", model: "gpt-test" }, "--profile"],
    [{ profile: "openai", model: "gpt-test" }, "--base-url"],
    [{ profile: "openai", baseUrl: "https://api.example.test/v1" }, "--model"],
  ])("throws a usage error when %s is missing", async (options, optionName) => {
    await expect(
      runCheckCommand(options, {
        runChecks: vi.fn(),
        env: {},
        writeStdout: vi.fn(),
        setExitCode: vi.fn(),
      }),
    ).rejects.toThrow(new CliUsageError(`Missing required option: ${optionName}`));
  });

  it("throws a usage error for unsupported profiles", async () => {
    coreMocks.getProfile.mockReturnValue(undefined);

    await expect(
      runCheckCommand(
        {
          profile: "unknown",
          baseUrl: "https://api.example.test/v1",
          model: "gpt-test",
        },
        {
          runChecks: vi.fn(),
          env: {},
          writeStdout: vi.fn(),
          setExitCode: vi.fn(),
        },
      ),
    ).rejects.toThrow(new CliUsageError("Unsupported profile: unknown"));
  });

  it.each([0, -1, "0", "abc"])(
    "throws a usage error for invalid timeout %s",
    async (timeout) => {
      await expect(
        runCheckCommand(
          {
            profile: "openai",
            baseUrl: "https://api.example.test/v1",
            model: "gpt-test",
            timeout,
          },
          {
            runChecks: vi.fn(),
            env: {},
            writeStdout: vi.fn(),
            setExitCode: vi.fn(),
          },
        ),
      ).rejects.toThrow(
        new CliUsageError("Invalid option: --timeout must be a positive integer"),
      );
    },
  );
});

describe("runProfilesCommand", () => {
  it("lists available profiles and exits successfully", async () => {
    const profiles: ProtocolProfile[] = [
      makeProfile({
        id: "openai",
        name: "OpenAI-compatible",
        description: "OpenAI-compatible APIs",
      }),
      makeProfile({
        id: "ollama",
        name: "Ollama API",
        description: "Checks common Ollama local API behaviors.",
        checks: [],
      }),
      makeProfile({
        id: "gemini",
        name: "Gemini API",
        description: "Checks common Gemini Developer API REST behaviors.",
        checks: [],
      }),
    ];
    const writeStdout = vi.fn();
    const setExitCode = vi.fn();

    await runProfilesCommand({
      listProfiles: vi.fn(() => profiles),
      writeStdout,
      setExitCode,
    });

    expect(writeStdout).toHaveBeenCalledWith(
      [
        "Available profiles:",
        "openai",
        "  OpenAI-compatible",
        "  OpenAI-compatible APIs",
        "ollama",
        "  Ollama API",
        "  Checks common Ollama local API behaviors.",
        "gemini",
        "  Gemini API",
        "  Checks common Gemini Developer API REST behaviors.",
      ].join("\n"),
    );
    expect(setExitCode).toHaveBeenCalledWith(EXIT_OK);
  });
});

describe("runChecksCommand", () => {
  it("lists checks for the selected profile and exits successfully", async () => {
    const writeStdout = vi.fn();
    const setExitCode = vi.fn();
    const getProfile = vi.fn(() => makeProfile());
    const listChecks = vi.fn(() => [
      makeCheck({ id: "chat.basic", severity: "required", title: "Chat basic" }),
      makeCheck({
        id: "chat.stream",
        severity: "recommended",
        title: "Chat streaming",
      }),
    ]);

    await runChecksCommand(
      { profile: "openai" },
      { getProfile, listChecks, writeStdout, setExitCode },
    );

    expect(getProfile).toHaveBeenCalledWith("openai");
    expect(listChecks).toHaveBeenCalledWith("openai");
    expect(writeStdout).toHaveBeenCalledWith(
      [
        "Checks for profile: openai",
        "required     chat.basic             Chat basic",
        "recommended  chat.stream            Chat streaming",
      ].join("\n"),
    );
    expect(setExitCode).toHaveBeenCalledWith(EXIT_OK);
  });

  it("lists Ollama checks for the selected profile", async () => {
    const writeStdout = vi.fn();
    const setExitCode = vi.fn();
    const getProfile = vi.fn(() =>
      makeProfile({
        id: "ollama",
        name: "Ollama API",
        description: "Checks common Ollama local API behaviors.",
      }),
    );
    const listChecks = vi.fn(() => [
      makeCheck({
        id: "ollama.tags",
        severity: "recommended",
        title: "Tags / models list",
      }),
      makeCheck({
        id: "ollama.generate.basic",
        severity: "required",
        title: "Basic generation",
      }),
      makeCheck({
        id: "ollama.generate.stream",
        severity: "required",
        title: "Streaming generation",
      }),
      makeCheck({
        id: "ollama.chat.basic",
        severity: "required",
        title: "Basic chat",
      }),
      makeCheck({
        id: "ollama.chat.stream",
        severity: "required",
        title: "Streaming chat",
      }),
    ]);

    await runChecksCommand(
      { profile: "ollama" },
      { getProfile, listChecks, writeStdout, setExitCode },
    );

    expect(getProfile).toHaveBeenCalledWith("ollama");
    expect(listChecks).toHaveBeenCalledWith("ollama");
    expect(writeStdout).toHaveBeenCalledWith(
      [
        "Checks for profile: ollama",
        "recommended  ollama.tags            Tags / models list",
        "required     ollama.generate.basic  Basic generation",
        "required     ollama.generate.stream Streaming generation",
        "required     ollama.chat.basic      Basic chat",
        "required     ollama.chat.stream     Streaming chat",
      ].join("\n"),
    );
    expect(setExitCode).toHaveBeenCalledWith(EXIT_OK);
  });

  it("lists Gemini checks for the selected profile", async () => {
    const writeStdout = vi.fn();
    const setExitCode = vi.fn();
    const getProfile = vi.fn(() =>
      makeProfile({
        id: "gemini",
        name: "Gemini API",
        description: "Checks common Gemini Developer API REST behaviors.",
      }),
    );
    const listChecks = vi.fn(() => [
      makeCheck({
        id: "gemini.models.list",
        severity: "recommended",
        title: "Models list",
      }),
      makeCheck({
        id: "gemini.generate.basic",
        severity: "required",
        title: "Basic content generation",
      }),
      makeCheck({
        id: "gemini.generate.stream",
        severity: "required",
        title: "Streaming content generation",
      }),
      makeCheck({
        id: "gemini.error.format",
        severity: "recommended",
        title: "Error response format",
      }),
    ]);

    await runChecksCommand(
      { profile: "gemini" },
      { getProfile, listChecks, writeStdout, setExitCode },
    );

    expect(getProfile).toHaveBeenCalledWith("gemini");
    expect(listChecks).toHaveBeenCalledWith("gemini");
    expect(writeStdout).toHaveBeenCalledWith(
      [
        "Checks for profile: gemini",
        "recommended  gemini.models.list     Models list",
        "required     gemini.generate.basic  Basic content generation",
        "required     gemini.generate.stream Streaming content generation",
        "recommended  gemini.error.format    Error response format",
      ].join("\n"),
    );
    expect(setExitCode).toHaveBeenCalledWith(EXIT_OK);
  });

  it("throws a usage error when profile is missing", async () => {
    await expect(
      runChecksCommand(
        {},
        {
          getProfile: vi.fn(),
          listChecks: vi.fn(),
          writeStdout: vi.fn(),
          setExitCode: vi.fn(),
        },
      ),
    ).rejects.toThrow(new CliUsageError("Missing required option: --profile"));
  });

  it("throws a usage error for unsupported profiles", async () => {
    await expect(
      runChecksCommand(
        { profile: "unknown" },
        {
          getProfile: vi.fn(() => undefined),
          listChecks: vi.fn(),
          writeStdout: vi.fn(),
          setExitCode: vi.fn(),
        },
      ),
    ).rejects.toThrow(new CliUsageError("Unsupported profile: unknown"));
  });
});

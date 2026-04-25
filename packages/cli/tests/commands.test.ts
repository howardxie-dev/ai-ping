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
      profile: "openai-chat",
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

  it("runs Anthropic checks with ANTHROPIC_API_KEY", async () => {
    coreMocks.getProfile.mockReturnValue(
      makeProfile({
        id: "anthropic",
        name: "Anthropic API",
        description: "Checks common Anthropic Claude Messages API behaviors.",
      }),
    );
    const report = makeReport({
      profile: "anthropic",
      endpoint: "https://api.anthropic.com/v1",
      model: "claude-sonnet-4-5",
    });
    const runChecks = vi.fn().mockResolvedValue(report);

    await runCheckCommand(
      {
        profile: "anthropic",
        baseUrl: "https://api.anthropic.com/v1",
        model: "claude-sonnet-4-5",
      },
      {
        runChecks,
        env: { ANTHROPIC_API_KEY: "anthropic-key" },
        writeStdout: vi.fn(),
        setExitCode: vi.fn(),
      },
    );

    expect(runChecks).toHaveBeenCalledWith({
      profile: "anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-sonnet-4-5",
      apiKey: "anthropic-key",
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
        id: "openai-chat",
        aliases: ["openai"],
        name: "OpenAI Chat Completions",
        description: "Checks OpenAI-compatible Chat Completions API behavior.",
      }),
      makeProfile({
        id: "openai-responses",
        name: "OpenAI Responses API",
        description: "Checks OpenAI-compatible Responses API behavior.",
        checks: [],
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
      makeProfile({
        id: "anthropic",
        name: "Anthropic API",
        description: "Checks common Anthropic Claude Messages API behaviors.",
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
        "openai-chat",
        "  OpenAI Chat Completions",
        "  Checks OpenAI-compatible Chat Completions API behavior.",
        "  Aliases: openai",
        "openai-responses",
        "  OpenAI Responses API",
        "  Checks OpenAI-compatible Responses API behavior.",
        "ollama",
        "  Ollama API",
        "  Checks common Ollama local API behaviors.",
        "gemini",
        "  Gemini API",
        "  Checks common Gemini Developer API REST behaviors.",
        "anthropic",
        "  Anthropic API",
        "  Checks common Anthropic Claude Messages API behaviors.",
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
    expect(listChecks).toHaveBeenCalledWith("openai-chat");
    expect(writeStdout).toHaveBeenCalledWith(
      [
        "Checks for profile: openai-chat",
        "required     chat.basic             Chat basic",
        "recommended  chat.stream            Chat streaming",
      ].join("\n"),
    );
    expect(setExitCode).toHaveBeenCalledWith(EXIT_OK);
  });

  it("lists OpenAI tool call checks for the selected profile", async () => {
    const writeStdout = vi.fn();
    const setExitCode = vi.fn();
    const getProfile = vi.fn(() => makeProfile());
    const listChecks = vi.fn(() => [
      makeCheck({
        id: "openai-chat.models.list",
        severity: "recommended",
        title: "Models list",
      }),
      makeCheck({
        id: "openai-chat.chat.basic",
        severity: "required",
        title: "Basic chat completion",
      }),
      makeCheck({
        id: "openai-chat.chat.stream",
        severity: "required",
        title: "Streaming chat completion",
      }),
      makeCheck({
        id: "openai-chat.tool_calls.basic",
        severity: "recommended",
        title: "Basic tool calls",
      }),
      makeCheck({
        id: "openai-chat.tool_calls.stream",
        severity: "recommended",
        title: "Streaming tool calls",
      }),
      makeCheck({
        id: "openai-chat.error.format",
        severity: "recommended",
        title: "Error response format",
      }),
    ]);

    await runChecksCommand(
      { profile: "openai" },
      { getProfile, listChecks, writeStdout, setExitCode },
    );

    expect(writeStdout).toHaveBeenCalledWith(
      [
        "Checks for profile: openai-chat",
        "recommended  openai-chat.models.list Models list",
        "required     openai-chat.chat.basic Basic chat completion",
        "required     openai-chat.chat.stream Streaming chat completion",
        "recommended  openai-chat.tool_calls.basic Basic tool calls",
        "recommended  openai-chat.tool_calls.stream Streaming tool calls",
        "recommended  openai-chat.error.format Error response format",
      ].join("\n"),
    );
    expect(setExitCode).toHaveBeenCalledWith(EXIT_OK);
  });

  it("lists OpenAI Responses checks for the selected profile", async () => {
    const writeStdout = vi.fn();
    const setExitCode = vi.fn();
    const getProfile = vi.fn(() =>
      makeProfile({
        id: "openai-responses",
        name: "OpenAI Responses API",
        description: "Checks OpenAI-compatible Responses API behavior.",
      }),
    );
    const listChecks = vi.fn(() => [
      makeCheck({
        id: "openai-responses.models.list",
        severity: "recommended",
        title: "Models list",
      }),
      makeCheck({
        id: "openai-responses.responses.basic",
        severity: "required",
        title: "Basic response",
      }),
      makeCheck({
        id: "openai-responses.responses.stream",
        severity: "required",
        title: "Streaming response",
      }),
      makeCheck({
        id: "openai-responses.error.format",
        severity: "recommended",
        title: "Error response format",
      }),
    ]);

    await runChecksCommand(
      { profile: "openai-responses" },
      { getProfile, listChecks, writeStdout, setExitCode },
    );

    expect(getProfile).toHaveBeenCalledWith("openai-responses");
    expect(listChecks).toHaveBeenCalledWith("openai-responses");
    expect(writeStdout).toHaveBeenCalledWith(
      [
        "Checks for profile: openai-responses",
        "recommended  openai-responses.models.list Models list",
        "required     openai-responses.responses.basic Basic response",
        "required     openai-responses.responses.stream Streaming response",
        "recommended  openai-responses.error.format Error response format",
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

  it("lists Anthropic checks for the selected profile", async () => {
    const writeStdout = vi.fn();
    const setExitCode = vi.fn();
    const getProfile = vi.fn(() =>
      makeProfile({
        id: "anthropic",
        name: "Anthropic API",
        description: "Checks common Anthropic Claude Messages API behaviors.",
      }),
    );
    const listChecks = vi.fn(() => [
      makeCheck({
        id: "anthropic.models.list",
        severity: "recommended",
        title: "Models list",
      }),
      makeCheck({
        id: "anthropic.messages.basic",
        severity: "required",
        title: "Basic message",
      }),
      makeCheck({
        id: "anthropic.messages.stream",
        severity: "required",
        title: "Streaming message",
      }),
      makeCheck({
        id: "anthropic.error.format",
        severity: "recommended",
        title: "Error response format",
      }),
    ]);

    await runChecksCommand(
      { profile: "anthropic" },
      { getProfile, listChecks, writeStdout, setExitCode },
    );

    expect(getProfile).toHaveBeenCalledWith("anthropic");
    expect(listChecks).toHaveBeenCalledWith("anthropic");
    expect(writeStdout).toHaveBeenCalledWith(
      [
        "Checks for profile: anthropic",
        "recommended  anthropic.models.list  Models list",
        "required     anthropic.messages.basic Basic message",
        "required     anthropic.messages.stream Streaming message",
        "recommended  anthropic.error.format Error response format",
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

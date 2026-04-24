import type {
  CheckResult,
  ProtocolProfile,
  WireCheck,
  WireCheckReport,
} from "@starroy/ai-ping-core";

export function makeResult(
  overrides: Partial<CheckResult> = {},
): CheckResult {
  return {
    id: "chat.basic",
    title: "Chat basic",
    profile: "openai",
    category: "generation",
    severity: "required",
    status: "pass",
    message: "chat completion succeeded",
    durationMs: 42,
    ...overrides,
  };
}

export function makeReport(
  overrides: Partial<WireCheckReport> = {},
): WireCheckReport {
  const results = overrides.results ?? [makeResult()];
  const summary = overrides.summary ?? {
    passed: results.filter((result) => result.status === "pass").length,
    warned: results.filter((result) => result.status === "warn").length,
    failed: results.filter((result) => result.status === "fail").length,
    skipped: results.filter((result) => result.status === "skip").length,
    total: results.length,
    requiredFailed: results.filter(
      (result) => result.status === "fail" && result.severity === "required",
    ).length,
    ok: !results.some(
      (result) => result.status === "fail" && result.severity === "required",
    ),
  };

  return {
    tool: "ai-ping",
    version: "0.4.0",
    profile: "openai",
    endpoint: "https://api.example.test/v1",
    model: "gpt-test",
    startedAt: "2026-04-24T08:00:00.000Z",
    durationMs: 123,
    summary,
    results,
    ...overrides,
  };
}

export function makeCheck(overrides: Partial<WireCheck> = {}): WireCheck {
  return {
    id: "chat.basic",
    title: "Chat basic",
    category: "generation",
    severity: "required",
    run: async () => makeResult(),
    ...overrides,
  };
}

export function makeProfile(
  overrides: Partial<ProtocolProfile> = {},
): ProtocolProfile {
  return {
    id: "openai",
    name: "OpenAI-compatible",
    description: "OpenAI-compatible chat completions API",
    checks: [makeCheck()],
    ...overrides,
  };
}

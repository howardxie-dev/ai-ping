import type {
  CheckCategory,
  CheckResult,
  CheckSeverity,
  CheckStatus,
} from "../../../types";

export function checkResult(input: {
  id: string;
  title: string;
  profile: string;
  category: CheckCategory;
  severity: CheckSeverity;
  status: CheckStatus;
  message: string;
  startedAt: number;
  details?: Record<string, unknown>;
}): CheckResult {
  return {
    id: input.id,
    title: input.title,
    profile: input.profile,
    category: input.category,
    severity: input.severity,
    status: input.status,
    message: input.message,
    durationMs: Math.round(performance.now() - input.startedAt),
    details: input.details,
  };
}

export function failureMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "Request failed: timeout";
    return `Request failed: ${error.message}`;
  }
  return `Request failed: ${String(error)}`;
}

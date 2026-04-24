export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export type CheckSeverity = "required" | "recommended" | "optional";

export type CheckCategory =
  | "generation"
  | "streaming"
  | "errors"
  | "models"
  | "tools"
  | "metadata";

export interface RunChecksOptions {
  profile: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  only?: string[];
  skip?: string[];
}

export interface CheckContext {
  profile: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
  headers: Record<string, string>;
  request: AiPingHttpClient;
}

export interface CheckResult {
  id: string;
  title: string;
  profile: string;
  category: CheckCategory;
  severity: CheckSeverity;
  status: CheckStatus;
  message: string;
  details?: Record<string, unknown>;
  durationMs: number;
}

export interface WireCheck {
  id: string;
  title: string;
  category: CheckCategory;
  severity: CheckSeverity;
  run(ctx: CheckContext): Promise<CheckResult>;
}

export interface ProtocolProfile {
  id: string;
  name: string;
  description: string;
  checks: WireCheck[];
}

export interface ReportSummary {
  passed: number;
  warned: number;
  failed: number;
  skipped: number;
  total: number;
  requiredFailed: number;
  ok: boolean;
}

export interface WireCheckReport {
  tool: "ai-ping";
  version: string;
  profile: string;
  endpoint: string;
  model: string;
  startedAt: string;
  durationMs: number;
  summary: ReportSummary;
  results: CheckResult[];
}

export interface AiPingHttpClient {
  json<T = unknown>(input: HttpRequestInput): Promise<HttpJsonResponse<T>>;
  stream(input: HttpRequestInput): Promise<HttpStreamResponse>;
}

export interface HttpRequestInput {
  method: "GET" | "POST";
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface HttpJsonResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
  rawText: string;
}

export interface HttpStreamResponse {
  status: number;
  headers: Record<string, string>;
  chunks: string[];
  done: boolean;
  rawText: string;
}

export class AiPingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiPingConfigError";
  }
}

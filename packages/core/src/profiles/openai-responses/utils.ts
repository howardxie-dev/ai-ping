import type {
  CheckCategory,
  CheckResult,
  CheckSeverity,
  CheckStatus,
} from "../../types";

export interface OpenAIResponsesStreamSummary {
  eventCount: number;
  responsesEventCount: number;
  textDeltaCount: number;
  totalTextLength: number;
  hasResponseCreated: boolean;
  hasResponseCompleted: boolean;
  hasResponseFailed: boolean;
  hasResponseError: boolean;
  eventTypes: string[];
  unknownResponseEventTypes: string[];
}

const KNOWN_RESPONSE_EVENT_TYPES = new Set([
  "response.created",
  "response.in_progress",
  "response.output_item.added",
  "response.output_item.done",
  "response.content_part.added",
  "response.content_part.done",
  "response.output_text.delta",
  "response.output_text.done",
  "response.completed",
  "response.failed",
  "response.error",
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getStringField(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  return typeof value[key] === "string" ? value[key] : undefined;
}

export function getArrayField(
  value: Record<string, unknown>,
  key: string,
): unknown[] | undefined {
  return Array.isArray(value[key]) ? value[key] : undefined;
}

export function collectResponseOutputTexts(value: unknown): string[] {
  if (!isRecord(value)) return [];

  const texts: string[] = [];
  if (typeof value.output_text === "string") {
    texts.push(value.output_text);
  }

  if (Array.isArray(value.output)) {
    for (const outputItem of value.output) {
      if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
        continue;
      }

      for (const contentItem of outputItem.content) {
        if (!isRecord(contentItem)) continue;
        if (typeof contentItem.text === "string") {
          texts.push(contentItem.text);
          continue;
        }
        if (
          contentItem.type === "output_text" &&
          typeof contentItem.output_text === "string"
        ) {
          texts.push(contentItem.output_text);
        }
      }
    }
  }

  return texts;
}

export function summarizeResponseStreamEvents(
  jsonChunks: unknown[],
): OpenAIResponsesStreamSummary {
  const eventTypes = new Set<string>();
  const unknownResponseEventTypes = new Set<string>();
  let eventCount = 0;
  let responsesEventCount = 0;
  let textDeltaCount = 0;
  let totalTextLength = 0;
  let hasResponseCreated = false;
  let hasResponseCompleted = false;
  let hasResponseFailed = false;
  let hasResponseError = false;

  for (const chunk of jsonChunks) {
    if (!isRecord(chunk) || typeof chunk.type !== "string") continue;

    eventCount += 1;
    eventTypes.add(chunk.type);

    if (isResponsesEventType(chunk.type)) {
      responsesEventCount += 1;
    }
    if (chunk.type.startsWith("response.") && !KNOWN_RESPONSE_EVENT_TYPES.has(chunk.type)) {
      unknownResponseEventTypes.add(chunk.type);
    }

    if (chunk.type === "response.created") hasResponseCreated = true;
    if (chunk.type === "response.completed") hasResponseCompleted = true;
    if (chunk.type === "response.failed") hasResponseFailed = true;
    if (chunk.type === "response.error") hasResponseError = true;

    if (chunk.type === "response.output_text.delta" && typeof chunk.delta === "string") {
      textDeltaCount += 1;
      totalTextLength += chunk.delta.length;
    }

    const nestedTexts = collectCompletedResponseTexts(chunk);
    totalTextLength += nestedTexts.reduce((sum, text) => sum + text.length, 0);
  }

  return {
    eventCount,
    responsesEventCount,
    textDeltaCount,
    totalTextLength,
    hasResponseCreated,
    hasResponseCompleted,
    hasResponseFailed,
    hasResponseError,
    eventTypes: [...eventTypes],
    unknownResponseEventTypes: [...unknownResponseEventTypes],
  };
}

export function collectCompletedResponseTexts(event: unknown): string[] {
  if (!isRecord(event)) return [];

  const texts = collectResponseOutputTexts(event);
  if (
    event.type === "response.output_text.done" &&
    typeof event.text === "string"
  ) {
    texts.push(event.text);
  }
  if (isRecord(event.response)) {
    texts.push(...collectResponseOutputTexts(event.response));
  }

  return texts;
}

export function isResponsesEventType(type: string): boolean {
  return KNOWN_RESPONSE_EVENT_TYPES.has(type) || type.startsWith("response.");
}

export function responsesPayload(model: string, stream = false) {
  return {
    model,
    input: "Reply with exactly: pong",
    ...(stream ? { stream: true } : {}),
  };
}

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

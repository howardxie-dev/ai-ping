const SENSITIVE_KEYS = new Set([
  "authorization",
  "api_key",
  "apikey",
  "x-api-key",
  "key",
  "token",
]);

export function maskSecret(value: unknown): unknown {
  if (typeof value !== "string") return "<redacted>";
  if (value.length < 8) return "<redacted>";

  return `${value.slice(0, 5)}********${value.slice(-2)}`;
}

export function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        isSensitiveKey(key) ? maskSecret(entry) : sanitizeValue(entry),
      ]),
    );
  }

  return value;
}

export function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return sanitizeValue(headers) as Record<string, string>;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

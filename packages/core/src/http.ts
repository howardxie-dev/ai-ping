import type {
  AiPingHttpClient,
  HttpJsonResponse,
  HttpRequestInput,
  HttpStreamResponse,
} from "./types";

export function createHttpClient(options: {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeoutMs: number;
}): AiPingHttpClient {
  return {
    async json<T = unknown>(
      input: HttpRequestInput,
    ): Promise<HttpJsonResponse<T>> {
      const response = await send(options, input);
      const rawText = await response.text();
      let body: T;

      try {
        body = JSON.parse(rawText) as T;
      } catch {
        throw new Error(
          rawText.length === 0
            ? "JSON parse failed: response body is empty"
            : "JSON parse failed: response body is not valid JSON",
        );
      }

      return {
        status: response.status,
        headers: toHeaderRecord(response.headers),
        body,
        rawText,
      };
    },

    async stream(input: HttpRequestInput): Promise<HttpStreamResponse> {
      const response = await send(options, input);
      const rawText = await response.text();

      return {
        status: response.status,
        headers: toHeaderRecord(response.headers),
        chunks: rawText.split(/\r?\n\r?\n/).filter(Boolean),
        done: true,
        rawText,
      };
    },
  };
}

function send(
  options: {
    baseUrl: string;
    apiKey?: string;
    headers?: Record<string, string>;
    timeoutMs: number;
  },
  input: HttpRequestInput,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? options.timeoutMs;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...options.headers,
    ...input.headers,
  };

  if (options.apiKey && !hasHeader(headers, "authorization")) {
    headers.authorization = `Bearer ${options.apiKey}`;
  }

  return fetch(joinUrl(options.baseUrl, input.path), {
    method: input.method,
    headers,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
}

export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name);
}

function toHeaderRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

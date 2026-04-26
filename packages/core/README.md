# @starroy/ai-ping-core

Reusable protocol checks for AI and LLM API endpoints.

## Supported profiles

| Profile | API style | Authentication | Streaming | Alias |
| --- | --- | --- | --- | --- |
| `openai-chat` | OpenAI-compatible Chat Completions API | Usually requires an API key | SSE | `openai` |
| `openai-responses` | OpenAI-compatible Responses API | Usually requires an API key | Semantic SSE events | |
| `ollama` | Ollama local APIs | No API key by default | JSON lines | |
| `gemini` | Gemini Developer API REST | `x-goog-api-key` | SSE | |
| `anthropic` | Anthropic Claude Messages API | `x-api-key` + `anthropic-version` | SSE | |

The OpenAI-compatible Chat Completions profile currently includes:

- `openai-chat.models.list`
- `openai-chat.chat.basic`
- `openai-chat.chat.stream`
- `openai-chat.tool_calls.basic`
- `openai-chat.tool_calls.stream`
- `openai-chat.error.format`

The canonical profile id is `openai-chat`. The older `openai` profile id remains
supported as a backward-compatible alias. This profile sends Chat
Completions-style `messages` requests and validates `choices[].message` /
`choices[].delta` responses.

The OpenAI-compatible tool call checks validate modern Chat Completions `tools`
/ `tool_calls`, including streaming `delta.tool_calls` argument assembly and
JSON parsing. They are recommended checks; legacy `function_call` is detected
but does not pass modern tool call compatibility.

The OpenAI-compatible Responses profile currently includes:

- `openai-responses.models.list`
- `openai-responses.responses.basic`
- `openai-responses.responses.stream`
- `openai-responses.error.format`

The canonical profile id is `openai-responses`. It covers `POST /responses`,
sends Responses-style `input` requests, and validates `output`, `output_text`,
and semantic streaming events such as `response.output_text.delta`. It does not
check Responses tools, built-in tools, multimodal input, or conversation state
in v0.10.

The Ollama profile currently includes:

- `ollama.tags`
- `ollama.generate.basic`
- `ollama.generate.stream`
- `ollama.chat.basic`
- `ollama.chat.stream`

This covers Ollama native `/api/tags`, `/api/generate`, and `/api/chat`.
`/api/generate` is Ollama's prompt-style native API, while `/api/chat` is its
messages-style native API. For Ollama's OpenAI-compatible
`/v1/chat/completions`, use the `openai-chat` profile instead.

The Gemini profile currently includes:

- `gemini.models.list`
- `gemini.generate.basic`
- `gemini.generate.stream`
- `gemini.error.format`

This covers Gemini Developer API REST endpoints under a base URL such as
`https://generativelanguage.googleapis.com/v1beta`. It uses `x-goog-api-key`
authentication and SSE streaming with Gemini response chunks, not OpenAI delta
chunks.

The Anthropic profile currently includes:

- `anthropic.models.list`
- `anthropic.messages.basic`
- `anthropic.messages.stream`
- `anthropic.error.format`

This covers Anthropic Claude Messages API endpoints under a base URL such as
`https://api.anthropic.com/v1`. It uses `x-api-key` and
`anthropic-version: 2023-06-01`. Anthropic streaming is event-based SSE, not
OpenAI delta streaming. Tool use, extended thinking, Bedrock Anthropic, and
Vertex AI Anthropic are not covered by this profile.

```ts
import { runChecks } from "@starroy/ai-ping-core";

const report = await runChecks({
  profile: "openai-chat",
  baseUrl: "http://localhost:3000/v1",
  apiKey: "sk-test",
  model: "gpt-5.5",
});
```

```ts
const report = await runChecks({
  profile: "openai-responses",
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-5.1-mini",
});
```

```ts
const report = await runChecks({
  profile: "ollama",
  baseUrl: "http://localhost:11434",
  model: "llama3.2",
});
```

```ts
const report = await runChecks({
  profile: "gemini",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash",
});
```

```ts
const report = await runChecks({
  profile: "anthropic",
  baseUrl: "https://api.anthropic.com/v1",
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-sonnet-4-5",
});
```

Ollama does not require an API key. Its streaming responses use JSON lines, not
SSE.

`runChecks` returns a structured report and does not print, write files, set
exit codes, or manage UI state. Future CLI and desktop entry points should
consume this package instead of reimplementing checks. The CLI can render the
same structured report as console, JSON, or a static HTML report with
`aiping check --html reports/aiping.html`.

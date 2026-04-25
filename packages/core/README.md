# @starroy/ai-ping-core

Reusable protocol checks for AI and LLM API endpoints.

## Supported profiles

| Profile | API style | Authentication | Streaming |
| --- | --- | --- | --- |
| `openai` | OpenAI-compatible APIs | Usually requires an API key | SSE |
| `ollama` | Ollama local APIs | No API key by default | JSON lines |
| `gemini` | Gemini Developer API REST | `x-goog-api-key` | SSE |
| `anthropic` | Anthropic Claude Messages API | `x-api-key` + `anthropic-version` | SSE |

The OpenAI-compatible profile currently includes:

- `openai.models.list`
- `openai.chat.basic`
- `openai.chat.stream`
- `openai.tool_calls.basic`
- `openai.tool_calls.stream`
- `openai.error.format`

The OpenAI-compatible tool call checks validate modern Chat Completions
`tools` / `tool_calls`, including streaming `delta.tool_calls` argument
assembly and JSON parsing. They are recommended checks; legacy `function_call`
is detected but does not pass modern tool call compatibility.

The Ollama profile currently includes:

- `ollama.tags`
- `ollama.generate.basic`
- `ollama.generate.stream`
- `ollama.chat.basic`
- `ollama.chat.stream`

This covers Ollama native `/api/tags`, `/api/generate`, and `/api/chat`.
`/api/generate` is Ollama's prompt-style native API, while `/api/chat` is its
messages-style native API. For Ollama's OpenAI-compatible
`/v1/chat/completions`, use the `openai` profile instead.

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
  profile: "openai",
  baseUrl: "http://localhost:3000/v1",
  apiKey: "sk-test",
  model: "gpt-4o-mini",
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
consume this package instead of reimplementing checks.

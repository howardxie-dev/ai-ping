# @starroy/ai-ping

Command-line interface for AI Ping protocol checks.

The npm package is `@starroy/ai-ping` and the installed command is `aiping`.

## Supported profiles

| Profile | API style | Authentication | Streaming |
| --- | --- | --- | --- |
| `openai` | OpenAI-compatible APIs | Usually requires an API key | SSE |
| `ollama` | Ollama local APIs | No API key by default | JSON lines |
| `gemini` | Gemini Developer API REST | `x-goog-api-key` | SSE |
| `anthropic` | Anthropic Claude Messages API | `x-api-key` + `anthropic-version` | SSE |

## Usage

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

Quick demo with the local mock endpoint:

```bash
pnpm install
pnpm --filter openai-compatible-mock dev

aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model demo-model
```

Check a local Ollama endpoint:

```bash
aiping check \
  --profile ollama \
  --base-url http://localhost:11434 \
  --model llama3.2
```

Ollama does not require an API key. Its streaming responses use JSON lines, not
SSE.

The `ollama` profile checks Ollama native `/api/tags`, `/api/generate`, and
`/api/chat`. `/api/generate` is the prompt-style native API, while `/api/chat`
is the messages-style native API. For Ollama's OpenAI-compatible
`/v1/chat/completions`, use the `openai` profile instead.

Ollama checks currently include `ollama.tags`, `ollama.generate.basic`,
`ollama.generate.stream`, `ollama.chat.basic`, and `ollama.chat.stream`.

Check Gemini Developer API:

```bash
GEMINI_API_KEY=your-key aiping check \
  --profile gemini \
  --base-url https://generativelanguage.googleapis.com/v1beta \
  --model gemini-2.5-flash
```

The `gemini` profile uses `x-goog-api-key` and covers Gemini Developer API REST,
not Vertex AI Gemini API or Gemini OpenAI compatibility. Gemini streaming uses
SSE, but the response chunks are Gemini `GenerateContentResponse` objects rather
than OpenAI delta chunks.

Check Anthropic Claude Messages API:

```bash
ANTHROPIC_API_KEY=your-key aiping check \
  --profile anthropic \
  --base-url https://api.anthropic.com/v1 \
  --model claude-sonnet-4-5
```

The `anthropic` profile uses `x-api-key` and sends
`anthropic-version: 2023-06-01`. It covers the Claude Messages API, not tool
use, extended thinking, Bedrock Anthropic, or Vertex AI Anthropic. Anthropic
streaming is event-based SSE rather than OpenAI delta chunks.

Use JSON output for issue reports or CI artifacts:

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --json
```

List supported profiles and checks:

```bash
aiping profiles
aiping checks --profile openai
```

Exit codes:

- `0`: checks completed and required checks passed
- `1`: checks completed and at least one required check failed
- `2`: usage or configuration error
- `3`: unexpected CLI runtime error

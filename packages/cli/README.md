# @starroy/ai-ping

Command-line interface for AI Ping protocol checks.

The npm package is `@starroy/ai-ping` and the installed command is `aiping`.

## Supported profiles

| Profile | API style | Authentication | Streaming |
| --- | --- | --- | --- |
| `openai` | OpenAI-compatible APIs | Usually requires an API key | SSE |
| `ollama` | Ollama local APIs | No API key by default | JSON lines |

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

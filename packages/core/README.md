# @starroy/ai-ping-core

Reusable protocol checks for AI and LLM API endpoints.

## Supported profiles

| Profile | API style | Authentication | Streaming |
| --- | --- | --- | --- |
| `openai` | OpenAI-compatible APIs | Usually requires an API key | SSE |
| `ollama` | Ollama local APIs | No API key by default | JSON lines |

The OpenAI-compatible profile currently includes:

- `openai.models.list`
- `openai.chat.basic`
- `openai.chat.stream`
- `openai.error.format`

The Ollama profile currently includes:

- `ollama.tags`
- `ollama.generate.basic`
- `ollama.generate.stream`

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

Ollama does not require an API key. Its streaming responses use JSON lines, not
SSE.

`runChecks` returns a structured report and does not print, write files, set
exit codes, or manage UI state. Future CLI and desktop entry points should
consume this package instead of reimplementing checks.

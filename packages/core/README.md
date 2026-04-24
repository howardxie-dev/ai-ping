# @starroy/ai-ping-core

Reusable protocol checks for AI and LLM API endpoints.

The OpenAI-compatible profile currently includes:

- `openai.models.list`
- `openai.chat.basic`
- `openai.chat.stream`
- `openai.error.format`

```ts
import { runChecks } from "@starroy/ai-ping-core";

const report = await runChecks({
  profile: "openai",
  baseUrl: "http://localhost:3000/v1",
  apiKey: "sk-test",
  model: "gpt-4o-mini",
});
```

`runChecks` returns a structured report and does not print, write files, set
exit codes, or manage UI state. Future CLI and desktop entry points should
consume this package instead of reimplementing checks.

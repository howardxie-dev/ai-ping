# @starroy/ai-ping

Command-line interface for AI Ping protocol checks.

The npm package is `@starroy/ai-ping` and the installed command is `aiping`.

## Supported profiles

| Profile | API style | Authentication | Streaming | Alias |
| --- | --- | --- | --- | --- |
| `openai-chat` | OpenAI-compatible Chat Completions API | Usually requires an API key | SSE | `openai` |
| `openai-responses` | OpenAI-compatible Responses API | Usually requires an API key | Semantic SSE events | |
| `ollama` | Ollama local APIs | No API key by default | JSON lines | |
| `gemini` | Gemini Developer API REST | `x-goog-api-key` | SSE | |
| `anthropic` | Anthropic Claude Messages API | `x-api-key` + `anthropic-version` | SSE | |

The canonical OpenAI-compatible Chat Completions profile is `openai-chat`.
The older `openai` profile name remains supported as a backward-compatible
alias. It sends Chat Completions-style `messages` requests and validates
`choices[].message` / `choices[].delta` responses.

The OpenAI-compatible Responses profile is `openai-responses`. It sends
Responses-style `input` requests to `POST /responses` and validates `output`,
`output_text`, and semantic streaming events such as
`response.output_text.delta`. It does not check Responses tools, built-in tools,
multimodal input, or conversation state in the current 1.x line.

## Usage

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5
```

Check modern OpenAI-compatible tool calls only:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5 \
  --only openai-chat.tool_calls.basic,openai-chat.tool_calls.stream
```

Tool call checks validate modern Chat Completions `tools` / `tool_calls`,
including streaming `delta.tool_calls` argument assembly and JSON parsing. They
are recommended checks, so failures do not fail the overall result while
required checks pass. Legacy `function_call` is detected but is not treated as
modern tool call compatibility.

Check OpenAI Responses API:

```bash
OPENAI_API_KEY=your-key aiping check \
  --profile openai-responses \
  --base-url https://api.openai.com/v1 \
  --model gpt-5.1-mini
```

Responses checks currently include `openai-responses.models.list`,
`openai-responses.responses.basic`, `openai-responses.responses.stream`, and
`openai-responses.error.format`. Responses streaming is semantic SSE events,
not Chat Completions delta chunks.

Quick demo with the local mock endpoint:

```bash
pnpm install
pnpm --filter openai-compatible-mock dev

aiping check \
  --profile openai-chat \
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
`/v1/chat/completions`, use the `openai-chat` profile instead.

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
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5 \
  --json
```

Write a static HTML report for sharing, screenshots, or CI artifacts:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5 \
  --html reports/aiping.html
```

`--html` can be combined with `--json`; stdout remains pure JSON while the HTML
file is written separately.

List supported profiles and checks:

```bash
aiping profiles
aiping checks --profile openai-chat
aiping checks --profile openai-responses
```

Exit codes:

- `0`: checks completed and required checks passed
- `1`: checks completed and at least one required check failed
- `2`: usage or configuration error
- `3`: unexpected CLI runtime error

CI artifact example:

```yaml
name: AI Ping
on:
  pull_request:
jobs:
  ai-ping:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @starroy/ai-ping
      - run: |
          aiping check \
            --profile openai-chat \
            --base-url http://localhost:3000/v1 \
            --model test-model \
            --html reports/aiping.html
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: ai-ping-report
          path: reports/aiping.html
```

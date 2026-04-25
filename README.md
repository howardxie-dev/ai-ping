# AI Ping

[![CI](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml/badge.svg)](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@starroy/ai-ping.svg)](https://www.npmjs.com/package/@starroy/ai-ping)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Quick protocol checks for AI and LLM API endpoints.

> Ping AI APIs before your clients do.

Read this in other languages:

- [简体中文](docs/readme/README.zh-Hans.md)
- [繁體中文](docs/readme/README.zh-Hant.md)

AI Ping is not a network ping tool, a benchmark, or an official compatibility
certification. It is a small core library for checking whether an AI / LLM API
endpoint exposes protocol behavior that common clients can consume.

## Current Scope

AI Ping currently includes:

- `@starroy/ai-ping-core`, the reusable protocol checking core
- `@starroy/ai-ping`, the CLI package that provides the `aiping` command
- OpenAI-compatible Chat Completions profile
- OpenAI-compatible Responses profile
- Ollama profile
- Gemini Developer API profile
- Anthropic Claude Messages API profile
- Models list compatibility check
- Basic non-streaming chat completion check
- Streaming chat completion check
- Modern OpenAI-compatible tool call checks
- Error response format check
- Structured report with `pass`, `warn`, `fail`, and `skip`
- JSON output and CI-friendly exit codes

The npm package is published as `@starroy/ai-ping`, while the CLI command is
`aiping`.

## Supported Profiles

| Profile | API style | Authentication | Streaming | Alias |
| --- | --- | --- | --- | --- |
| `openai-chat` | OpenAI-compatible Chat Completions API | Usually requires an API key | SSE | `openai` |
| `openai-responses` | OpenAI-compatible Responses API | Usually requires an API key | Semantic SSE events | |
| `ollama` | Ollama local APIs | No API key by default | JSON lines | |
| `gemini` | Gemini Developer API REST | `x-goog-api-key` | SSE | |
| `anthropic` | Anthropic Claude Messages API | `x-api-key` + `anthropic-version` | SSE | |

The `ollama` profile covers Ollama native `/api/tags`, `/api/generate`, and
`/api/chat`. `/api/generate` is the prompt-style native API, while `/api/chat`
is the messages-style native API. For Ollama's OpenAI-compatible
`/v1/chat/completions`, use the `openai-chat` profile instead.

The `gemini` profile covers Gemini Developer API REST endpoints under a base URL
such as `https://generativelanguage.googleapis.com/v1beta`. It uses
`x-goog-api-key` authentication via `--api-key`, `AI_PING_API_KEY`, or
`GEMINI_API_KEY`. Vertex AI Gemini API and Gemini OpenAI compatibility are
separate APIs and are not covered by this profile. Gemini streaming uses SSE,
but its chunks are Gemini `GenerateContentResponse` objects rather than OpenAI
delta chunks.

The `anthropic` profile covers Anthropic Claude Messages API endpoints under a
base URL such as `https://api.anthropic.com/v1`. It uses `x-api-key`
authentication via `--api-key`, `AI_PING_API_KEY`, or `ANTHROPIC_API_KEY`, and
sends `anthropic-version: 2023-06-01` by default. Anthropic streaming is
event-based SSE and is not OpenAI delta streaming. Tool use, extended thinking,
computer use, Bedrock Anthropic, and Vertex AI Anthropic are not covered by this
profile.

The `openai-chat` profile covers OpenAI-compatible Chat Completions APIs. The
older `openai` profile name remains supported as a backward-compatible alias.
It sends Chat Completions-style `messages` requests and validates
`choices[].message` / `choices[].delta` responses.

The `openai-responses` profile covers OpenAI-compatible Responses APIs under
`POST /responses`. It sends Responses-style `input` requests and validates
Responses-style `output`, `output_text`, and semantic streaming events such as
`response.output_text.delta`. It does not check Responses tools, built-in tools,
multimodal input, or conversation state in v0.9.

The `openai-chat` profile includes recommended checks for modern Chat
Completions `tools` / `tool_calls`. These checks verify both non-streaming
`choices[].message.tool_calls` and streaming `choices[].delta.tool_calls`
argument assembly. Legacy `function_call` responses are detected but are not
treated as passing modern tool call checks.

## Core Usage

```ts
import { runChecks } from "@starroy/ai-ping-core";

const report = await runChecks({
  profile: "openai-chat",
  baseUrl: "http://localhost:3000/v1",
  apiKey: "sk-test",
  model: "gpt-4o-mini",
});

console.log(report.summary.ok);
console.log(report.results);
```

Reports do not include request headers or full API keys by default.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull request
guidelines.

## CLI

Install globally after publication:

```bash
npm install -g @starroy/ai-ping
```

Local development:

```bash
pnpm install
pnpm build
pnpm --filter @starroy/ai-ping cli --help
```

## Quick Demo

Start the mock OpenAI-compatible endpoint:

```bash
pnpm install
pnpm --filter openai-compatible-mock dev
```

In another terminal:

```bash
npm install -g @starroy/ai-ping

aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model demo-model
```

This checks protocol behavior, not simple network reachability.

Run protocol checks:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

Check modern OpenAI-compatible tool calls only:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --only openai-chat.tool_calls.basic,openai-chat.tool_calls.stream
```

Tool call checks are `recommended`: failures help diagnose agent and client
compatibility, but they do not fail the overall result while required checks
pass.

Check OpenAI Responses API:

```bash
OPENAI_API_KEY=your-key aiping check \
  --profile openai-responses \
  --base-url https://api.openai.com/v1 \
  --model gpt-5.1-mini
```

Responses checks currently include `openai-responses.models.list`,
`openai-responses.responses.basic`, `openai-responses.responses.stream`, and
`openai-responses.error.format`. This profile uses `input`, not `messages`, and
Responses streaming is semantic SSE events, not Chat Completions delta chunks.

Check a local Ollama endpoint:

```bash
aiping check \
  --profile ollama \
  --base-url http://localhost:11434 \
  --model llama3.2
```

Ollama does not require an API key. Its streaming responses use JSON lines, not
SSE.

Ollama checks currently include `ollama.tags`, `ollama.generate.basic`,
`ollama.generate.stream`, `ollama.chat.basic`, and `ollama.chat.stream`.

Check Gemini Developer API:

```bash
GEMINI_API_KEY=your-key aiping check \
  --profile gemini \
  --base-url https://generativelanguage.googleapis.com/v1beta \
  --model gemini-2.5-flash
```

Check Anthropic Claude Messages API:

```bash
ANTHROPIC_API_KEY=your-key aiping check \
  --profile anthropic \
  --base-url https://api.anthropic.com/v1 \
  --model claude-sonnet-4-5
```

Use an API key from a flag or environment variable:

```bash
AI_PING_API_KEY=sk-test aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

For the `openai-chat` and `openai-responses` profiles, `OPENAI_API_KEY` is also
supported. The legacy `openai` alias keeps the same environment variable
behavior as `openai-chat`. For the `gemini` profile, `GEMINI_API_KEY` is also
supported. For the `anthropic` profile, `ANTHROPIC_API_KEY` is also supported.
The flag `--api-key` takes precedence over environment variables.

Output JSON for issue reports or CI artifacts:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --json
```

Write a static HTML report for sharing, screenshots, or CI artifacts:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --html reports/aiping.html
```

`--html` can be combined with `--json`; stdout remains pure JSON while the HTML
file is written separately.

List available profiles and checks:

```bash
aiping profiles
aiping checks --profile openai-chat
aiping checks --profile openai-responses
```

Limit checks:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --only openai-chat.chat.basic,openai-chat.chat.stream
```

Exit codes:

- `0`: checks completed and required checks passed
- `1`: checks completed and at least one required check failed
- `2`: usage or configuration error
- `3`: unexpected CLI runtime error

CI example:

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

## Non-goals

AI Ping does not provide:

- benchmark
- load test
- uptime monitoring
- chat client
- API proxy
- protocol conversion
- official certification
- hosted cloud service

## Security

Please do not post API keys, tokens, private endpoint details, or sensitive JSON
reports in public issues. See [SECURITY.md](SECURITY.md) for details.

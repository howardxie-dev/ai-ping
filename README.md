# AI Ping

[![CI](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml/badge.svg)](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@starroy/ai-ping.svg)](https://www.npmjs.com/package/@starroy/ai-ping)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A stable CLI and core library for checking common LLM API protocol
compatibility.

> Ping AI APIs before your clients do.

Read this in other languages:

- [简体中文](docs/readme/README.zh-Hans.md)
- [繁體中文](docs/readme/README.zh-Hant.md)

AI Ping is a protocol checker, not a network ping tool, benchmark, load test,
uptime monitor, API proxy, chat client, or official certification. It helps you
verify whether an AI / LLM API endpoint behaves like the protocol your clients
expect.

## Install

```bash
npm install -g @starroy/ai-ping
```

The CLI package is `@starroy/ai-ping`; the command is `aiping`. The reusable
core library is `@starroy/ai-ping-core`.

## Desktop Preview

AI Ping v1.2 includes a macOS-first Desktop Preview built with Tauri. It provides a
local UI for choosing a profile, entering a base URL, model, API key, and
timeout, running checks, inspecting results, and exporting JSON or HTML reports.
The Desktop UI supports English, Simplified Chinese, and Traditional Chinese,
detects the initial language from the system locale, and can be switched
instantly from the app without saving a language preference.

```bash
pnpm install
pnpm desktop:dev
pnpm desktop:build:dmg
```

The Desktop Preview does not replace or translate CLI output, JSON reports, or
HTML reports. It does not save API keys or language preferences, and does not
add new checks or profiles. Windows and Linux packaging, notarization,
automatic updates, saved settings, and history are planned for later releases.

The local DMG build is unsigned / ad-hoc and is intended for local preview
validation. See [apps/desktop/README.md](apps/desktop/README.md) for packaging
commands, smoke checks, and preview limitations.

## Quick Start

```bash
aiping profiles

aiping check \
  --profile openai-chat \
  --base-url https://api.openai.com/v1 \
  --model gpt-5.1-mini
```

Pass API keys with `--api-key`, `AI_PING_API_KEY`, or the profile-specific
environment variable listed below.

```bash
OPENAI_API_KEY=your-key aiping check \
  --profile openai-chat \
  --base-url https://api.openai.com/v1 \
  --model gpt-5.1-mini
```

## Supported Profiles

| Profile | Description | Alias | API key environment |
| --- | --- | --- | --- |
| `openai-chat` | OpenAI-compatible Chat Completions API | `openai` | `OPENAI_API_KEY` |
| `openai-responses` | OpenAI-compatible Responses API | - | `OPENAI_API_KEY` |
| `ollama` | Ollama native API | - | Usually none |
| `gemini` | Gemini Developer API REST | - | `GEMINI_API_KEY` |
| `anthropic` | Anthropic Claude Messages API | - | `ANTHROPIC_API_KEY` |

The `openai` alias maps to `openai-chat` and remains supported in AI Ping 1.x.

## Which Profile Should I Use?

Use `openai-chat` for Chat Completions-compatible endpoints, including local
proxies, gateways, and Ollama's OpenAI-compatible `/v1/chat/completions`.

Use `openai-responses` for endpoints that implement OpenAI-compatible
`POST /responses` with Responses-style `input`, `output`, `output_text`, and
semantic streaming events. AI Ping 1.x does not yet check Responses tools, built-in tools,
multimodal input, or conversation state.

Use `ollama` for Ollama native `/api/tags`, `/api/generate`, and `/api/chat`.
Ollama native streaming uses JSON lines, not SSE.

Use `gemini` for Gemini Developer API REST under a base URL such as
`https://generativelanguage.googleapis.com/v1beta`. Vertex AI Gemini and Gemini
OpenAI compatibility are separate APIs.

Use `anthropic` for Anthropic Claude Messages API under a base URL such as
`https://api.anthropic.com/v1`. Bedrock Anthropic, Vertex AI Anthropic, tool
use, extended thinking, and computer use are outside the current 1.x profile.

## Reports

AI Ping produces three report forms:

- Console report: default human-readable terminal output
- JSON report: structured output for issue reports, automation, and CI
- HTML report: static report file for sharing, screenshots, and CI artifacts

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5 \
  --json
```

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5 \
  --html reports/aiping.html
```

`--html` can be combined with `--json`; stdout remains pure JSON while the HTML
file is written separately.

Reports do not include request headers or full API keys by default. Still,
review JSON and HTML reports before sharing because endpoint names, model names,
base URL hostnames, error bodies, or provider messages may reveal private
details.

See [Reports](docs/reports.md) for schema notes and safe sharing guidance.

## What Does OK Mean?

`summary.ok` is true when the check run completed and no required checks failed.
Recommended checks can fail while the overall result remains OK.

Required checks cover protocol behavior that most clients need to call the
endpoint successfully. Recommended checks diagnose useful compatibility details,
such as modern OpenAI-compatible `tools` / `tool_calls`, but do not fail the
overall run while required checks pass.

## CLI Commands

```bash
aiping --help
aiping check --help
aiping profiles
aiping checks --profile openai-chat
```

Common `aiping check` options are stable in 1.x:

```text
--profile
--base-url
--model
--api-key
--timeout
--json
--html
--only
--skip
--verbose
```

Limit or skip checks with comma-separated check IDs:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5 \
  --only openai-chat.chat.basic,openai-chat.chat.stream
```

## Exit Codes

| Exit code | Meaning |
| ---: | --- |
| `0` | Check completed and required checks passed |
| `1` | Check completed but at least one required check failed |
| `2` | CLI usage or configuration error |
| `3` | Unexpected runtime error |

## Compatibility Promise

AI Ping 1.x aims to keep CLI commands, stable check options, core report fields,
profile names, the `openai` alias, npm package names, and exit code semantics
backward-compatible.

The stable report fields are `version`, `profile`, `endpoint`, `model`,
`startedAt`, `durationMs`, `summary`, and `results`. Minor versions may add
profiles, checks, output options, or optional report fields without removing or
renaming stable fields.

See [Compatibility Policy](docs/compatibility.md) for the full 1.x promise.

## CI Usage

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
          mkdir -p reports
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

## Troubleshooting

Most failures come from one of four places: the wrong profile, a base URL with
the wrong prefix, an API key that is missing or sent with the wrong header, or a
provider that implements only part of the target protocol.

See [Troubleshooting](docs/troubleshooting.md) before filing an issue.

## Core Usage

```ts
import { runChecks } from "@starroy/ai-ping-core";

const report = await runChecks({
  profile: "openai-chat",
  baseUrl: "http://localhost:3000/v1",
  apiKey: "sk-test",
  model: "gpt-5.5",
});

console.log(report.summary.ok);
console.log(report.results);
```

`runChecks` returns a structured report. It does not print terminal output,
write files, set exit codes, or manage UI state.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm desktop:dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull request
guidelines.

## Security

Do not post API keys, Authorization headers, private endpoint secrets, private
base URLs, or sensitive JSON / HTML reports in public issues. See
[SECURITY.md](SECURITY.md) for details.

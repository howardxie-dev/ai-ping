# AI Ping

[![CI](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml/badge.svg)](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ai-ping.svg)](https://www.npmjs.com/package/ai-ping)
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

- `@ai-ping/core`, the reusable protocol checking core
- `ai-ping`, the CLI package that provides the `aiping` command
- OpenAI-compatible profile
- Basic non-streaming chat completion check
- Streaming chat completion check
- Error response format check
- Structured report with `pass`, `warn`, `fail`, and `skip`
- JSON output and CI-friendly exit codes

## Core Usage

```ts
import { runChecks } from "@ai-ping/core";

const report = await runChecks({
  profile: "openai",
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
npm install -g ai-ping
```

Local development:

```bash
pnpm install
pnpm build
pnpm --filter ai-ping cli --help
```

Run protocol checks:

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

Use an API key from a flag or environment variable:

```bash
AI_PING_API_KEY=sk-test aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

For the `openai` profile, `OPENAI_API_KEY` is also supported. The flag
`--api-key` takes precedence over environment variables.

Output JSON for issue reports or CI artifacts:

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --json
```

List available profiles and checks:

```bash
aiping profiles
aiping checks --profile openai
```

Limit checks:

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --only openai.chat.basic,openai.chat.stream
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
      - run: npm install -g ai-ping
      - run: |
          aiping check \
            --profile openai \
            --base-url http://localhost:3000/v1 \
            --model test-model
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

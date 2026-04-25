# AI Ping

[![CI](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml/badge.svg)](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@starroy/ai-ping.svg)](https://www.npmjs.com/package/@starroy/ai-ping)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

AI / LLM API endpoint 的轻量协议检查工具。

> Ping AI APIs before your clients do.

语言版本：

- [English](../../README.md)
- [繁體中文](README.zh-Hant.md)

AI Ping 不是网络 ping 工具，不是 benchmark，也不是官方兼容性认证。它用于快速检查一个 AI / LLM API endpoint 是否暴露了常见客户端可以消费的协议行为。

## 当前范围

AI Ping 目前包含两个核心部分：

- `@starroy/ai-ping-core`：可复用的协议检查核心库
- `@starroy/ai-ping` CLI：命令行工具，提供 `aiping` 命令
- `openai-chat.models.list`：`/models` 最低兼容结构检查
- `openai-responses`：OpenAI-compatible Responses API 检查

当前支持的 profile：

| Profile | API 形态 | 认证 | Streaming | Alias |
| --- | --- | --- | --- | --- |
| `openai-chat` | OpenAI-compatible Chat Completions API | 通常需要 API key | SSE | `openai` |
| `openai-responses` | OpenAI-compatible Responses API | 通常需要 API key | semantic SSE events | |
| `ollama` | Ollama 本地 API | 默认不需要 API key | JSON lines | |
| `gemini` | Gemini Developer API REST | `x-goog-api-key` | SSE | |
| `anthropic` | Anthropic Claude Messages API | `x-api-key` + `anthropic-version` | SSE | |

`ollama` profile 覆盖 Ollama native `/api/tags`、`/api/generate` 和
`/api/chat`。`/api/generate` 是 prompt-style native API，`/api/chat` 是
messages-style native API。Ollama OpenAI-compatible `/v1/chat/completions`
应使用 `openai-chat` profile 检查。

`gemini` profile 覆盖 Gemini Developer API REST，base URL 示例为
`https://generativelanguage.googleapis.com/v1beta`。它通过 `--api-key`、
`AI_PING_API_KEY` 或 `GEMINI_API_KEY` 使用 `x-goog-api-key` 认证。Vertex
AI Gemini API 与 Gemini OpenAI compatibility 不属于此 profile。Gemini
streaming 使用 SSE，但响应 chunk 不是 OpenAI delta 格式。

`anthropic` profile 覆盖 Anthropic Claude Messages API，base URL 示例为
`https://api.anthropic.com/v1`。它通过 `--api-key`、`AI_PING_API_KEY` 或
`ANTHROPIC_API_KEY` 使用 `x-api-key` 认证，并默认发送
`anthropic-version: 2023-06-01`。Anthropic streaming 是 event-based SSE，
不是 OpenAI delta 格式。tool use、extended thinking、computer use、
Bedrock Anthropic 与 Vertex AI Anthropic 不属于此 profile。

当前支持的检查项：

- `models list` 检查
- 基础非流式 chat completion 检查
- 流式 chat completion 检查
- 基础非流式 Responses API 检查
- 流式 Responses API 检查
- OpenAI-compatible modern tool calls 检查
- 错误响应格式检查
- Ollama checks：`ollama.tags`、`ollama.generate.basic`、`ollama.generate.stream`、`ollama.chat.basic`、`ollama.chat.stream`
- Gemini checks：`gemini.models.list`、`gemini.generate.basic`、`gemini.generate.stream`、`gemini.error.format`
- Anthropic checks：`anthropic.models.list`、`anthropic.messages.basic`、`anthropic.messages.stream`、`anthropic.error.format`
- 结构化报告，支持 `pass`、`warn`、`fail`、`skip`

`openai-chat` 是 OpenAI-compatible Chat Completions 的规范 profile 名称。
旧的 `openai` 名称仍作为向后兼容 alias 可用。它发送 Chat
Completions 风格的 `messages` 请求，并检查 `choices[].message` /
`choices[].delta` 响应。

`openai-responses` profile 覆盖 OpenAI-compatible Responses API 的
`POST /responses`。它发送 Responses 风格的 `input` 请求，并检查
Responses 风格的 `output`、`output_text` 和 `response.output_text.delta`
等 semantic streaming events。v0.9 不检查 Responses tools、built-in
tools、multimodal input 或 conversation state。

`openai-chat` profile 包含 modern Chat Completions `tools` / `tool_calls` 的
recommended checks。它会检查非流式 `choices[].message.tool_calls`，也会检查
流式 `choices[].delta.tool_calls` 的 arguments 拼接与 JSON parse。legacy
`function_call` 会被检测出来，但不会被当作 modern `tool_calls` 通过。

npm 包名是 `@starroy/ai-ping`，实际命令名是 `aiping`。

## CLI 使用

安装发布后的 CLI：

```bash
npm install -g @starroy/ai-ping
```

本地开发运行：

```bash
pnpm install
pnpm build
pnpm --filter @starroy/ai-ping cli --help
```

## 快速体验

先启动 mock OpenAI-compatible endpoint：

```bash
pnpm install
pnpm --filter openai-compatible-mock dev
```

再在另一个终端运行：

```bash
npm install -g @starroy/ai-ping

aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model demo-model
```

AI Ping 检查的是协议行为，不是简单的网络连通性。

运行协议检查：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

只检查 OpenAI-compatible modern tool calls：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --only openai-chat.tool_calls.basic,openai-chat.tool_calls.stream
```

tool call checks 是 `recommended`，用于诊断 agent / client 兼容性。只要
required checks 通过，它们失败也不会让整体结果变成非 OK。

检查 OpenAI Responses API：

```bash
OPENAI_API_KEY=your-key aiping check \
  --profile openai-responses \
  --base-url https://api.openai.com/v1 \
  --model gpt-5.1-mini
```

Responses checks 目前包含 `openai-responses.models.list`、
`openai-responses.responses.basic`、`openai-responses.responses.stream` 和
`openai-responses.error.format`。这个 profile 使用 `input`，不是
`messages`；Responses streaming 是 semantic SSE events，不是 Chat
Completions delta chunks。

检查本地 Ollama endpoint：

```bash
aiping check \
  --profile ollama \
  --base-url http://localhost:11434 \
  --model llama3.2
```

Ollama 不需要 API key。它的 streaming 响应使用 JSON lines，不是 SSE。

Ollama OpenAI-compatible `/v1/chat/completions` 不属于 `ollama` native
profile 覆盖范围，请使用 `openai-chat` profile 检查。

检查 Gemini Developer API：

```bash
GEMINI_API_KEY=your-key aiping check \
  --profile gemini \
  --base-url https://generativelanguage.googleapis.com/v1beta \
  --model gemini-2.5-flash
```

检查 Anthropic Claude Messages API：

```bash
ANTHROPIC_API_KEY=your-key aiping check \
  --profile anthropic \
  --base-url https://api.anthropic.com/v1 \
  --model claude-sonnet-4-5
```

通过参数或环境变量传入 API key：

```bash
AI_PING_API_KEY=sk-test aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

对于 `openai-chat` 和 `openai-responses` profile，也支持
`OPENAI_API_KEY`。旧的 `openai` alias 保留与 `openai-chat` 相同的环境变量
行为。对于 `gemini` profile，也支持 `GEMINI_API_KEY`。对于 `anthropic`
profile，也支持 `ANTHROPIC_API_KEY`。优先级为：

1. `--api-key`
2. `AI_PING_API_KEY`
3. profile 专用环境变量，例如 `OPENAI_API_KEY`、`GEMINI_API_KEY` 或 `ANTHROPIC_API_KEY`

输出 JSON 报告，便于附到 issue 或 CI artifact：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --json
```

列出可用 profiles 和 checks：

```bash
aiping profiles
aiping checks --profile openai-chat
aiping checks --profile openai-responses
```

只运行部分 checks：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --only openai-chat.chat.basic,openai-chat.chat.stream
```

跳过部分 checks：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --skip openai-chat.error.format
```

## Exit Codes

- `0`：检查完成，required checks 通过
- `1`：检查完成，但至少一个 required check 失败
- `2`：参数或配置错误
- `3`：CLI 未预期运行时错误

只有 `summary.ok === false` 时才返回 `1`。如果只是 recommended check 失败，但 required checks 通过，CLI 仍返回 `0`。

## Core 使用

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

`runChecks` 只返回结构化报告，不打印终端输出、不写文件、不设置 exit code，也不管理 UI 状态。

## CI 示例

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
            --model test-model
```

## 开发

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

贡献指南见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 隐私与安全

AI Ping 默认不保存 API key、请求头或完整响应内容。报告中不会额外加入完整 API key 或 Authorization header。

请不要在公开 issue 中提交 API key、token、私有 endpoint 细节或敏感 JSON 报告。详见 [SECURITY.md](../../SECURITY.md)。

## 非目标

AI Ping 不做：

- benchmark
- load test
- uptime monitoring
- 聊天客户端
- API proxy
- 协议转换
- 官方认证
- 云端托管服务

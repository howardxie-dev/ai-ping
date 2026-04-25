# AI Ping

[![CI](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml/badge.svg)](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@starroy/ai-ping.svg)](https://www.npmjs.com/package/@starroy/ai-ping)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

AI / LLM API endpoint 的輕量協議檢查工具。

> Ping AI APIs before your clients do.

語言版本：

- [English](../../README.md)
- [简体中文](README.zh-Hans.md)

AI Ping 不是網路 ping 工具，不是 benchmark，也不是官方相容性認證。它用於快速檢查一個 AI / LLM API endpoint 是否暴露了常見客戶端可以消費的協議行為。

## 目前範圍

AI Ping 目前包含兩個核心部分：

- `@starroy/ai-ping-core`：可重用的協議檢查核心函式庫
- `@starroy/ai-ping` CLI：命令列工具，提供 `aiping` 命令
- `openai-chat.models.list`：`/models` 最低相容結構檢查

目前支援的 profile：

| Profile | API 形態 | 認證 | Streaming | Alias |
| --- | --- | --- | --- | --- |
| `openai-chat` | OpenAI-compatible Chat Completions API | 通常需要 API key | SSE | `openai` |
| `ollama` | Ollama 本機 API | 預設不需要 API key | JSON lines | |
| `gemini` | Gemini Developer API REST | `x-goog-api-key` | SSE | |
| `anthropic` | Anthropic Claude Messages API | `x-api-key` + `anthropic-version` | SSE | |

`ollama` profile 覆蓋 Ollama native `/api/tags`、`/api/generate` 和
`/api/chat`。`/api/generate` 是 prompt-style native API，`/api/chat` 是
messages-style native API。Ollama OpenAI-compatible `/v1/chat/completions`
應使用 `openai-chat` profile 檢查。

`gemini` profile 覆蓋 Gemini Developer API REST，base URL 範例為
`https://generativelanguage.googleapis.com/v1beta`。它透過 `--api-key`、
`AI_PING_API_KEY` 或 `GEMINI_API_KEY` 使用 `x-goog-api-key` 認證。Vertex
AI Gemini API 與 Gemini OpenAI compatibility 不屬於此 profile。Gemini
streaming 使用 SSE，但回應 chunk 不是 OpenAI delta 格式。

`anthropic` profile 覆蓋 Anthropic Claude Messages API，base URL 範例為
`https://api.anthropic.com/v1`。它透過 `--api-key`、`AI_PING_API_KEY` 或
`ANTHROPIC_API_KEY` 使用 `x-api-key` 認證，並預設傳送
`anthropic-version: 2023-06-01`。Anthropic streaming 是 event-based SSE，
不是 OpenAI delta 格式。tool use、extended thinking、computer use、
Bedrock Anthropic 與 Vertex AI Anthropic 不屬於此 profile。

目前支援的檢查項：

- `models list` 檢查
- 基礎非串流 chat completion 檢查
- 串流 chat completion 檢查
- OpenAI-compatible modern tool calls 檢查
- 錯誤回應格式檢查
- Ollama checks：`ollama.tags`、`ollama.generate.basic`、`ollama.generate.stream`、`ollama.chat.basic`、`ollama.chat.stream`
- Gemini checks：`gemini.models.list`、`gemini.generate.basic`、`gemini.generate.stream`、`gemini.error.format`
- Anthropic checks：`anthropic.models.list`、`anthropic.messages.basic`、`anthropic.messages.stream`、`anthropic.error.format`
- 結構化報告，支援 `pass`、`warn`、`fail`、`skip`

`openai-chat` 是 OpenAI-compatible Chat Completions 的規範 profile 名稱。
舊的 `openai` 名稱仍作為向後相容 alias 可用。未來 OpenAI Responses API
檢查會使用獨立的 `openai-responses` profile，目前尚未包含。

`openai-chat` profile 包含 modern Chat Completions `tools` / `tool_calls` 的
recommended checks。它會檢查非串流 `choices[].message.tool_calls`，也會檢查
串流 `choices[].delta.tool_calls` 的 arguments 拼接與 JSON parse。legacy
`function_call` 會被偵測出來，但不會被當作 modern `tool_calls` 通過。

npm 套件名稱是 `@starroy/ai-ping`，實際命令名稱是 `aiping`。

## CLI 使用

安裝發布後的 CLI：

```bash
npm install -g @starroy/ai-ping
```

本機開發執行：

```bash
pnpm install
pnpm build
pnpm --filter @starroy/ai-ping cli --help
```

## 快速體驗

先啟動 mock OpenAI-compatible endpoint：

```bash
pnpm install
pnpm --filter openai-compatible-mock dev
```

再在另一個終端執行：

```bash
npm install -g @starroy/ai-ping

aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model demo-model
```

AI Ping 檢查的是協議行為，不是單純的網路連通性。

執行協議檢查：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

只檢查 OpenAI-compatible modern tool calls：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --only openai-chat.tool_calls.basic,openai-chat.tool_calls.stream
```

tool call checks 是 `recommended`，用於診斷 agent / client 相容性。只要
required checks 通過，它們失敗也不會讓整體結果變成非 OK。

檢查本機 Ollama endpoint：

```bash
aiping check \
  --profile ollama \
  --base-url http://localhost:11434 \
  --model llama3.2
```

Ollama 不需要 API key。它的 streaming 回應使用 JSON lines，不是 SSE。

Ollama OpenAI-compatible `/v1/chat/completions` 不屬於 `ollama` native
profile 覆蓋範圍，請使用 `openai-chat` profile 檢查。

檢查 Gemini Developer API：

```bash
GEMINI_API_KEY=your-key aiping check \
  --profile gemini \
  --base-url https://generativelanguage.googleapis.com/v1beta \
  --model gemini-2.5-flash
```

檢查 Anthropic Claude Messages API：

```bash
ANTHROPIC_API_KEY=your-key aiping check \
  --profile anthropic \
  --base-url https://api.anthropic.com/v1 \
  --model claude-sonnet-4-5
```

透過參數或環境變數傳入 API key：

```bash
AI_PING_API_KEY=sk-test aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

對於 `openai-chat` profile，也支援 `OPENAI_API_KEY`。舊的 `openai` alias
保留相同的環境變數行為。對於 `gemini` profile，也支援 `GEMINI_API_KEY`。
對於 `anthropic` profile，也支援 `ANTHROPIC_API_KEY`。優先順序為：

1. `--api-key`
2. `AI_PING_API_KEY`
3. profile 專用環境變數，例如 `OPENAI_API_KEY`、`GEMINI_API_KEY` 或 `ANTHROPIC_API_KEY`

輸出 JSON 報告，方便附到 issue 或 CI artifact：

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
```

只執行部分 checks：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --only openai-chat.chat.basic,openai-chat.chat.stream
```

略過部分 checks：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --skip openai-chat.error.format
```

## Exit Codes

- `0`：檢查完成，required checks 通過
- `1`：檢查完成，但至少一個 required check 失敗
- `2`：參數或設定錯誤
- `3`：CLI 非預期執行階段錯誤

只有 `summary.ok === false` 時才會回傳 `1`。如果只是 recommended check 失敗，但 required checks 通過，CLI 仍回傳 `0`。

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

`runChecks` 只回傳結構化報告，不列印終端輸出、不寫檔、不設定 exit code，也不管理 UI 狀態。

## CI 範例

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

## 開發

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

貢獻指南見 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 隱私與安全

AI Ping 預設不保存 API key、請求標頭或完整回應內容。報告中不會額外加入完整 API key 或 Authorization header。

請不要在公開 issue 中提交 API key、token、私有 endpoint 細節或敏感 JSON 報告。詳見 [SECURITY.md](../../SECURITY.md)。

## 非目標

AI Ping 不做：

- benchmark
- load test
- uptime monitoring
- 聊天客戶端
- API proxy
- 協議轉換
- 官方認證
- 雲端託管服務

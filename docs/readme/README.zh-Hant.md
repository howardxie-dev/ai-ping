# AI Ping

[![CI](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml/badge.svg)](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ai-ping.svg)](https://www.npmjs.com/package/ai-ping)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

AI / LLM API endpoint 的輕量協議檢查工具。

> Ping AI APIs before your clients do.

語言版本：

- [English](../../README.md)
- [简体中文](README.zh-Hans.md)

AI Ping 不是網路 ping 工具，不是 benchmark，也不是官方相容性認證。它用於快速檢查一個 AI / LLM API endpoint 是否暴露了常見客戶端可以消費的協議行為。

## 目前範圍

AI Ping 目前包含兩個核心部分：

- `@ai-ping/core`：可重用的協議檢查核心函式庫
- `ai-ping` CLI：命令列工具，提供 `aiping` 命令

目前支援的 profile：

- `openai`：OpenAI-compatible API

目前支援的檢查項：

- 基礎非串流 chat completion 檢查
- 串流 chat completion 檢查
- 錯誤回應格式檢查
- 結構化報告，支援 `pass`、`warn`、`fail`、`skip`

## CLI 使用

安裝發布後的 CLI：

```bash
npm install -g ai-ping
```

本機開發執行：

```bash
pnpm install
pnpm build
pnpm --filter ai-ping cli --help
```

執行協議檢查：

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

透過參數或環境變數傳入 API key：

```bash
AI_PING_API_KEY=sk-test aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

對於 `openai` profile，也支援 `OPENAI_API_KEY`。優先順序為：

1. `--api-key`
2. `AI_PING_API_KEY`
3. `OPENAI_API_KEY`

輸出 JSON 報告，方便附到 issue 或 CI artifact：

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --json
```

列出可用 profiles 和 checks：

```bash
aiping profiles
aiping checks --profile openai
```

只執行部分 checks：

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --only openai.chat.basic,openai.chat.stream
```

略過部分 checks：

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --skip openai.error.format
```

## Exit Codes

- `0`：檢查完成，required checks 通過
- `1`：檢查完成，但至少一個 required check 失敗
- `2`：參數或設定錯誤
- `3`：CLI 非預期執行階段錯誤

只有 `summary.ok === false` 時才會回傳 `1`。如果只是 recommended check 失敗，但 required checks 通過，CLI 仍回傳 `0`。

## Core 使用

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
      - run: npm install -g ai-ping
      - run: |
          aiping check \
            --profile openai \
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

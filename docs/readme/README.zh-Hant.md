# AI Ping

[![CI](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml/badge.svg)](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@starroy/ai-ping.svg)](https://www.npmjs.com/package/@starroy/ai-ping)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

用於檢查常見 LLM API 協議相容性的穩定 CLI 和 Core 函式庫。

> Ping AI APIs before your clients do.

語言版本：

- [English](../../README.md)
- [简体中文](README.zh-Hans.md)

AI Ping 是協議檢查工具，不是網路 ping、benchmark、load test、uptime
monitor、API proxy、聊天客戶端或官方認證。它用於確認一個 AI / LLM API
endpoint 是否具備客戶端預期的協議行為。

## 安裝

```bash
npm install -g @starroy/ai-ping
```

CLI 套件名稱是 `@starroy/ai-ping`，命令名稱是 `aiping`。可重用 Core
函式庫套件名稱是 `@starroy/ai-ping-core`。

## Desktop Preview

AI Ping v1.2 包含 macOS-first 的 Tauri Desktop Preview。它提供本機 UI，用於選擇
profile、填寫 base URL、model、API key 和 timeout，執行 checks，查看結果，並匯出
JSON 或 HTML report。Desktop UI 支援 English、简体中文和繁體中文，會根據系統語言
選擇初始語言，也可以在應用程式內即時切換；語言偏好不會被保存。

```bash
pnpm install
pnpm desktop:dev
pnpm desktop:build:dmg
```

Desktop Preview 不取代 CLI，不翻譯 CLI 輸出、JSON report 或 HTML report，不保存
API key 或語言偏好，也不新增 checks 或 profiles。Windows / Linux 打包、
notarization、自動更新、保存設定和歷史記錄會放到後續版本。

本機 DMG 建置是 unsigned / ad-hoc，僅用於本機預覽驗證。打包命令、smoke checks
和預覽限制詳見 [apps/desktop/README.md](../../apps/desktop/README.md)。

## Web Playground Preview

AI Ping v1.3 新增 Web Playground Preview，用於在瀏覽器中快速檢查
`openai-chat` 和 `openai-responses` endpoint。它是靜態 Vite app：瀏覽器會直接向
你填寫的 endpoint 傳送請求，AI Ping 不提供 Worker 或服務端代理。

```bash
pnpm install
pnpm web:dev
pnpm web:build
```

Cloudflare Pages 建議設定：build command 使用
`pnpm --filter @starroy/ai-ping-web build`，output directory 使用
`apps/web/dist`。不需要、也不應該設定服務端 API key。

API Key 僅保存在目前瀏覽器分頁記憶體中，頁面重新整理後會清空。AI Ping 不代理、
不儲存、不記錄瀏覽器請求或報告。因為檢查在瀏覽器中執行，會受到 endpoint CORS
策略限制；如果請求被 CORS 或瀏覽器本機網路規則攔截，請使用 CLI 或 Desktop 版本。

部署說明和無代理隱私邊界見 [apps/web/README.md](../../apps/web/README.md)。

## 快速開始

```bash
aiping profiles

aiping check \
  --profile openai-chat \
  --base-url https://api.openai.com/v1 \
  --model gpt-5.1-mini
```

API key 可透過 `--api-key`、`AI_PING_API_KEY` 或 profile 專用環境變數傳入。

```bash
OPENAI_API_KEY=your-key aiping check \
  --profile openai-chat \
  --base-url https://api.openai.com/v1 \
  --model gpt-5.1-mini
```

## 支援的 Profiles

| Profile | 說明 | Alias | API key 環境變數 |
| --- | --- | --- | --- |
| `openai-chat` | OpenAI-compatible Chat Completions API | `openai` | `OPENAI_API_KEY` |
| `openai-responses` | OpenAI-compatible Responses API | - | `OPENAI_API_KEY` |
| `ollama` | Ollama native API | - | 通常不需要 |
| `gemini` | Gemini Developer API REST | - | `GEMINI_API_KEY` |
| `anthropic` | Anthropic Claude Messages API | - | `ANTHROPIC_API_KEY` |

`openai` alias 指向 `openai-chat`，並會在 AI Ping 1.x 中繼續保留。

## 應該使用哪個 Profile？

Chat Completions 相容 endpoint 使用 `openai-chat`，包括本機 proxy、gateway
以及 Ollama 的 OpenAI-compatible `/v1/chat/completions`。

實作 OpenAI-compatible `POST /responses` 的 endpoint 使用
`openai-responses`。它檢查 Responses 風格的 `input`、`output`、
`output_text` 和 semantic streaming events。AI Ping 1.x 暫不檢查 Responses tools、
built-in tools、multimodal input 或 conversation state。

Ollama native `/api/tags`、`/api/generate` 和 `/api/chat` 使用 `ollama`。
Ollama native streaming 是 JSON lines，不是 SSE。

Gemini Developer API REST 使用 `gemini`，base URL 範例為
`https://generativelanguage.googleapis.com/v1beta`。Vertex AI Gemini 與 Gemini
OpenAI compatibility 是不同 API。

Anthropic Claude Messages API 使用 `anthropic`，base URL 範例為
`https://api.anthropic.com/v1`。Bedrock Anthropic、Vertex AI Anthropic、tool
use、extended thinking 和 computer use 不屬於目前 1.x profile 範圍。

## 報告

AI Ping 支援三種報告形態：

- Console report：預設終端輸出，適合人工閱讀
- JSON report：結構化輸出，適合 issue、自動化和 CI
- HTML report：靜態報告檔案，適合分享、截圖和 CI artifact

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

`--html` 可以和 `--json` 一起使用；stdout 仍然只輸出純 JSON，HTML 檔案會另外寫入。

報告預設不包含請求標頭或完整 API key。分享前仍應檢查 JSON / HTML 報告，因為
endpoint 名稱、model 名稱、base URL hostname、錯誤 body 或 provider message
可能包含私有資訊。

詳見 [Reports](../reports.md)。

## OK 是什麼意思？

當檢查完成並且沒有 required check 失敗時，`summary.ok` 為 true。Recommended
check 可以失敗，只要 required checks 通過，整體結果仍然是 OK。

Required checks 覆蓋大多數客戶端成功呼叫 endpoint 所需的協議行為。Recommended
checks 用於診斷有用的相容性細節，例如 OpenAI-compatible `tools` /
`tool_calls`，但不會在 required checks 通過時讓整體執行失敗。

## CLI 命令

```bash
aiping --help
aiping check --help
aiping profiles
aiping checks --profile openai-chat
```

以下 `aiping check` 參數在 1.x 中保持穩定：

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

可用逗號分隔的 check ID 限定或略過檢查：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5 \
  --only openai-chat.chat.basic,openai-chat.chat.stream
```

## Exit Codes

| Exit code | 含義 |
| ---: | --- |
| `0` | 檢查完成，required checks 通過 |
| `1` | 檢查完成，但至少一個 required check 失敗 |
| `2` | CLI 參數或設定錯誤 |
| `3` | 非預期執行階段錯誤 |

## 相容性承諾

AI Ping 1.x 目標是保持 CLI 命令、穩定參數、Core report 核心欄位、profile
名稱、`openai` alias、npm 套件名稱和 exit code 語義向後相容。

穩定 report 欄位包括 `version`、`profile`、`endpoint`、`model`、
`startedAt`、`durationMs`、`summary` 和 `results`。Minor 版本可以向後相容地
新增 profile、check、輸出選項或 optional report 欄位，但不會刪除或重新命名穩定欄位。

詳見 [Compatibility Policy](../compatibility.md)。

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

## 故障排查

大多數失敗來自四類問題：profile 選錯、base URL 前綴不對、API key 缺失或用錯
header、provider 只實作了目標協議的一部分。

提交 issue 前請先閱讀 [Troubleshooting](../troubleshooting.md)。

## Core 使用

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

`runChecks` 只回傳結構化報告，不列印終端輸出、不寫檔、不設定 exit code，也不管理 UI 狀態。

## 開發

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm desktop:dev
```

貢獻指南見 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 安全

請不要在公開 issue 中提交 API key、Authorization header、私有 endpoint
secret、私有 base URL 或敏感 JSON / HTML 報告。詳見 [SECURITY.md](../../SECURITY.md)。

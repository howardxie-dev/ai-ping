# AI Ping

[![CI](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml/badge.svg)](https://github.com/howardxie-dev/ai-ping/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@starroy/ai-ping.svg)](https://www.npmjs.com/package/@starroy/ai-ping)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

用于检查常见 LLM API 协议兼容性的稳定 CLI 和 Core 库。

> Ping AI APIs before your clients do.

语言版本：

- [English](../../README.md)
- [繁體中文](README.zh-Hant.md)

AI Ping 是协议检查工具，不是网络 ping、benchmark、load test、uptime
monitor、API proxy、聊天客户端或官方认证。它用于确认一个 AI / LLM API
endpoint 是否具备客户端预期的协议行为。

## 安装

```bash
npm install -g @starroy/ai-ping
```

CLI 包名是 `@starroy/ai-ping`，命令名是 `aiping`。可复用 Core 库包名是
`@starroy/ai-ping-core`。

## Desktop Preview

AI Ping v1.2 包含 macOS-first 的 Tauri Desktop Preview。它提供本地 UI，用于选择
profile、填写 base URL、model、API key 和 timeout，运行 checks，查看结果，并导出
JSON 或 HTML report。Desktop UI 支持 English、简体中文和繁體中文，会根据系统语言
选择初始语言，也可以在应用内即时切换；语言偏好不会被保存。

```bash
pnpm install
pnpm desktop:dev
pnpm desktop:build:dmg
```

Desktop Preview 不替代 CLI，不翻译 CLI 输出、JSON report 或 HTML report，不保存
API key 或语言偏好，也不新增 checks 或 profiles。Windows / Linux 打包、
notarization、自动更新、保存设置和历史记录会放到后续版本。

本地 DMG 构建是 unsigned / ad-hoc，仅用于本地预览验证。打包命令、smoke checks
和预览限制详见 [apps/desktop/README.md](../../apps/desktop/README.md)。

## Web Playground Preview

AI Ping v1.3 新增 Web Playground Preview，用于在浏览器中快速检查
`openai-chat` 和 `openai-responses` endpoint。它是静态 Vite app：浏览器会直接向
你填写的 endpoint 发送请求，AI Ping 不提供 Worker 或服务端代理。

```bash
pnpm install
pnpm web:dev
pnpm web:build
```

Cloudflare Pages 推荐配置：build command 使用
`pnpm --filter @starroy/ai-ping-web build`，output directory 使用
`apps/web/dist`。不需要、也不应该配置服务端 API key。

API Key 仅保存在当前浏览器标签页内存中，页面刷新后会清空。AI Ping 不代理、不保存、
不记录浏览器请求或报告。因为检查在浏览器中运行，会受到 endpoint CORS 策略限制；
如果请求被 CORS 或浏览器本地网络规则拦截，请使用 CLI 或 Desktop 版本。

部署说明和无代理隐私边界见 [apps/web/README.md](../../apps/web/README.md)。

## 快速开始

```bash
aiping profiles

aiping check \
  --profile openai-chat \
  --base-url https://api.openai.com/v1 \
  --model gpt-5.1-mini
```

API key 可通过 `--api-key`、`AI_PING_API_KEY` 或 profile 专用环境变量传入。

```bash
OPENAI_API_KEY=your-key aiping check \
  --profile openai-chat \
  --base-url https://api.openai.com/v1 \
  --model gpt-5.1-mini
```

## 支持的 Profiles

| Profile | 说明 | Alias | API key 环境变量 |
| --- | --- | --- | --- |
| `openai-chat` | OpenAI-compatible Chat Completions API | `openai` | `OPENAI_API_KEY` |
| `openai-responses` | OpenAI-compatible Responses API | - | `OPENAI_API_KEY` |
| `ollama` | Ollama native API | - | 通常不需要 |
| `gemini` | Gemini Developer API REST | - | `GEMINI_API_KEY` |
| `anthropic` | Anthropic Claude Messages API | - | `ANTHROPIC_API_KEY` |

`openai` alias 指向 `openai-chat`，并会在 AI Ping 1.x 中继续保留。

## 应该使用哪个 Profile？

Chat Completions 兼容 endpoint 使用 `openai-chat`，包括本地 proxy、gateway
以及 Ollama 的 OpenAI-compatible `/v1/chat/completions`。

实现 OpenAI-compatible `POST /responses` 的 endpoint 使用
`openai-responses`。它检查 Responses 风格的 `input`、`output`、
`output_text` 和 semantic streaming events。AI Ping 1.x 暂不检查 Responses tools、
built-in tools、multimodal input 或 conversation state。

Ollama native `/api/tags`、`/api/generate` 和 `/api/chat` 使用 `ollama`。
Ollama native streaming 是 JSON lines，不是 SSE。

Gemini Developer API REST 使用 `gemini`，base URL 示例为
`https://generativelanguage.googleapis.com/v1beta`。Vertex AI Gemini 与 Gemini
OpenAI compatibility 是不同 API。

Anthropic Claude Messages API 使用 `anthropic`，base URL 示例为
`https://api.anthropic.com/v1`。Bedrock Anthropic、Vertex AI Anthropic、tool
use、extended thinking 和 computer use 不属于当前 1.x profile 范围。

## 报告

AI Ping 支持三种报告形态：

- Console report：默认终端输出，适合人工阅读
- JSON report：结构化输出，适合 issue、自动化和 CI
- HTML report：静态报告文件，适合分享、截图和 CI artifact

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

`--html` 可以和 `--json` 一起使用；stdout 仍然只输出纯 JSON，HTML 文件会单独写入。

报告默认不包含请求头或完整 API key。分享前仍应检查 JSON / HTML 报告，因为
endpoint 名称、model 名称、base URL hostname、错误 body 或 provider message
可能包含私有信息。

详见 [Reports](../reports.md)。

## OK 是什么意思？

当检查完成并且没有 required check 失败时，`summary.ok` 为 true。Recommended
check 可以失败，只要 required checks 通过，整体结果仍然是 OK。

Required checks 覆盖大多数客户端成功调用 endpoint 所需的协议行为。Recommended
checks 用于诊断有用的兼容性细节，例如 OpenAI-compatible `tools` /
`tool_calls`，但不会在 required checks 通过时让整体运行失败。

## CLI 命令

```bash
aiping --help
aiping check --help
aiping profiles
aiping checks --profile openai-chat
```

以下 `aiping check` 参数在 1.x 中保持稳定：

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

可用逗号分隔的 check ID 限定或跳过检查：

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5 \
  --only openai-chat.chat.basic,openai-chat.chat.stream
```

## Exit Codes

| Exit code | 含义 |
| ---: | --- |
| `0` | 检查完成，required checks 通过 |
| `1` | 检查完成，但至少一个 required check 失败 |
| `2` | CLI 参数或配置错误 |
| `3` | 未预期运行时错误 |

## 兼容性承诺

AI Ping 1.x 目标是保持 CLI 命令、稳定参数、Core report 核心字段、profile
名称、`openai` alias、npm 包名和 exit code 语义向后兼容。

稳定 report 字段包括 `version`、`profile`、`endpoint`、`model`、
`startedAt`、`durationMs`、`summary` 和 `results`。Minor 版本可以向后兼容地
新增 profile、check、输出选项或 optional report 字段，但不会删除或重命名稳定字段。

详见 [Compatibility Policy](../compatibility.md)。

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

大多数失败来自四类问题：profile 选错、base URL 前缀不对、API key 缺失或用错
header、provider 只实现了目标协议的一部分。

提交 issue 前请先阅读 [Troubleshooting](../troubleshooting.md)。

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

`runChecks` 只返回结构化报告，不打印终端输出、不写文件、不设置 exit code，也不管理 UI 状态。

## 开发

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm desktop:dev
```

贡献指南见 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 安全

请不要在公开 issue 中提交 API key、Authorization header、私有 endpoint
secret、私有 base URL 或敏感 JSON / HTML 报告。详见 [SECURITY.md](../../SECURITY.md)。

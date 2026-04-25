# Troubleshooting

AI Ping checks protocol behavior. A failed check does not always mean the
endpoint is down; it usually means the endpoint, selected profile, base URL, or
authentication method does not match the expected protocol.

## Base URL Issues

Use the base URL expected by the selected profile:

| Profile | Typical base URL |
| --- | --- |
| `openai-chat` | `https://api.openai.com/v1` or an OpenAI-compatible `/v1` root |
| `openai-responses` | `https://api.openai.com/v1` or an OpenAI-compatible `/v1` root |
| `ollama` | `http://localhost:11434` |
| `gemini` | `https://generativelanguage.googleapis.com/v1beta` |
| `anthropic` | `https://api.anthropic.com/v1` |

Avoid appending the operation path yourself. For example, pass
`https://api.openai.com/v1`, not `https://api.openai.com/v1/chat/completions`.

If a gateway rewrites paths, confirm whether it exposes OpenAI-compatible Chat
Completions, OpenAI-compatible Responses, or a provider-native API.

## API Key Issues

Use `--api-key`, `AI_PING_API_KEY`, or the profile-specific environment
variable:

| Profile | Profile-specific variable |
| --- | --- |
| `openai-chat` | `OPENAI_API_KEY` |
| `openai-responses` | `OPENAI_API_KEY` |
| `gemini` | `GEMINI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `ollama` | Usually none |

`--api-key` has the highest priority, then `AI_PING_API_KEY`, then the
profile-specific variable. Do not paste API keys, Authorization headers, or
private endpoint secrets into public issues.

## Profile Selection Issues

Use `openai-chat` for Chat Completions-compatible endpoints. Use
`openai-responses` only when the endpoint implements `POST /responses`. Use
`ollama` for Ollama native APIs, not Ollama's OpenAI-compatible `/v1` API. Use
`gemini` and `anthropic` for the provider-native APIs described in the README.

If the models list check passes but generation fails, the endpoint may expose a
partial compatibility layer. Attach a sanitized JSON or HTML report when filing
an issue.

## Required Checks vs Recommended Checks

Required checks represent behavior that most clients need for the profile. If a
required check fails, AI Ping returns exit code `1` and `summary.ok` is false.

Recommended checks diagnose important but narrower compatibility details. For
example, OpenAI-compatible `tool_calls` checks are recommended. They can fail
without making the overall run fail while required checks pass.

## Streaming Failures

Streaming protocols differ by profile:

| Profile | Streaming style |
| --- | --- |
| `openai-chat` | SSE with Chat Completions delta chunks |
| `openai-responses` | SSE with Responses semantic events |
| `ollama` | JSON lines |
| `gemini` | SSE with Gemini response chunks |
| `anthropic` | Event-based SSE |

Common causes include buffering proxies, gateways that strip SSE headers,
providers that only support non-streaming responses, and using a Chat
Completions profile against a Responses endpoint.

## Tool Call Failures

The `openai-chat` profile checks modern `tools` / `tool_calls` behavior.
Legacy `function_call` responses are detected but do not pass modern tool call
checks.

Tool call checks can fail when an endpoint accepts the `tools` parameter but
returns plain text, returns malformed JSON arguments, streams incomplete
argument fragments, or only implements legacy function calling.

## Responses API Failures

The `openai-responses` profile uses `input`, not `messages`, and expects
Responses-style `output`, `output_text`, and semantic streaming events. It does
not check Responses tools, built-in tools, multimodal input, or conversation
state in v1.0.

## HTML Report Sharing

HTML reports are useful for screenshots, support threads, and CI artifacts.
Before sharing, open the file and review endpoint names, hostnames, model names,
error messages, and provider response snippets.

Do not publish reports that include private base URLs, tenant IDs, account IDs,
API keys, Authorization headers, or customer data.

## Filing an Issue

Include:

- AI Ping version
- Command used, with secrets removed
- Profile
- Endpoint type, without exposing a private URL if it is sensitive
- Model
- Console output
- Sanitized JSON report or HTML report
- Expected behavior
- Actual behavior

Generate reports with:

```bash
aiping check ... --json > aiping-report.json
aiping check ... --html aiping-report.html
```

Do not paste API keys, Authorization headers, or private endpoint secrets.

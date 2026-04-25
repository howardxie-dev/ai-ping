# Changelog

All notable changes to this project will be documented in this file.

## 0.9.0

### Added

- Added the `openai-responses` profile for OpenAI-compatible Responses API
  checks.
- Added Responses checks for models list, basic responses, streaming responses,
  and error response format.
- Documented the boundary between `openai-chat`, `openai-responses`, and the
  backward-compatible `openai` alias.

### Changed

- Updated CLI profile/check listing tests for `openai-responses`.
- Updated README files with Responses API examples and check IDs.

### Notes

- `openai-responses` uses Responses-style `input`, `output`, `output_text`, and
  semantic SSE events. It does not check Responses tools in v0.9.
- The `openai` alias still points to `openai-chat`.

## 0.8.1

### Changed

- Renamed the canonical OpenAI-compatible Chat Completions profile to
  `openai-chat`.
- Kept `openai` as a backward-compatible alias for `openai-chat`.
- Renamed canonical OpenAI-compatible Chat Completions check IDs from
  `openai.*` to `openai-chat.*`.
- Kept old `openai.*` check IDs as aliases for `--only` and `--skip`.

### Notes

- OpenAI Responses API checks are not included yet.
- Future Responses API checks will use a separate `openai-responses` profile.

## 0.8.0

### Added

- Added `openai-chat.tool_calls.basic` for modern Chat Completions
  `tool_calls`.
- Added `openai-chat.tool_calls.stream` for streaming `delta.tool_calls`.
- Added streaming tool call aggregation and arguments JSON parsing.
- Added legacy `function_call` detection without treating it as modern
  `tool_calls` compatibility.

### Changed

- Documented OpenAI-compatible tool call checks and their recommended severity.

## 0.7.0

### Added

- Added the `anthropic` profile for Anthropic Claude Messages API checks.
- Added Anthropic models list, basic message, streaming message, and error
  format checks.
- Added `ANTHROPIC_API_KEY` support in the CLI.

### Changed

- Documented Anthropic `/v1` base URL usage, `x-api-key` authentication, and
  the default `anthropic-version: 2023-06-01` header.
- Clarified that Anthropic streaming uses event-based SSE, not OpenAI delta
  chunks.

## 0.6.1

### Changed

- Tuned Gemini warning rules based on real Gemini Developer API smoke results.
- Stopped treating a missing OpenAI-style `[DONE]` marker as a Gemini streaming
  warning.
- Reduced recommended-field noise for Gemini models list and error responses.

## 0.6.0

### Added

- Added the `gemini` profile for Gemini Developer API REST checks.
- Added Gemini models list, basic generation, streaming generation, and error
  format checks.

### Changed

- Documented Gemini `/v1beta` base URL usage, `GEMINI_API_KEY`, and
  `x-goog-api-key` authentication.
- Clarified that Gemini streaming uses SSE with Gemini response chunks, not
  OpenAI delta chunks.

## 0.5.0

### Added

- Added Ollama native chat checks for `/api/chat`.

### Changed

- Documented that the Ollama profile covers `/api/tags`, `/api/generate`, and
  `/api/chat`.
- Clarified that Ollama `/api/generate` is a prompt-style native API, while
  `/api/chat` is a messages-style native API.
- Clarified that Ollama OpenAI-compatible `/v1/chat/completions` should be
  checked with the `openai-chat` profile.

## 0.4.0

### Added

- Added the `ollama` profile alongside the OpenAI-compatible profile.
- Added Ollama usage examples to the README files.

### Changed

- Documented supported profiles and Ollama streaming as JSON lines, not SSE.

## 0.3.0

### Added

- Added `openai-chat.models.list` to the OpenAI-compatible profile.
- Added a local OpenAI-compatible mock endpoint example.
- Added a quick demo flow to the README files.

### Changed

- Improved CLI console report readability with counts, severity, and duration.

## 0.2.5

### Added

- Added release readiness metadata.
- Added GitHub Actions CI.
- Added issue templates and pull request template.
- Added MIT license.
- Added release checklist.
- Added multilingual README files.

### Changed

- Organized design documents under `docs/design`.

## 0.2.0

### Added

- Added `aiping` CLI.
- Added console report output.
- Added JSON output.
- Added exit code support.
- Added profile and check listing commands.

## 0.1.0

### Added

- Added `@starroy/ai-ping-core`.
- Added OpenAI-compatible profile.
- Added basic, streaming, and error format checks.
- Added structured report and summary output.

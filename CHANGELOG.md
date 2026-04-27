# Changelog

All notable changes to this project will be documented in this file.

## 1.3.0

### Added

- Added `@starroy/ai-ping-web`, a Vite + React Web Playground Preview for
  browser-based `openai-chat` and `openai-responses` checks.
- Added browser runner support that reuses `@starroy/ai-ping-core` `runChecks`
  and sends requests directly from the browser to the user-entered endpoint.
- Added browser JSON and HTML report exports using Blob downloads and the shared
  `@starroy/ai-ping-report` HTML renderer.
- Added Web i18n for English, Simplified Chinese, and Traditional Chinese.
- Added Web result helpers for summary state, top issues, and usability copy.
- Added friendly detection for likely browser CORS / fetch failures.

### Notes

- The Web Playground does not implement a Worker or proxy. API keys remain in
  the current browser tab memory and are not sent to AI Ping servers.
- Browser checks are limited by endpoint CORS policy; use CLI or Desktop when an
  endpoint blocks browser requests.

## 1.2.0

### Added

- Added Desktop UI internationalization for English, Simplified Chinese, and
  Traditional Chinese.
- Added system-locale detection and an in-app language switch that updates the
  Desktop UI immediately without saving language preferences.
- Added localized Desktop profile labels, profile descriptions, configuration
  text, result summaries, top issues, advanced details, export actions, empty
  states, and API key safety copy.

### Notes

- CLI output, JSON report fields, HTML reports, protocol IDs, check IDs, model
  names, base URLs, and raw details JSON keys remain untranslated.
- Core and CLI behavior are unchanged.

## 1.1.0

### Added

- Added a macOS-first Tauri Desktop Preview under `apps/desktop`.
- Added UI support for selecting profiles, entering endpoint/model/API key
  settings, running checks, viewing summaries and details, and exporting JSON
  or HTML reports.
- Added `@starroy/ai-ping-report` as a private shared workspace package for
  report rendering.

### Changed

- Moved the static HTML report renderer out of the CLI and into the shared
  report package.
- Kept CLI HTML output behavior unchanged while bundling the private report
  renderer into the published CLI package.
- Updated workspace scripts and documentation for Desktop Preview development.

### Notes

- Desktop Preview is macOS-first and preview quality. Windows and Linux
  packaging, notarization, auto update, saved settings, and history are outside
  this release.
- Desktop Preview does not persist API keys.

## 1.0.0

### Stable

- AI Ping reaches the first stable Core / CLI release.
- Stabilized profile naming for `openai-chat`, `openai-responses`, `ollama`,
  `gemini`, and `anthropic`.
- Stabilized the `openai` alias for `openai-chat` in the 1.x line.
- Stabilized report output formats: console, JSON, and HTML.
- Stabilized CLI commands, stable check options, and exit code semantics.
- Clarified the 1.x compatibility promise for CLI behavior, report core fields,
  profile names, aliases, package names, and SemVer.

### Documentation

- Reworked the README files around v1.0 stable positioning, quick start,
  supported profiles, profile selection, reports, exit codes, CI usage, and
  troubleshooting.
- Added compatibility policy documentation.
- Added troubleshooting documentation.
- Added report format and safe sharing documentation.
- Updated issue templates to request sanitized JSON / HTML reports and warn
  against posting API keys, Authorization headers, private endpoint secrets, or
  private base URLs.
- Updated the release checklist for v1.0 validation, report smoke tests, npm
  dry-runs, publishing, tagging, GitHub release, and post-publish smoke checks.

## 0.10.0

### Added

- Added `aiping check --html <file>` to write a static HTML report.
- Added CLI handling so console output reports the written HTML path, while
  `--json --html` keeps stdout as pure JSON.
- Added README examples for HTML reports and CI artifact upload.

### Changed

- Bumped workspace, core, and CLI package versions to `0.10.0`.

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

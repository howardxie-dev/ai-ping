# Release Checklist

Use this checklist for AI Ping v1.0 and later 1.x releases.

## Before Release

- [ ] Confirm the working tree contains only intended release changes
- [ ] Confirm package versions are set to the release version
- [ ] Confirm `CHANGELOG.md` has the release entry
- [ ] Review `README.md`
- [ ] Review `docs/readme/README.zh-Hans.md`
- [ ] Review `docs/readme/README.zh-Hant.md`
- [ ] Review `docs/troubleshooting.md`
- [ ] Review `docs/compatibility.md`
- [ ] Review `docs/reports.md`
- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm test`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm pack:check`
- [ ] For v1.2 Desktop Preview: `pnpm --filter @starroy/ai-ping-desktop test`
- [ ] For v1.2 Desktop Preview: `pnpm --filter @starroy/ai-ping-desktop typecheck`
- [ ] For v1.2 Desktop Preview: `pnpm --filter @starroy/ai-ping-desktop build`
- [ ] For v1.2 Desktop Preview: `pnpm desktop:build:app`
- [ ] For v1.2 Desktop Preview: `pnpm desktop:build:dmg`

## Desktop Preview Smoke

- [ ] Open `AI Ping Desktop Preview.app`
- [ ] Confirm the app title is `AI Ping Desktop Preview`
- [ ] Confirm the Desktop UI starts in the expected language for `en`,
      `zh-Hans`, and `zh-Hant` system locale inputs
- [ ] Switch between `English`, `简体中文`, and `繁體中文` and confirm visible UI
      text updates immediately
- [ ] Confirm language preferences are not persisted after relaunch
- [ ] Confirm CLI output, JSON reports, HTML reports, protocol IDs, check IDs,
      model names, base URLs, and raw details JSON keys remain untranslated
- [ ] Confirm the app icon renders in Finder and Dock
- [ ] Open the DMG and confirm the background image renders
- [ ] Confirm the DMG contains `AI Ping Desktop Preview.app` and `Applications`
- [ ] Drag the app into Applications and launch it
- [ ] Run one check with a known local or disposable endpoint
- [ ] Export one JSON report
- [ ] Export one HTML report
- [ ] Confirm API keys are kept in memory only and are not persisted
- [ ] Confirm the build is unsigned / ad-hoc unless Developer ID signing and
      notarization are explicitly enabled for the release

## CLI Smoke

- [ ] `pnpm --filter @starroy/ai-ping cli --help`
- [ ] `pnpm --filter @starroy/ai-ping cli check --help`
- [ ] `pnpm --filter @starroy/ai-ping cli profiles`
- [ ] `pnpm --filter @starroy/ai-ping cli checks --profile openai-chat`
- [ ] `pnpm --filter @starroy/ai-ping cli checks --profile openai-responses`
- [ ] `pnpm --filter @starroy/ai-ping cli checks --profile ollama`
- [ ] `pnpm --filter @starroy/ai-ping cli checks --profile gemini`
- [ ] `pnpm --filter @starroy/ai-ping cli checks --profile anthropic`
- [ ] Confirm `openai` alias still resolves to `openai-chat`
- [ ] Confirm exit code `0` when required checks pass
- [ ] Confirm exit code `1` when at least one required check fails
- [ ] Confirm exit code `2` for usage or configuration errors

## Report Smoke

- [ ] Console report smoke
- [ ] JSON output smoke with `--json`
- [ ] HTML output smoke with `--html reports/aiping.html`
- [ ] Combined output smoke with `--json --html reports/aiping.html`
- [ ] Confirm combined output keeps stdout as pure JSON
- [ ] Confirm report `version` matches the package version
- [ ] Confirm report has stable top-level fields: `version`, `profile`,
      `endpoint`, `model`, `startedAt`, `durationMs`, `summary`, `results`
- [ ] Confirm report `summary` has `passed`, `warned`, `failed`, `skipped`,
      `total`, `requiredFailed`, `ok`
- [ ] Confirm result entries have `id`, `title`, `status`, `severity`,
      `category`, `message`, `durationMs`, `details`

## Package Verification

- [ ] `pnpm --filter @starroy/ai-ping-core publish --dry-run --access public`
- [ ] `pnpm --filter @starroy/ai-ping publish --dry-run --access public`
- [ ] `@starroy/ai-ping-core` package includes `dist`, `README.md`,
      `package.json`, `LICENSE`
- [ ] `@starroy/ai-ping` package includes `dist`, `README.md`, `package.json`,
      `LICENSE`
- [ ] `@starroy/ai-ping` package does not require installing private
      `@starroy/ai-ping-report`
- [ ] Packages do not include `src`, `tests`, `docs/design`, `node_modules`,
      private endpoints, or API keys

## Release

- [ ] Publish `@starroy/ai-ping-core`
- [ ] Publish `@starroy/ai-ping`
- [ ] Create git tag, for v1.0.0 use `git tag v1.0.0`
- [ ] Push git tag, for v1.0.0 use `git push origin v1.0.0`
- [ ] Create GitHub Release
- [ ] Confirm GitHub Release links to the changelog and npm packages

## After Release

- [ ] Install from npm in a clean directory:
      `npm install -g @starroy/ai-ping`
- [ ] `aiping --version`
- [ ] `aiping --help`
- [ ] `aiping profiles`
- [ ] `aiping checks --profile openai-chat`
- [ ] Run one JSON report smoke from the published CLI
- [ ] Run one HTML report smoke from the published CLI
- [ ] Verify npm package pages for `@starroy/ai-ping-core` and
      `@starroy/ai-ping`
- [ ] Verify README links and docs links on GitHub

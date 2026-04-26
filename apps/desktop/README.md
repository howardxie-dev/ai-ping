# AI Ping Desktop Preview

`@starroy/ai-ping-desktop` is a macOS-first Preview app for running AI Ping compatibility checks from a small Tauri desktop shell.

## Status

- Preview quality for v1.2.
- macOS is the primary target.
- The Desktop Preview may save non-sensitive desktop configuration so the next
  launch can restore the last-used workflow.
- API keys are kept only in React component state. They are not written to
  localStorage, sessionStorage, IndexedDB, saved configuration, or logs.
- Export uses Tauri dialog and filesystem plugins. Browser-only Vite runs can execute checks, but export actions show a graceful desktop-only error.
- Checks run in the frontend preview path and can still be affected by endpoint CORS behavior.

## Commands

From this package after the root workspace includes `apps/*`:

```sh
pnpm install
pnpm --filter @starroy/ai-ping-desktop dev
pnpm --filter @starroy/ai-ping-desktop tauri:dev
pnpm --filter @starroy/ai-ping-desktop typecheck
pnpm --filter @starroy/ai-ping-desktop test
pnpm --filter @starroy/ai-ping-desktop build
pnpm --filter @starroy/ai-ping-desktop build:app
pnpm --filter @starroy/ai-ping-desktop build:dmg
```

From the repository root:

```sh
pnpm desktop:dev
pnpm desktop:build:app
pnpm desktop:build:dmg
```

## Local Packaging

`pnpm desktop:build:app` builds a local macOS `.app` bundle. `pnpm
desktop:build:dmg` builds a drag-to-Applications DMG with the project icon and
DMG background configured in `src-tauri/tauri.conf.json`.

The v1.2 Desktop Preview package is unsigned / ad-hoc by default. It is suitable
for local installation checks, but it is not yet notarized for public macOS
distribution. Developer ID signing and Apple notarization are intentionally kept
out of the default build path.

Expected local artifacts:

```text
apps/desktop/src-tauri/target/release/bundle/macos/AI Ping Desktop Preview.app
apps/desktop/src-tauri/target/release/bundle/dmg/AI Ping Desktop Preview_<version>_aarch64.dmg
```

## Smoke Checklist

- Open the Desktop Preview app.
- Confirm the title is `AI Ping Desktop Preview`.
- Confirm the app icon and DMG background render correctly.
- Select a profile and run a check with a known endpoint.
- Export JSON and HTML reports.
- Confirm non-sensitive configuration can be restored.
- Confirm API keys are not saved after closing the app.

During integration, `@starroy/ai-ping-report` must provide `renderHtmlReport(report)` and the workspace must include this app.

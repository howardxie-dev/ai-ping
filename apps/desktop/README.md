# AI Ping Desktop Preview

`@starroy/ai-ping-desktop` is a cross-platform Preview app for running AI Ping compatibility checks from a small Tauri desktop shell.

## Status

- Preview quality for v1.4.
- macOS remains the primary local packaging target, with macOS universal,
  Windows x64 / arm64, and Linux x64 / arm64 Preview bundles configured for
  GitHub-hosted runners.
- The UI supports English, Simplified Chinese, and Traditional Chinese. The
  initial language follows the system locale when supported, and the in-app
  language switch applies immediately without persistence.
- API keys are kept only in React component state. They are not written to localStorage, sessionStorage, IndexedDB, or logs.
- CLI output, JSON reports, HTML reports, protocol IDs, check IDs, model names,
  base URLs, and raw details JSON keys are intentionally not translated.
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
pnpm --filter @starroy/ai-ping-desktop build:macos
pnpm --filter @starroy/ai-ping-desktop build:windows
pnpm --filter @starroy/ai-ping-desktop build:linux
```

From the repository root:

```sh
pnpm desktop:dev
pnpm desktop:build:app
pnpm desktop:build:dmg
pnpm desktop:build:macos
pnpm desktop:build:windows
pnpm desktop:build:linux
```

## Local Packaging

`pnpm desktop:build:app` builds a local macOS `.app` bundle. `pnpm
desktop:build:dmg` builds a drag-to-Applications DMG with the project icon and
DMG background configured in `src-tauri/tauri.conf.json`. `pnpm
desktop:build:macos` builds both macOS bundle types.

Windows and Linux Preview packaging uses Tauri's native platform runners. Run
`pnpm desktop:build:windows` on Windows to build both a traditional NSIS setup
`.exe` installer and a WiX `.msi` installer. The NSIS installer is configured
with `installMode: "both"` so users can choose a current-user or system-wide
installation path during setup instead of running a portable executable
directly. The MSI target is included because some Windows users and managed
environments expect Microsoft Installer packages; it must be built on Windows
because the WiX toolchain is Windows-only. Run `pnpm desktop:build:linux` on
Linux to build AppImage and Debian packages. AppImage provides a portable
Preview artifact, while Debian packages cover apt-based smoke installs.

CI builds release artifacts on five GitHub-hosted runner jobs: macOS universal,
Windows arm64, Windows x64, Linux arm64, and Linux x64. macOS uses Tauri's
`universal-apple-darwin` target to merge Apple Silicon and Intel binaries into
one `.app` / `.dmg`. Windows and Linux stay architecture-specific because their
installer and package formats are expected to target one CPU architecture at a
time. Tauri automatically merges `src-tauri/tauri.windows.conf.json` on Windows
and `src-tauri/tauri.linux.conf.json` on Linux, while the base
`src-tauri/tauri.conf.json` keeps macOS `app` and `dmg` targets. The JSON config
files intentionally stay comment-free because they must remain valid JSON; this
section documents the packaging choices instead.

The v1.4 Desktop Preview package is unsigned / ad-hoc by default. It is suitable
for local installation checks, but it is not yet signed, notarized, or prepared
for public store-style distribution. Developer ID signing, Apple notarization,
Windows code signing, Linux repository publishing, auto-update, saved local
configuration, and history persistence are intentionally kept out of the default
build path.

Expected local artifacts:

```text
apps/desktop/src-tauri/target/release/bundle/macos/AI Ping Desktop Preview.app
apps/desktop/src-tauri/target/release/bundle/dmg/AI Ping Desktop Preview_1.4.0_aarch64.dmg
apps/desktop/src-tauri/target/release/bundle/nsis/AI Ping Desktop Preview_1.4.0_x64-setup.exe
apps/desktop/src-tauri/target/release/bundle/msi/AI Ping Desktop Preview_1.4.0_x64_en-US.msi
apps/desktop/src-tauri/target/release/bundle/appimage/AI Ping Desktop Preview_1.4.0_amd64.AppImage
apps/desktop/src-tauri/target/release/bundle/deb/AI Ping Desktop Preview_1.4.0_amd64.deb
```

GitHub Release assets use stable user-facing names:

```text
AI-Ping-Desktop-Preview_1.4.0_macos-universal.dmg
AI-Ping-Desktop-Preview_1.4.0_macos-universal.app.zip
AI-Ping-Desktop-Preview_1.4.0_windows-x64.exe
AI-Ping-Desktop-Preview_1.4.0_windows-x64.msi
AI-Ping-Desktop-Preview_1.4.0_windows-arm64.exe
AI-Ping-Desktop-Preview_1.4.0_windows-arm64.msi
AI-Ping-Desktop-Preview_1.4.0_linux-x64.AppImage
AI-Ping-Desktop-Preview_1.4.0_linux-x64.deb
AI-Ping-Desktop-Preview_1.4.0_linux-arm64.AppImage
AI-Ping-Desktop-Preview_1.4.0_linux-arm64.deb
```

The platform and architecture suffix prevents multi-architecture uploads from
overwriting each other while keeping the download list readable.

## Smoke Checklist

- Open the Desktop Preview app.
- Confirm the title is `AI Ping Desktop Preview`.
- Switch the language between `English`, `简体中文`, and `繁體中文` and confirm
  the visible Desktop UI updates immediately.
- Confirm the app icon and DMG background render correctly.
- Select a profile and run a check with a known endpoint.
- Export JSON and HTML reports.
- Confirm API keys are not saved after closing the app.
- Confirm the selected language is not saved after closing the app.

During integration, `@starroy/ai-ping-report` must provide `renderHtmlReport(report)` and the workspace must include this app.

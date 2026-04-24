# Contributing

Thanks for helping improve AI Ping.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## Project Structure

- `packages/core`: reusable protocol checking core.
- `packages/cli`: command-line interface.
- `docs/readme`: translated README files.
- `docs/design`: PRD/TDD and design history.
- `docs/release`: release process documentation.

## Pull Requests

Please include:

- A short summary.
- A clear test plan.
- Relevant docs updates.
- Any package metadata changes, if needed.

Before opening a PR, run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Scope

AI Ping is intentionally small. Please avoid adding benchmark, load testing,
monitoring, proxy, or chat-client features unless the project scope changes.

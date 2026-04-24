# Release Checklist

## Pre-release

- [ ] Confirm working tree is clean
- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm test`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm pack:check`
- [ ] Review README
- [ ] Review CHANGELOG
- [ ] Confirm package versions
- [ ] Confirm package metadata

## Package Verification

- [ ] `ai-ping` package includes `dist`, `README.md`, `package.json`, `LICENSE`
- [ ] `@ai-ping/core` package includes `dist`, `README.md`, `package.json`, `LICENSE`
- [ ] Packages do not include `src`, `tests`, `node_modules`, or design docs

## Publish

- [ ] Publish `@ai-ping/core`
- [ ] Publish `ai-ping`
- [ ] Create git tag
- [ ] Create GitHub release

## Post-release

- [ ] Install `ai-ping` globally from npm
- [ ] Run `aiping --help`
- [ ] Run `aiping profiles`
- [ ] Run `aiping checks --profile openai`

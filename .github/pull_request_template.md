## Summary

## Changes

## Test Plan

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm test`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm pack:check`
- [ ] CLI smoke, if CLI behavior changed
- [ ] JSON / HTML report smoke, if report behavior changed

## Scope

- [ ] Core
- [ ] CLI
- [ ] Docs
- [ ] GitHub templates
- [ ] Release

## Compatibility

- [ ] Stable 1.x CLI commands and options remain compatible
- [ ] Stable report fields remain compatible
- [ ] Supported profile names and aliases remain compatible
- [ ] Exit code meanings remain compatible
- [ ] Package names remain unchanged

## Safety

- [ ] No API keys, Authorization headers, private endpoint secrets, or private base URLs are included
- [ ] JSON / HTML reports included in the PR are sanitized
- [ ] README/docs updated if behavior changed
- [ ] Issue templates updated if report sharing guidance changed

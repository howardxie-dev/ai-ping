# Compatibility Policy

AI Ping 1.x is the first stable Core / CLI line. It aims to keep public CLI
behavior, stable profile names, stable report fields, npm package names, and
exit code semantics backward-compatible throughout 1.x.

## SemVer

Patch versions fix bugs and improve compatibility without changing public
behavior.

Minor versions may add profiles, checks, report output options, or optional
report fields in a backward-compatible way.

Major versions may introduce breaking changes.

## CLI Compatibility

The following commands are stable in 1.x:

```bash
aiping check
aiping profiles
aiping checks
```

The following `aiping check` options are stable in 1.x:

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

New commands or options may be added in minor versions. Existing stable command
semantics will not be intentionally broken in 1.x.

## Exit Codes

| Exit code | Meaning |
| ---: | --- |
| `0` | Check completed and required checks passed |
| `1` | Check completed but at least one required check failed |
| `2` | CLI usage or configuration error |
| `3` | Unexpected runtime error |

## Report Schema Compatibility

The following top-level report fields are stable in 1.x:

```text
version
profile
endpoint
model
startedAt
durationMs
summary
results
```

The following `summary` fields are stable in 1.x:

```text
passed
warned
failed
skipped
total
requiredFailed
ok
```

The following result fields are stable in 1.x:

```text
id
title
status
severity
category
message
durationMs
details
```

Minor versions may add optional fields. Stable fields will not be removed or
renamed in 1.x.

## Profile Naming Compatibility

The supported v1.0 canonical profiles are:

```text
openai-chat
openai-responses
ollama
gemini
anthropic
```

Canonical profile names will remain valid throughout 1.x.

## Alias Policy

The `openai` alias maps to `openai-chat`. It exists for backward compatibility
and will not be removed in 1.x.

Older OpenAI-compatible check IDs may remain available as aliases for `--only`
and `--skip` when needed for backward compatibility.

## What May Change in Minor Versions

Minor versions may add:

- Provider profiles
- Checks within existing profiles
- Optional report fields
- CLI output formats
- More detailed diagnostics
- Documentation and templates

Recommended checks may become more complete as long as required check and exit
code semantics remain compatible.

## What Requires a Major Version

The following changes require a major version:

- Removing a stable command or stable option
- Removing or renaming a stable report field
- Removing a v1.0 canonical profile name
- Removing the `openai` alias
- Changing exit code meanings
- Renaming npm packages

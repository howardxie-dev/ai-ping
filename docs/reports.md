# Reports

AI Ping reports are designed for local diagnosis, CI artifacts, and issue
triage. v1.0 supports console, JSON, and HTML report formats.

## Console Report

Console output is the default:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5
```

Use it when a person is reading the result in a terminal. The console report is
not intended to be a stable machine-readable format.

## JSON Report

Use `--json` for automation, issue reports, and CI processing:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5 \
  --json > aiping-report.json
```

The stable top-level fields in 1.x are:

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

The stable `summary` fields are:

```text
passed
warned
failed
skipped
total
requiredFailed
ok
```

The stable result fields are:

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

Optional fields may be added in minor versions. Consumers should ignore fields
they do not understand.

`endpoint` is the base URL passed through `--base-url` or the `baseUrl`
option in `runChecks`.

## HTML Report

Use `--html <file>` to write a static report:

```bash
aiping check \
  --profile openai-chat \
  --base-url http://localhost:3000/v1 \
  --model gpt-5.5 \
  --html reports/aiping.html
```

`--html` can be combined with `--json`; stdout remains pure JSON and the HTML
file is written separately.

HTML reports are useful for support threads, screenshots, release validation,
and CI artifacts.

## CI Artifacts

Store HTML reports as build artifacts so they are available even when checks
fail:

```yaml
- run: |
    mkdir -p reports
    aiping check \
      --profile openai-chat \
      --base-url http://localhost:3000/v1 \
      --model test-model \
      --html reports/aiping.html
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: ai-ping-report
    path: reports/aiping.html
```

Use JSON artifacts when another job needs to parse `summary.ok`,
`summary.requiredFailed`, or individual result statuses.

## Sharing Reports Safely

Reports do not include request headers or full API keys by default. They can
still contain sensitive operational context.

Before sharing JSON or HTML reports, review and remove:

- API keys, tokens, Authorization headers, and private endpoint secrets
- Private base URLs, hostnames, tenant IDs, account IDs, or customer names
- Internal model names if they are sensitive
- Error bodies that include request payloads or private provider messages
- Any customer data returned by a non-standard endpoint

For public issues, prefer sanitized JSON snippets or attach a sanitized HTML
report. Do not paste secrets directly into GitHub issues.

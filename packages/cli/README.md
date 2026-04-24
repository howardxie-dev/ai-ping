# ai-ping

Command-line interface for AI Ping protocol checks.

## Usage

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

Use JSON output for issue reports or CI artifacts:

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini \
  --json
```

List supported profiles and checks:

```bash
aiping profiles
aiping checks --profile openai
```

Exit codes:

- `0`: checks completed and required checks passed
- `1`: checks completed and at least one required check failed
- `2`: usage or configuration error
- `3`: unexpected CLI runtime error

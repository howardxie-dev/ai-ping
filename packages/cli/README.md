# @starroy/ai-ping

Command-line interface for AI Ping protocol checks.

The npm package is `@starroy/ai-ping` and the installed command is `aiping`.

## Usage

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model gpt-4o-mini
```

Quick demo with the local mock endpoint:

```bash
pnpm install
pnpm --filter openai-compatible-mock dev

aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model demo-model
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

# openai-compatible-mock

Minimal local OpenAI-compatible mock server for trying AI Ping end to end.

## Start

```bash
pnpm --filter openai-compatible-mock dev
```

Or from this directory:

```bash
pnpm dev
```

The server listens on `http://localhost:3000` by default.

To use another port:

```bash
PORT=3001 pnpm dev
```

## Supported Routes

- `GET /v1/models`
- `POST /v1/chat/completions`

## Try With AI Ping

```bash
aiping check \
  --profile openai \
  --base-url http://localhost:3000/v1 \
  --model demo-model
```

This mock server does not call a real model. It only returns the minimum
OpenAI-compatible responses needed for demo and smoke-check flows.

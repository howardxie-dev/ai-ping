# AI Ping Web Playground Preview

AI Ping Web Playground is a Vite + React static app for running AI Ping checks
directly in the browser. It is a preview entry point for quick OpenAI-compatible
endpoint checks without installing the CLI or Desktop app.

## Privacy Boundary

- Requests go directly from the browser to the endpoint entered by the user.
- API keys are kept in the current browser tab memory only.
- API keys are not stored in localStorage, sessionStorage, IndexedDB, cookies,
  URL query strings, or AI Ping servers.
- AI Ping does not proxy, store, or log requests or reports.

## Browser Limits

The Web Playground does not include a Worker or server proxy. Browser checks are
therefore limited by endpoint CORS policy. If the endpoint blocks browser
requests, use the CLI or Desktop version for local checks.

The v1.3 preview exposes browser subsets for:

- `openai-chat`
- `openai-responses`

## Development

```bash
pnpm install
pnpm --filter @starroy/ai-ping-web dev
pnpm --filter @starroy/ai-ping-web test
pnpm --filter @starroy/ai-ping-web build
```

The dev server uses `http://127.0.0.1:11874`.

## Cloudflare Pages

Recommended Pages settings:

```text
Build command: pnpm --filter @starroy/ai-ping-web build
Output directory: apps/web/dist
```

No API environment variables are required. Do not configure a server-side API
key for the Web Playground.

Cloudflare Pages may use the included static files:

- `public/_redirects` for SPA fallback
- `public/_headers` for basic security headers

If a Worker is used later, it must be limited to static assets, headers,
redirects, or cache policy. It must not receive API keys, proxy endpoint
requests, store request content, store reports, or create share links.

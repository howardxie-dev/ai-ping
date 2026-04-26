# @starroy/ai-ping-report

Shared report renderers for AI Ping.

## HTML Reports

```ts
import { renderHtmlReport } from "@starroy/ai-ping-report";

const html = renderHtmlReport(report);
```

The package currently exposes the static HTML report renderer used by the CLI
and Desktop Preview flows. It is a private workspace package in v1.1; the
published CLI bundles this renderer so npm users do not need to install it.

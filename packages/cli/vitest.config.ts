import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@starroy/ai-ping-core": resolve(__dirname, "../core/src/index.ts"),
      "@starroy/ai-ping-report": resolve(__dirname, "../report/src/index.ts"),
    },
  },
});

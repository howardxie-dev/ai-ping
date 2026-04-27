import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      "@starroy/ai-ping-core": resolve(__dirname, "../../packages/core/src/index.ts"),
      "@starroy/ai-ping-report": resolve(__dirname, "../../packages/report/src/index.ts"),
    },
  },
  server: {
    port: 11874,
    strictPort: true,
  },
  preview: {
    port: 11875,
    strictPort: true,
  },
  build: {
    target: "es2022",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});

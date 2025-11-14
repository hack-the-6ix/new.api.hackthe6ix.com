import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
    alias: {
      "@": path.resolve(__dirname, "src"),
      $: path.resolve(__dirname),
    },
  },
});

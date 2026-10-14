import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      // Run the agent pipeline instantly in tests.
      PIPELINE_STEP_DELAY_MS: "0",
      SIMULATION_REPORT_GAP_MS: "0",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

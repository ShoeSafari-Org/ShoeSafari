import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.rules.test.js"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});

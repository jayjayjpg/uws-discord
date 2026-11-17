import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15_000, // a few tests hit the real local Postgres
    globals: false,
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});

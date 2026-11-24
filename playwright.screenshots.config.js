import { defineConfig, devices } from "@playwright/test";

// `pnpm screenshots`: regenerates the README screenshots in docs/screenshots.
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.shot.js",
  reporter: "list",
  timeout: 120_000,
  use: { ...devices["Desktop Chrome"], locale: "es-ES" },
  projects: [{ name: "chromium" }],
});

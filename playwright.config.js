import { defineConfig, devices } from "@playwright/test";

// Each test starts its own server (see e2e/fixtures.js), so no webServer here.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Desktop Chrome and Firefox, and Safari on a tablet: touch input and the
  // WebKit engine are what Chromium alone would not catch.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    {
      name: "webkit-tablet",
      use: { ...devices["iPad Pro 11 landscape"] },
      // WebKit is much slower than the others, above all on Windows.
      timeout: 90_000,
    },
  ],
});

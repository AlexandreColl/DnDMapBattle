import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.js"],
    coverage: {
      provider: "v8",
      // Unit tests cover the server and the pure client logic; the DOM
      // modules in public/js are exercised by the E2E tests in e2e/.
      include: [
        "server/**/*.js",
        "public/js/lib/**/*.js",
        "public/js/shared/**/*.js",
        "scripts/commit-format.js",
      ],
      exclude: ["server/index.js"],
      reporter: ["text", "html", "lcov"],
      // Raise these as tests are added; CI fails if coverage drops below.
      thresholds: { statements: 90, branches: 80, functions: 85, lines: 90 },
    },
  },
});

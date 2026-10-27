import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/",
      "coverage/",
      "test-results/",
      "playwright-report/",
      "dist/",
    ],
  },
  js.configs.recommended,
  {
    files: ["public/js/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      "server/**/*.js",
      "scripts/**/*.js",
      "test/**/*.js",
      "e2e/**/*.js",
      "*.config.js",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  prettier,
];

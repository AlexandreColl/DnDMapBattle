import { describe, expect, it } from "vitest";
import { formatError } from "../../scripts/commit-format.js";

describe("formatError", () => {
  it.each([
    "✨ feat: add touch support",
    "🐛 fix(ui): raise secondary text contrast to WCAG AA",
    "⬆️ build(deps): bump zod from 4.6.6 to 4.6.7",
    "♻️ refactor(fog)!: draw fog on a canvas",
    "🔖 chore(release): prepare 1.1.0",
    "📝 docs: document `pnpm test:e2e`",
    "🔀 Merge branch 'main' into develop",
    "✨ feat: add tokens\n\nBody with Any. Format.",
  ])("accepts %j", (message) => {
    expect(formatError(message)).toBeNull();
  });

  it.each([
    [":sparkles: feat: add tokens", "shortcode"],
    ["feat: add tokens", "gitmoji"],
    ["✨ feature: add tokens", "tipo"],
    ["✨ feat: Add tokens", "minúscula"],
    ["✨ feat: add tokens.", "punto"],
    ["✨ feat add tokens", "formato"],
    ["Merge pull request #9 from AlexandreColl/chore/ci", "gitmoji"],
    ["", "gitmoji"],
  ])("rejects %j", (message, reason) => {
    expect(formatError(message)).toMatch(reason);
  });
});

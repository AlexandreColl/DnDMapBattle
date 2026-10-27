// Commit and PR title convention: a Unicode gitmoji, then Conventional
// Commits. See "Formato de commits" in the README.

export const TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

// An emoji (with an optional variation selector), a type, an optional
// scope, an optional "!" for breaking changes and a lowercase description.
const CONVENTIONAL = new RegExp(
  "^\\p{Extended_Pictographic}\\uFE0F? " +
    `(${TYPES.join("|")})(\\([a-z0-9-]+\\))?!?: [a-z0-9\`].*[^.]$`,
  "u",
);
const MERGE = /^🔀 Merge branch '[^']+' into \S+$/u;

/**
 * Returns why `message` (its first line) breaks the convention, or null.
 * @param {string} message
 * @returns {string | null}
 */
export function formatError(message) {
  const subject = message.split("\n")[0].trim();
  if (CONVENTIONAL.test(subject) || MERGE.test(subject)) return null;
  if (/^:[a-z0-9_+-]+:/.test(subject)) {
    return "usa el emoji Unicode, no un :shortcode:";
  }
  if (!/^\p{Extended_Pictographic}/u.test(subject)) {
    return "debe empezar por un gitmoji";
  }
  const type = subject.match(/^\S+ ([a-z]+)/u)?.[1];
  if (!type || !TYPES.includes(type)) {
    return `tipo no válido; usa uno de: ${TYPES.join(", ")}`;
  }
  if (subject.endsWith(".")) return "la descripción no termina en punto";
  return "formato esperado: <emoji> tipo(ámbito): descripción en minúscula";
}

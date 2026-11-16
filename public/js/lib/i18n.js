// Interface language: which one to use and how to fill in a message. Kept
// free of the DOM so the server-side tests can check it.

export const DEFAULT_LANGUAGE = "es";

/**
 * The saved choice if it is available, else the first browser language that
 * is (by its base: "ca-ES" → "ca"), else Spanish.
 * @param {string | null} saved
 * @param {readonly string[]} browserLanguages
 * @param {readonly string[]} available
 */
export function pickLanguage(saved, browserLanguages, available) {
  if (saved && available.includes(saved)) return saved;
  for (const tag of browserLanguages) {
    const base = String(tag).toLowerCase().split("-")[0];
    if (available.includes(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * The message `key` with each `{name}` replaced by `params.name`. Falls back
 * to the fallback dictionary, then to the key itself.
 * @param {Record<string, string>} messages
 * @param {Record<string, string>} fallback
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 */
export function format(messages, fallback, key, params = {}) {
  const text = messages[key] ?? fallback[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}

/** The `{name}` placeholders in a message, sorted. */
export function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

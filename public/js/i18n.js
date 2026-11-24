// Interface language, chosen per device and kept in this browser. Changing it
// reloads the page: the board comes back from the server, already translated.
import { format, pickLanguage } from "./lib/i18n.js";
import { ca } from "./locales/ca.js";
import { en } from "./locales/en.js";
import { es } from "./locales/es.js";

/** Each language by its own name, as the selector shows it. */
export const LANGUAGES = Object.freeze({
  es: "Español",
  en: "English",
  ca: "Català",
});

const DICTIONARIES = { es, en, ca };
const STORAGE_KEY = "language";
const ATTRIBUTES = ["title", "placeholder", "aria-label", "data-empty"];

function savedLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const language = pickLanguage(
  savedLanguage(),
  navigator.languages ?? [navigator.language],
  Object.keys(DICTIONARIES),
);

/** The message `key` in the current language, with `{name}` filled in. */
export function t(key, params) {
  return format(DICTIONARIES[language], es, key, params);
}

export function setLanguage(lang) {
  if (lang === language || !Object.hasOwn(DICTIONARIES, lang)) return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Without storage the choice would not survive the reload.
    return;
  }
  location.reload();
}

/**
 * Translates the markup: `data-i18n` sets the text, `data-i18n-title` (and
 * the like for each attribute in ATTRIBUTES) sets that attribute.
 */
export function translatePage(root = document) {
  document.documentElement.lang = language;
  for (const el of root.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  for (const attr of ATTRIBUTES) {
    for (const el of root.querySelectorAll(`[data-i18n-${attr}]`)) {
      el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)));
    }
  }
}

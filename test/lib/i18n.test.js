import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  format,
  pickLanguage,
  placeholders,
} from "../../public/js/lib/i18n.js";
import { ca } from "../../public/js/locales/ca.js";
import { en } from "../../public/js/locales/en.js";
import { es } from "../../public/js/locales/es.js";
import { CONDITIONS, HEALTH, LIMITS } from "../../public/js/shared/protocol.js";

const PUBLIC = path.join(import.meta.dirname, "../../public");
const AVAILABLE = ["es", "en", "ca"];

describe("pickLanguage", () => {
  it("prefers the saved choice, then the browser, then Spanish", () => {
    expect(pickLanguage("ca", ["en-US"], AVAILABLE)).toBe("ca");
    expect(pickLanguage(null, ["fr-FR", "ca-ES", "en"], AVAILABLE)).toBe("ca");
    expect(pickLanguage("de", ["EN-gb"], AVAILABLE)).toBe("en");
    expect(pickLanguage(null, ["fr", "de"], AVAILABLE)).toBe(DEFAULT_LANGUAGE);
    expect(pickLanguage("__proto__", [], AVAILABLE)).toBe(DEFAULT_LANGUAGE);
  });
});

describe("format", () => {
  it("fills in placeholders and falls back to Spanish, then the key", () => {
    expect(format(en, es, "turn.of", { name: "Aria" })).toBe("Aria's turn");
    expect(format({}, es, "turn.of", { name: "Aria" })).toBe("Turno de Aria");
    expect(format({}, {}, "missing.key")).toBe("missing.key");
    expect(format(es, es, "turn.of")).toBe("Turno de {name}");
    expect(format(es, es, "presence.many", { count: 0 })).toBe("0 jugadores");
  });
});

/** Every translation key the client uses, found in its source. */
function usedKeys() {
  const keys = new Set();
  const html = fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8");
  for (const m of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) {
    keys.add(m[1]);
  }
  const dir = path.join(PUBLIC, "js");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    const js = fs.readFileSync(path.join(dir, file), "utf8");
    // t("key") or t(cond ? "a" : "b"), hints and class names kept as keys,
    // SaveFileError("key").
    for (const m of js.matchAll(
      /\bt\(\s*(?:\w+ \? )?"([^"]+)"(?: : "([^"]+)")?|hint: "([^"]+)"|"(class\.\w+)"|SaveFileError\("([^"]+)"\)/g,
    )) {
      for (const key of m.slice(1)) if (key) keys.add(key);
    }
  }
  const lib = fs.readFileSync(path.join(dir, "lib/save-file.js"), "utf8");
  for (const m of lib.matchAll(/SaveFileError\("([^"]+)"\)/g)) keys.add(m[1]);
  // Built from constants: condition.<id>, health.<level> and size.<n>.
  for (const c of CONDITIONS) keys.add(`condition.${c}`);
  for (const level of Object.values(HEALTH)) keys.add(`health.${level}`);
  for (let n = 1; n <= LIMITS.maxSize; n++) keys.add(`size.${n}`);
  return keys;
}

describe("dictionaries", () => {
  it("have a Spanish message for every key the app uses", () => {
    const missing = [...usedKeys()].filter((key) => !Object.hasOwn(es, key));
    expect(missing).toEqual([]);
  });

  it("do not keep keys the app no longer uses", () => {
    const used = usedKeys();
    expect(Object.keys(es).filter((key) => !used.has(key))).toEqual([]);
  });

  it.each([
    ["en", en],
    ["ca", ca],
  ])(
    "translate every Spanish message into %s, same placeholders",
    (_, dict) => {
      expect(Object.keys(dict).sort()).toEqual(Object.keys(es).sort());
      for (const [key, text] of Object.entries(es)) {
        expect(placeholders(dict[key]), key).toEqual(placeholders(text));
        expect(dict[key].trim(), key).not.toBe("");
      }
    },
  );
});

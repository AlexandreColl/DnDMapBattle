// The DM key: whoever opens the game with it is the DM.
// Running this file prints a new key (launcher.bat uses it to open the DM link).
import { randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";

// No 0/O or 1/I/L, so it can be read aloud or typed from the terminal.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const VALID = /^[A-Za-z0-9-]{6,64}$/;

/** A new random key such as "K7Q2-M9XA" (about 40 bits). */
export function generateDmKey() {
  let key = "";
  for (let i = 0; i < 8; i++) key += ALPHABET[randomInt(ALPHABET.length)];
  return `${key.slice(0, 4)}-${key.slice(4)}`;
}

/**
 * The key from DM_KEY if it is valid, otherwise a new one.
 * @param {string | undefined} fromEnv
 */
export function resolveDmKey(fromEnv) {
  if (fromEnv && VALID.test(fromEnv)) return fromEnv;
  if (fromEnv) console.warn("DM_KEY no es válida; se genera una nueva.");
  return generateDmKey();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(generateDmKey());
}

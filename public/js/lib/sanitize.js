import { CELL, LIMITS } from "../shared/protocol.js";
import { clamp } from "./geometry.js";

const CELL_VALUES = new Set(Object.values(CELL));

/** Only same-document image sources: data:image/… or blob: URLs. */
export function isSafeImageUrl(url) {
  return typeof url === "string" && /^(data:image\/|blob:)/i.test(url);
}

/** CSS `url()` value with the URL quoted and escaped. */
export function cssUrl(url) {
  const escaped = String(url).replace(
    /["\\\n\r]/g,
    (ch) => `\\${ch.charCodeAt(0).toString(16)} `,
  );
  return `url("${escaped}")`;
}

export function isCellState(value) {
  return CELL_VALUES.has(value);
}

/** Integer initiative clamped to the allowed range, or null. */
export function parseInitiative(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return clamp(Math.trunc(n), LIMITS.minInitiative, LIMITS.maxInitiative);
}

export function parseVisionRadius(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return LIMITS.defaultVisionRadius;
  return clamp(n, LIMITS.minVisionRadius, LIMITS.maxVisionRadius);
}

export function cleanName(value, fallback = "Personaje") {
  const name = String(value ?? "")
    .trim()
    .slice(0, LIMITS.maxNameLength);
  return name || fallback;
}

/**
 * Character from untrusted input (save file, import, network), or null when
 * it has no usable image.
 */
export function normalizeCharacter(raw, id = raw?.id) {
  if (!raw || !isSafeImageUrl(raw.imageUrl)) return null;
  if (!Number.isInteger(id) || id < 0) return null;
  return {
    id,
    name: cleanName(raw.name),
    imageUrl: raw.imageUrl,
    visionRadius: parseVisionRadius(raw.visionRadius),
    isEnemy: raw.isEnemy === true,
    initiative: parseInitiative(raw.initiative),
  };
}

export function normalizeToken(raw, rows, cols) {
  if (!raw) return null;
  const { id, characterId, row, col } = raw;
  const ints = [id, characterId, row, col].every(Number.isInteger);
  if (!ints || row < 0 || col < 0 || row >= rows || col >= cols) return null;
  return { id, characterId, row, col };
}

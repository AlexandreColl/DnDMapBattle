// Hit points and conditions, shared by the client and the server.
import { CONDITIONS, HEALTH, LIMITS } from "../shared/protocol.js";
import { clamp } from "./geometry.js";

const CONDITION_SET = new Set(CONDITIONS);
const LEVELS = new Set(Object.values(HEALTH));

function hitPoints(value, min) {
  // Numbers, or text from an input; anything else (even an object that
  // cannot become text) is no value.
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(n)) return null;
  return clamp(Math.trunc(n), min, LIMITS.maxHp);
}

/**
 * Consistent hit points: none without a maximum, full when only the maximum
 * is known, and never above it.
 * @returns {{ hp: number | null, maxHp: number | null }}
 */
export function normalizeHealth(hp, maxHp) {
  const max = hitPoints(maxHp, 1);
  if (max == null) return { hp: null, maxHp: null };
  return { hp: Math.min(hitPoints(hp, 0) ?? max, max), maxHp: max };
}

/** `hp` after `delta` (negative for damage), between 0 and the maximum. */
export function adjustHp(hp, maxHp, delta) {
  if (maxHp == null) return null;
  return clamp((hp ?? maxHp) + delta, 0, maxHp);
}

/** How hurt a character looks, or null when it has no hit points. */
export function healthLevel(hp, maxHp) {
  if (maxHp == null || hp == null) return null;
  if (hp <= 0) return HEALTH.DOWN;
  if (hp * 2 <= maxHp) return HEALTH.BLOODIED;
  return hp < maxHp ? HEALTH.HURT : HEALTH.UNHURT;
}

/** The level of `char`: from its hit points, or as the server sent it. */
export function characterHealth(char) {
  return (
    healthLevel(char.hp, char.maxHp) ??
    (LEVELS.has(char.health) ? char.health : null)
  );
}

/** Known conditions, without repeats, in the order of CONDITIONS. */
export function normalizeConditions(value) {
  if (!Array.isArray(value)) return [];
  const set = new Set(value.filter((c) => CONDITION_SET.has(c)));
  return CONDITIONS.filter((c) => set.has(c));
}

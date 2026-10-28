// Per-connection limit on incoming events, so a single client (a player or a
// tab stuck in a loop) cannot flood the game.
import { EVENTS } from "../public/js/shared/protocol.js";

/**
 * Importing characters sends one event each, so the burst covers a full
 * roster; a person playing sends far fewer than `refillPerSecond`.
 */
export const DEFAULT_RATE_LIMIT = Object.freeze({
  capacity: 1000,
  refillPerSecond: 20,
});

// Events that carry or rebuild the whole board cost more.
/** @type {Set<string>} */
const HEAVY_EVENTS = new Set([
  EVENTS.STATE_FULL,
  EVENTS.MAP_CHANGED,
  EVENTS.GRID_GENERATED,
]);
const HEAVY_COST = 25;

/** @param {string} event */
export function eventCost(event) {
  return HEAVY_EVENTS.has(event) ? HEAVY_COST : 1;
}

/**
 * A token bucket: holds up to `capacity` tokens and gains `refillPerSecond`.
 * `take(cost)` spends them, or returns false if there are not enough.
 * @param {{ capacity: number, refillPerSecond: number }} limit
 * @param {() => number} [now] milliseconds
 */
export function createRateLimiter(
  { capacity, refillPerSecond },
  now = Date.now,
) {
  let tokens = capacity;
  let last = now();
  return {
    /** @param {number} [cost] */
    take(cost = 1) {
      const t = now();
      tokens = Math.min(
        capacity,
        tokens + ((t - last) / 1000) * refillPerSecond,
      );
      last = t;
      if (tokens < cost) return false;
      tokens -= cost;
      return true;
    },
  };
}

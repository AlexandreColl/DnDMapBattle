import { CELL } from "../shared/protocol.js";

/** Fog opacity per cell state, for players. */
export const FOG_ALPHA = Object.freeze({
  [CELL.HIDDEN]: 1,
  [CELL.VISIBLE]: 0,
  [CELL.REVEALED]: 0,
});

/** The DM sees through the fog to place enemies and plan reveals. */
export const DM_HIDDEN_ALPHA = 0.6;

/**
 * Fog opacity for every cell, with a one-cell hidden border around the grid
 * so the blur fades into darkness at the edges. Row-major, size
 * (rows + 2) × (cols + 2).
 * @param {string[][]} cellStates
 * @param {number} rows
 * @param {number} cols
 * @param {number} [hiddenAlpha] opacity of hidden cells
 */
export function fogAlphas(
  cellStates,
  rows,
  cols,
  hiddenAlpha = FOG_ALPHA[CELL.HIDDEN],
) {
  const width = cols + 2;
  const alphas = { ...FOG_ALPHA, [CELL.HIDDEN]: hiddenAlpha };
  const out = new Float32Array((rows + 2) * width).fill(hiddenAlpha);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const alpha = alphas[cellStates[r]?.[c]];
      out[(r + 1) * width + c + 1] = alpha ?? hiddenAlpha;
    }
  }
  return out;
}

/**
 * Moves `current` a fraction of the way towards `target`, in place.
 * Returns true once every value has arrived.
 */
export function stepTowards(current, target, fraction = 0.25) {
  let settled = true;
  for (let i = 0; i < current.length; i++) {
    const delta = target[i] - current[i];
    if (Math.abs(delta) < 0.01) {
      current[i] = target[i];
    } else {
      current[i] += delta * fraction;
      settled = false;
    }
  }
  return settled;
}

// Creature size: a token covers a square of size × size cells, anchored at
// its top-left cell. Shared by the client and the server.
import { LIMITS } from "../shared/protocol.js";
import { clamp } from "./geometry.js";

/** Cells per side of `char`'s token: 1 unless it says otherwise. */
export function characterSize(char) {
  const size = char?.size;
  return Number.isInteger(size) && size >= 1 && size <= LIMITS.maxSize
    ? size
    : 1;
}

/** Whether a token of `size` anchored at row, col lies inside the grid. */
export function fitsGrid(row, col, size, rows, cols) {
  return row >= 0 && col >= 0 && row + size <= rows && col + size <= cols;
}

/**
 * Anchor for a token of `size` dropped on row, col: centered on that cell
 * and moved back inside the grid when it would stick out.
 */
export function anchorFor(row, col, size, rows, cols) {
  const offset = Math.floor((size - 1) / 2);
  return {
    row: clamp(row - offset, 0, Math.max(0, rows - size)),
    col: clamp(col - offset, 0, Math.max(0, cols - size)),
  };
}

/** The cells a token covers. */
export function coveredCells(token, size) {
  const cells = [];
  for (let r = token.row; r < token.row + size; r++) {
    for (let c = token.col; c < token.col + size; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

/**
 * Changes a character's size, moving its token back inside the grid if it
 * no longer fits. Returns false, changing nothing, when the token could not
 * fit anywhere.
 */
export function resizeCharacter(state, charId, size) {
  const char = state.characters.find((c) => c.id === charId);
  if (!char) return true;
  const token = state.tokens.find((t) => t.characterId === charId);
  if (token) {
    if (size > state.gridRows || size > state.gridCols) return false;
    token.row = Math.min(token.row, state.gridRows - size);
    token.col = Math.min(token.col, state.gridCols - size);
  }
  char.size = size;
  return true;
}

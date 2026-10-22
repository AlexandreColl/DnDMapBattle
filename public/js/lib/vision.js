import { CELL } from "../shared/protocol.js";
import { createMatrix, getLineCells } from "./geometry.js";

/**
 * Recomputes fog of war. Manually revealed cells stay revealed; every other
 * cell is hidden unless an allied token can see it (within its vision radius
 * and with no wall in between). Returns a new matrix.
 */
export function computeVision({
  rows,
  cols,
  cellStates,
  wallCells,
  tokens,
  characters,
}) {
  const next = createMatrix(rows, cols, CELL.HIDDEN);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cellStates[r]?.[c] === CELL.REVEALED) next[r][c] = CELL.REVEALED;
    }
  }

  for (const token of tokens) {
    const char = characters.find((c) => c.id === token.characterId);
    if (!char || char.isEnemy) continue;
    const radius = char.visionRadius;
    const rMin = Math.max(0, token.row - radius);
    const rMax = Math.min(rows - 1, token.row + radius);
    const cMin = Math.max(0, token.col - radius);
    const cMax = Math.min(cols - 1, token.col + radius);
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        if (next[r][c] !== CELL.HIDDEN) continue;
        if (Math.hypot(r - token.row, c - token.col) > radius) continue;
        // Walls block the line of sight, except on the end points.
        const line = getLineCells(token.row, token.col, r, c);
        const blocked = line
          .slice(1, -1)
          .some((p) => wallCells[p.row]?.[p.col]);
        if (!blocked) next[r][c] = CELL.VISIBLE;
      }
    }
  }
  return next;
}

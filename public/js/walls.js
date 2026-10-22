// Wall editing. Walls block line of sight in the vision calculation.
import { $, $$, cellElement, fogOverlay, gridOverlay } from "./dom.js";
import { calculateVision } from "./grid.js";
import { EVENTS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";

const toggleButton = $("#toggle-walls");

function emitWalls() {
  emit(EVENTS.WALLS_SET, { wallCells: state.wallCells });
}

function clearWallHighlights() {
  $$(".grid-cell.wall-cell", gridOverlay).forEach((el) =>
    el.classList.remove("wall-cell"),
  );
}

/** Highlights walls while editing them; hides them otherwise. */
export function applyWallCells() {
  clearWallHighlights();
  if (!state.editingWalls) return;
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      if (state.wallCells[r]?.[c])
        cellElement(r, c)?.classList.add("wall-cell");
    }
  }
}

export function setWallEditing(editing) {
  state.editingWalls = editing;
  toggleButton.classList.toggle("active", editing);
  fogOverlay.style.opacity = editing ? "0" : "1";
  $$(".grid-cell", gridOverlay).forEach((el) =>
    el.classList.toggle("wall-edit", editing),
  );
  applyWallCells();
}

export function toggleWall(row, col) {
  state.wallCells[row][col] = !state.wallCells[row][col];
  cellElement(row, col)?.classList.toggle(
    "wall-cell",
    state.wallCells[row][col],
  );
  calculateVision();
  emitWalls();
}

export function initWalls() {
  toggleButton.addEventListener("click", () =>
    setWallEditing(!state.editingWalls),
  );

  $("#clear-walls").addEventListener("click", () => {
    if (!state.gridRows || !confirm("¿Limpiar todas las paredes?")) return;
    state.wallCells = state.wallCells.map((row) => row.map(() => false));
    clearWallHighlights();
    calculateVision();
    emitWalls();
  });
}

// Wall painting. Walls block line of sight in the vision calculation.
import { $, $$, cellElement, cellFromTarget, gridOverlay } from "./dom.js";
import { calculateVision } from "./grid.js";
import { EVENTS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";
import { confirmDialog } from "./ui.js";

// While dragging: the value being painted (true = wall, false = erase).
let painting = null;
let changed = false;

function emitWalls() {
  emit(EVENTS.WALLS_SET, { wallCells: state.wallCells });
}

/** Shows walls while the walls tool is active; hides them otherwise. */
export function applyWallCells() {
  $$(".grid-cell.wall-cell", gridOverlay).forEach((el) =>
    el.classList.remove("wall-cell"),
  );
  if (state.tool !== "walls") return;
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      if (state.wallCells[r]?.[c]) {
        cellElement(r, c)?.classList.add("wall-cell");
      }
    }
  }
}

function paintCell(row, col, el) {
  if (state.wallCells[row]?.[col] === painting) return;
  state.wallCells[row][col] = painting;
  el.classList.toggle("wall-cell", painting);
  changed = true;
}

function finishPainting() {
  if (painting === null) return;
  painting = null;
  if (!changed) return;
  changed = false;
  calculateVision();
  emitWalls();
}

export function initWalls() {
  gridOverlay.addEventListener("pointerdown", (e) => {
    if (state.tool !== "walls" || e.button !== 0) return;
    const cell = cellFromTarget(e.target);
    if (!cell) return;
    e.preventDefault();
    // Shift erases; otherwise the first cell decides (toggle on a click).
    painting = e.shiftKey ? false : !state.wallCells[cell.row][cell.col];
    paintCell(cell.row, cell.col, cell.el);
  });

  gridOverlay.addEventListener("pointerover", (e) => {
    if (painting === null) return;
    const cell = cellFromTarget(e.target);
    if (cell) paintCell(cell.row, cell.col, cell.el);
  });

  document.addEventListener("pointerup", finishPainting);
  document.addEventListener("pointercancel", finishPainting);

  $("#clear-walls").addEventListener("click", async () => {
    if (!state.gridRows) return;
    const ok = await confirmDialog({
      title: "Limpiar paredes",
      message: "Se borrarán todas las paredes del mapa.",
      confirmLabel: "Limpiar",
    });
    if (!ok) return;
    state.wallCells = state.wallCells.map((row) => row.map(() => false));
    applyWallCells();
    calculateVision();
    emitWalls();
  });
}

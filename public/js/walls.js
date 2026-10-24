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
let pointerId = null;
// Walls before the stroke, to undo it if it turns into a pinch.
let before = null;

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

function finishPainting(e) {
  if (painting === null || e.pointerId !== pointerId) return;
  painting = null;
  before = null;
  if (!changed) return;
  changed = false;
  calculateVision();
  emitWalls();
}

/** Undoes the stroke in progress (a second finger started a pinch). */
export function cancelPainting() {
  if (painting === null) return;
  state.wallCells = before;
  painting = null;
  before = null;
  changed = false;
  applyWallCells();
}

export function initWalls() {
  gridOverlay.addEventListener("pointerdown", (e) => {
    if (state.tool !== "walls" || e.button !== 0 || !e.isPrimary) return;
    const cell = cellFromTarget(e.target);
    if (!cell) return;
    e.preventDefault();
    pointerId = e.pointerId;
    before = state.wallCells.map((row) => [...row]);
    // Shift erases; otherwise the first cell decides (toggle on a click).
    painting = e.shiftKey ? false : !state.wallCells[cell.row][cell.col];
    paintCell(cell.row, cell.col, cell.el);
  });

  // Touch pointers stay captured by the first cell, so look up the cell
  // under the pointer instead of relying on pointerover.
  document.addEventListener("pointermove", (e) => {
    if (painting === null || e.pointerId !== pointerId) return;
    const cell = cellFromTarget(
      document.elementFromPoint(e.clientX, e.clientY),
    );
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

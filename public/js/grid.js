// Grid cells, fog of war and grid sizing.
import { $, fogOverlay, gridOverlay, mapWrapper } from "./dom.js";
import { clearMeasurement, handleMeasureClick } from "./measure.js";
import {
  colsForSquareCells,
  computeGridRect,
  createMatrix,
  isSquareGrid,
  rowsForSquareCells,
} from "./lib/geometry.js";
import { computeVision } from "./lib/vision.js";
import { CELL, EVENTS, LIMITS } from "./shared/protocol.js";
import { emit, withoutEmitting } from "./socket.js";
import { state } from "./state.js";
import { handleDrop, renderTokens } from "./tokens.js";
import { toggleWall } from "./walls.js";

const gridRowsInput = $("#grid-rows");
const gridColsInput = $("#grid-cols");

function readGridInput(input, fallback) {
  const n = parseInt(input.value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, LIMITS.maxGridSize);
}

function createCell(r, c) {
  const cell = document.createElement("div");
  cell.className = "grid-cell";
  cell.dataset.row = r;
  cell.dataset.col = c;

  cell.addEventListener("dragover", (e) => {
    e.preventDefault();
    cell.classList.add("drag-over");
  });
  cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));
  cell.addEventListener("drop", (e) => {
    e.preventDefault();
    cell.classList.remove("drag-over");
    handleDrop(r, c, e);
  });
  cell.addEventListener("auxclick", (e) => {
    if (e.button === 1) {
      e.preventDefault();
      toggleReveal(r, c);
    }
  });
  cell.addEventListener("click", (e) => {
    if (state.editingWalls) {
      toggleWall(r, c);
    } else if (e.shiftKey) {
      toggleReveal(r, c);
    } else if (state.measuring) {
      e.stopPropagation();
      handleMeasureClick(r, c);
    }
  });
  return cell;
}

/** Builds an empty rows × cols grid (all fog hidden, no walls). */
export function generateGrid(rows, cols) {
  state.gridRows = rows;
  state.gridCols = cols;
  state.cellStates = createMatrix(rows, cols, CELL.HIDDEN);
  state.wallCells = createMatrix(rows, cols, false);

  gridOverlay.replaceChildren();
  gridOverlay.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridOverlay.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  gridOverlay.classList.add("has-grid");
  const cells = document.createDocumentFragment();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cells.appendChild(createCell(r, c));
  }
  gridOverlay.appendChild(cells);

  generateFog();
  renderTokens();
  calculateVision();
  requestAnimationFrame(() => {
    updateGridLayout();
    updateGridInfo();
  });
}

export function clearGrid() {
  state.gridRows = 0;
  state.gridCols = 0;
  state.cellStates = [];
  state.wallCells = [];
  gridOverlay.replaceChildren();
  gridOverlay.classList.remove("has-grid");
  fogOverlay.replaceChildren();
}

function generateFog() {
  fogOverlay.replaceChildren();
  fogOverlay.style.gridTemplateColumns = `repeat(${state.gridCols}, 1fr)`;
  fogOverlay.style.gridTemplateRows = `repeat(${state.gridRows}, 1fr)`;
  const cells = document.createDocumentFragment();
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      const cell = document.createElement("div");
      cell.className = "fog-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      cells.appendChild(cell);
    }
  }
  fogOverlay.appendChild(cells);
  applyFog();
}

export function applyFog() {
  const cells = fogOverlay.children;
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      const el = cells[r * state.gridCols + c];
      if (el)
        el.className = `fog-cell ${state.cellStates[r]?.[c] ?? CELL.HIDDEN}`;
    }
  }
}

/** Recomputes what allied tokens can see and syncs the fog. */
export function calculateVision() {
  state.cellStates = computeVision({
    rows: state.gridRows,
    cols: state.gridCols,
    cellStates: state.cellStates,
    wallCells: state.wallCells,
    tokens: state.tokens,
    characters: state.characters,
  });
  applyFog();
  emit(EVENTS.FOG_UPDATED, { cellStates: state.cellStates });
}

/** Toggles a manually revealed cell. Synced through FOG_UPDATED. */
export function toggleReveal(row, col) {
  state.cellStates[row][col] =
    state.cellStates[row][col] === CELL.REVEALED ? CELL.HIDDEN : CELL.REVEALED;
  calculateVision();
}

export function updateGridLayout() {
  if (!state.gridRows || !state.gridCols) return;
  const overlays = [gridOverlay, fogOverlay];
  if (!state.imageNaturalWidth || !state.imageNaturalHeight) {
    for (const el of overlays) {
      Object.assign(el.style, {
        left: "0",
        top: "0",
        width: "100%",
        height: "100%",
      });
    }
    return;
  }
  const containerWidth = mapWrapper.clientWidth;
  const containerHeight = mapWrapper.clientHeight;
  if (!containerWidth || !containerHeight) return;
  const rect = computeGridRect({
    containerWidth,
    containerHeight,
    imageWidth: state.imageNaturalWidth,
    imageHeight: state.imageNaturalHeight,
    rows: state.gridRows,
    cols: state.gridCols,
  });
  for (const el of overlays) {
    Object.assign(el.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      right: "auto",
      bottom: "auto",
    });
  }
}

export function updateGridInfo() {
  const info = $("#grid-info");
  if (!state.imageNaturalWidth) {
    info.textContent = "";
    return;
  }
  const rows = state.gridRows || readGridInput(gridRowsInput, 0);
  const cols = state.gridCols || readGridInput(gridColsInput, 0);
  const square = isSquareGrid(
    rows,
    cols,
    state.imageNaturalWidth,
    state.imageNaturalHeight,
  );
  info.textContent = `Imagen ${state.imageNaturalWidth}×${state.imageNaturalHeight} · Celda ${square ? "cuadrada ✓" : "rectangular — pulsa Ajustar"}`;
}

function emitGridGenerated() {
  emit(EVENTS.GRID_GENERATED, {
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    cellStates: state.cellStates,
    wallCells: state.wallCells,
    tokens: state.tokens,
    nextTokenId: state.nextTokenId,
  });
}

function generateAndSync(rows, cols) {
  // GRID_GENERATED already carries the fog; skip the intermediate FOG_UPDATED.
  withoutEmitting(() => generateGrid(rows, cols));
  clearMeasurement();
  emitGridGenerated();
}

/** Sets rows so cells are square for the current columns and map. */
export function autoFitGrid(generate = true) {
  if (!state.imageNaturalWidth || !state.imageNaturalHeight) {
    alert("Carga un mapa primero");
    return;
  }
  const cols = readGridInput(gridColsInput, state.gridCols || 20);
  const rows = Math.min(
    LIMITS.maxGridSize,
    Math.max(
      1,
      rowsForSquareCells(
        cols,
        state.imageNaturalWidth,
        state.imageNaturalHeight,
      ),
    ),
  );
  gridRowsInput.value = rows;
  gridColsInput.value = cols;
  if (generate) generateAndSync(rows, cols);
  updateGridInfo();
}

export function initGrid() {
  gridRowsInput.addEventListener("change", () => {
    if (!state.imageNaturalWidth || !state.imageNaturalHeight) return;
    const rows = readGridInput(gridRowsInput, 1);
    gridColsInput.value = colsForSquareCells(
      rows,
      state.imageNaturalWidth,
      state.imageNaturalHeight,
    );
  });

  gridColsInput.addEventListener("change", () => {
    if (!state.imageNaturalWidth || !state.imageNaturalHeight) return;
    const cols = readGridInput(gridColsInput, 1);
    gridRowsInput.value = rowsForSquareCells(
      cols,
      state.imageNaturalWidth,
      state.imageNaturalHeight,
    );
  });

  $("#grid-generate").addEventListener("click", () => {
    generateAndSync(
      readGridInput(gridRowsInput, 15),
      readGridInput(gridColsInput, 20),
    );
  });

  $("#grid-fit").addEventListener("click", () => autoFitGrid(true));

  window.addEventListener("resize", () => {
    if (gridOverlay.classList.contains("has-grid")) updateGridLayout();
  });
}

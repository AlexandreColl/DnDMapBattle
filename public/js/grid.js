// Grid cells, vision and grid sizing.
import { refreshRosterState } from "./characters.js";
import { $, gridOverlay, mapWrapper } from "./dom.js";
import { applyFog, placeFog } from "./fog.js";
import {
  colsForSquareCells,
  computeGridRect,
  createMatrix,
  isSquareGrid,
  rowsForSquareCells,
} from "./lib/geometry.js";
import { computeVision } from "./lib/vision.js";
import { clearMeasurement, handleMeasureClick } from "./measure.js";
import { CELL, EVENTS, LIMITS } from "./shared/protocol.js";
import { emit, withoutEmitting } from "./socket.js";
import { state } from "./state.js";
import { isDm } from "./roles.js";
import { renderTokens } from "./tokens.js";
import { toast } from "./ui.js";

const gridRowsInput = $("#grid-rows");
const gridColsInput = $("#grid-cols");
const gridInfo = $("#grid-info");
const emptyState = $("#empty-state");

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

  // Revealing fog is for the DM only.
  cell.addEventListener("auxclick", (e) => {
    if (e.button === 1 && isDm()) {
      e.preventDefault();
      toggleReveal(r, c);
    }
  });
  cell.addEventListener("click", (e) => {
    const reveal =
      state.tool === "reveal" || (state.tool === "move" && e.shiftKey);
    if (reveal && isDm()) {
      toggleReveal(r, c);
    } else if (state.tool === "measure") {
      e.stopPropagation();
      handleMeasureClick(r, c);
    }
  });
  return cell;
}

export function updateEmptyState() {
  emptyState.hidden = Boolean(state.gridRows || state.mapImage);
}

/** Builds an empty rows × cols grid (all fog hidden, no walls). */
export function generateGrid(rows, cols) {
  state.gridRows = rows;
  state.gridCols = cols;
  state.cellStates = createMatrix(rows, cols, CELL.HIDDEN);
  state.wallCells = createMatrix(rows, cols, false);
  // A smaller grid leaves no room for tokens past its edges.
  state.tokens = state.tokens.filter((t) => t.row < rows && t.col < cols);

  gridOverlay.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridOverlay.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  gridOverlay.classList.add("has-grid");
  const cells = document.createDocumentFragment();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cells.appendChild(createCell(r, c));
  }
  gridOverlay.replaceChildren(cells);

  updateEmptyState();
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
  applyFog();
  updateEmptyState();
}

/**
 * Recomputes what allied tokens can see and syncs the fog. Players do not
 * have the walls or hidden enemies: their fog always comes from the server.
 */
export function calculateVision() {
  if (!isDm()) {
    applyFog();
    return;
  }
  state.cellStates = computeVision({
    rows: state.gridRows,
    cols: state.gridCols,
    cellStates: state.cellStates,
    wallCells: state.wallCells,
    tokens: state.tokens,
    characters: state.characters,
  });
  applyFog();
  refreshRosterState();
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
  const containerWidth = mapWrapper.clientWidth;
  const containerHeight = mapWrapper.clientHeight;
  if (!containerWidth || !containerHeight) return;
  const rect =
    state.imageNaturalWidth && state.imageNaturalHeight
      ? computeGridRect({
          containerWidth,
          containerHeight,
          imageWidth: state.imageNaturalWidth,
          imageHeight: state.imageNaturalHeight,
          rows: state.gridRows,
          cols: state.gridCols,
        })
      : { left: 0, top: 0, width: containerWidth, height: containerHeight };
  Object.assign(gridOverlay.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    right: "auto",
    bottom: "auto",
  });
  placeFog(rect);
}

export function updateGridInfo() {
  gridInfo.classList.remove("ok");
  if (!state.imageNaturalWidth) {
    gridInfo.textContent = state.mapImage ? "" : "Cualquier imagen";
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
  gridInfo.textContent = `${state.imageNaturalWidth} × ${state.imageNaturalHeight} · ${square ? "celdas cuadradas" : "celdas rectangulares"}`;
  gridInfo.classList.toggle("ok", square);
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
    toast("Carga un mapa primero", { kind: "error" });
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

  new ResizeObserver(() => updateGridLayout()).observe(mapWrapper);
}

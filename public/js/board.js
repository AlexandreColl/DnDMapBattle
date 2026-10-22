// Whole-board operations: reset, and applying a full snapshot.
import { $ } from "./dom.js";
import { clearCharacters, renderCharacters } from "./characters.js";
import {
  applyFog,
  calculateVision,
  clearGrid,
  generateGrid,
  updateGridInfo,
  updateGridLayout,
} from "./grid.js";
import { fitMatrix } from "./lib/geometry.js";
import {
  isCellState,
  normalizeCharacter,
  normalizeToken,
} from "./lib/sanitize.js";
import { setMapImage } from "./map.js";
import { setMeasuring } from "./measure.js";
import { CELL, EVENTS, LIMITS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";
import { renderTokens } from "./tokens.js";
import { renderTurnTracker } from "./turns.js";
import { applyTransform, resetView } from "./view.js";
import { applyWallCells, setWallEditing } from "./walls.js";

function resetTools() {
  setMeasuring(false);
  setWallEditing(false);
  state.currentTurnId = null;
}

export function resetBoard() {
  clearCharacters();
  setMapImage(null);
  clearGrid();
  resetView();
  resetTools();
  renderCharacters();
  renderTurnTracker();
}

/** Copies untrusted fog and wall matrices into the current grid. */
export function loadMatrices(cellStates, wallCells) {
  const { gridRows: rows, gridCols: cols } = state;
  state.cellStates = fitMatrix(
    cellStates,
    rows,
    cols,
    CELL.HIDDEN,
    isCellState,
  );
  state.wallCells = fitMatrix(wallCells, rows, cols, false, (v) => v === true);
}

export function loadTokens(tokens) {
  state.tokens = (Array.isArray(tokens) ? tokens : [])
    .map((t) => normalizeToken(t, state.gridRows, state.gridCols))
    .filter(Boolean);
  state.nextTokenId = Math.max(1, ...state.tokens.map((t) => t.id + 1));
}

/** Replaces the whole board with a snapshot (server state or save file). */
export function applyFullState(data) {
  clearCharacters();
  setMapImage(data.mapImage || null);

  state.characters = (data.characters ?? [])
    .slice(0, LIMITS.maxCharacters)
    .map((c) => normalizeCharacter(c))
    .filter(Boolean);
  state.nextCharId = Math.max(1, ...state.characters.map((c) => c.id + 1));

  state.zoom = Number(data.zoom) || 1;
  state.panX = Number(data.panX) || 0;
  state.panY = Number(data.panY) || 0;

  resetTools();
  if (data.gridRows > 0 && data.gridCols > 0) {
    generateGrid(data.gridRows, data.gridCols);
    loadMatrices(data.cellStates, data.wallCells);
    loadTokens(data.tokens);
    applyFog();
    renderTokens();
    calculateVision();
    applyWallCells();
    requestAnimationFrame(() => {
      updateGridLayout();
      updateGridInfo();
    });
  } else {
    clearGrid();
  }
  applyTransform();

  state.currentTurnId = data.currentTurnId ?? null;
  renderCharacters();
  renderTurnTracker();
}

/** Snapshot sent to the server when this client replaces the board. */
export function snapshotState() {
  return {
    mapImage: state.mapDataURL,
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    cellStates: state.cellStates,
    wallCells: state.wallCells,
    characters: state.characters,
    tokens: state.tokens,
    nextCharId: state.nextCharId,
    nextTokenId: state.nextTokenId,
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    currentTurnId: state.currentTurnId,
  };
}

export function hasBoardData(data) {
  return Boolean(
    data &&
    (data.gridRows > 0 ||
      data.characters?.length > 0 ||
      data.mapImage ||
      data.tokens?.length > 0),
  );
}

export function initBoard() {
  $("#clear-all").addEventListener("click", () => {
    if (!confirm("¿Limpiar todo?")) return;
    resetBoard();
    emit(EVENTS.STATE_CLEARED);
  });
}

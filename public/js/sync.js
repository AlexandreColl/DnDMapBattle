// Applies changes broadcast by other clients. Handlers run through onRemote,
// so nothing they change is sent back to the server.
import {
  applyFullState,
  hasBoardData,
  loadMatrices,
  loadTokens,
  resetBoard,
} from "./board.js";
import { renderCharacters } from "./characters.js";
import { applyFog } from "./fog.js";
import { calculateVision, generateGrid } from "./grid.js";
import { matrixMatches } from "./lib/geometry.js";
import {
  isCellState,
  normalizeCharacter,
  normalizeToken,
} from "./lib/sanitize.js";
import { setMapImage } from "./map.js";
import { showPanel } from "./panels.js";
import { EVENTS } from "./shared/protocol.js";
import { onRemote } from "./socket.js";
import { state } from "./state.js";
import { renderTokens } from "./tokens.js";
import { announceTurn, renderTurnTracker } from "./turns.js";
import { applyTransform } from "./view.js";
import { applyWallCells } from "./walls.js";

let joined = false;

export function initSync() {
  onRemote(EVENTS.STATE_FULL, (data) => {
    if (!hasBoardData(data)) return;
    applyFullState(data);
    // Joining a game already in progress: go straight to the play panel.
    if (!joined && data.gridRows > 0) showPanel("play");
    joined = true;
  });

  onRemote(EVENTS.STATE_CLEARED, resetBoard);

  onRemote(EVENTS.MAP_CHANGED, (data) => setMapImage(data.mapImage));

  onRemote(EVENTS.GRID_GENERATED, (data) => {
    generateGrid(data.gridRows, data.gridCols);
    loadMatrices(data.cellStates, data.wallCells);
    loadTokens(data.tokens);
    state.nextTokenId = Math.max(state.nextTokenId, data.nextTokenId);
    applyFog();
    applyWallCells();
    renderTokens();
    calculateVision();
  });

  onRemote(EVENTS.CHARACTER_ADDED, (data) => {
    const char = normalizeCharacter(data.character);
    if (!char) return;
    state.characters.push(char);
    state.nextCharId = Math.max(state.nextCharId, data.nextCharId, char.id + 1);
    renderCharacters();
  });

  onRemote(EVENTS.CHARACTER_REMOVED, ({ charId }) => {
    state.characters = state.characters.filter((c) => c.id !== charId);
    state.tokens = state.tokens.filter((t) => t.characterId !== charId);
    renderCharacters();
    renderTokens();
    calculateVision();
  });

  onRemote(EVENTS.TOKEN_PLACED, (data) => {
    const existing = state.tokens.find(
      (t) => t.characterId === data.characterId,
    );
    if (existing) {
      existing.row = data.row;
      existing.col = data.col;
    } else {
      const token = normalizeToken(
        {
          ...data.token,
          characterId: data.characterId,
          row: data.row,
          col: data.col,
        },
        state.gridRows,
        state.gridCols,
      );
      if (!token) return;
      state.tokens.push(token);
      state.nextTokenId = Math.max(state.nextTokenId, data.nextTokenId);
    }
    renderTokens();
    calculateVision();
  });

  onRemote(EVENTS.TOKEN_REMOVED, ({ tokenId }) => {
    state.tokens = state.tokens.filter((t) => t.id !== tokenId);
    renderTokens();
    calculateVision();
  });

  onRemote(EVENTS.FOG_UPDATED, ({ cellStates }) => {
    if (!matrixMatches(cellStates, state.gridRows, state.gridCols)) return;
    if (!cellStates.every((row) => row.every(isCellState))) return;
    state.cellStates = cellStates;
    applyFog();
  });

  onRemote(EVENTS.WALLS_SET, ({ wallCells }) => {
    loadMatrices(state.cellStates, wallCells);
    applyWallCells();
    calculateVision();
  });

  onRemote(EVENTS.VIEW_CHANGED, (data) => {
    state.zoom = data.zoom;
    state.panX = data.panX;
    state.panY = data.panY;
    applyTransform();
  });

  onRemote(EVENTS.INITIATIVE_CHANGED, ({ charId, initiative }) => {
    const char = state.characters.find((c) => c.id === charId);
    if (!char) return;
    char.initiative = initiative;
    renderCharacters();
    renderTurnTracker();
  });

  onRemote(EVENTS.TURN_CHANGED, ({ charId }) => {
    state.currentTurnId = charId;
    renderTurnTracker();
    announceTurn();
  });
}

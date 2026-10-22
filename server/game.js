import { EVENTS, LIMITS } from "../public/js/shared/protocol.js";
import { matrixMatches } from "../public/js/lib/geometry.js";
import { schemas } from "./validation.js";

export class RejectedEventError extends Error {}

function reject(message) {
  throw new RejectedEventError(message);
}

export function createGameState() {
  return {
    mapImage: null,
    gridRows: 0,
    gridCols: 0,
    cellStates: [],
    wallCells: [],
    characters: [],
    tokens: [],
    nextCharId: 1,
    nextTokenId: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
    currentTurnId: null,
  };
}

export function resetGameState(state) {
  Object.assign(state, createGameState());
}

function assertGrid(state, m, label) {
  if (!matrixMatches(m, state.gridRows, state.gridCols)) {
    reject(`${label} no coincide con la cuadrícula actual`);
  }
}

function assertInGrid(state, row, col) {
  if (row >= state.gridRows || col >= state.gridCols) {
    reject("posición fuera de la cuadrícula");
  }
}

/**
 * One reducer per client event. Each one validates the raw payload, applies it
 * to `state` and returns the sanitized payload to broadcast to the other
 * clients. Invalid payloads throw (ZodError or RejectedEventError) and leave
 * `state` untouched.
 */
export const reducers = {
  [EVENTS.STATE_FULL](state, raw) {
    const data = schemas.stateFull.parse(raw);
    if (!matrixMatches(data.cellStates, data.gridRows, data.gridCols)) {
      reject("cellStates no coincide con la cuadrícula");
    }
    if (
      data.wallCells.length &&
      !matrixMatches(data.wallCells, data.gridRows, data.gridCols)
    ) {
      reject("wallCells no coincide con la cuadrícula");
    }
    Object.assign(state, data);
    return data;
  },

  [EVENTS.STATE_CLEARED](state) {
    resetGameState(state);
    return undefined;
  },

  [EVENTS.MAP_CHANGED](state, raw) {
    const data = schemas.mapChanged.parse(raw);
    state.mapImage = data.mapImage;
    return data;
  },

  [EVENTS.GRID_GENERATED](state, raw) {
    const data = schemas.gridGenerated.parse(raw);
    if (
      !matrixMatches(data.cellStates, data.gridRows, data.gridCols) ||
      !matrixMatches(data.wallCells, data.gridRows, data.gridCols)
    ) {
      reject("las matrices no coinciden con la cuadrícula");
    }
    Object.assign(state, data);
    return data;
  },

  [EVENTS.CHARACTER_ADDED](state, raw) {
    const data = schemas.characterAdded.parse(raw);
    if (state.characters.length >= LIMITS.maxCharacters) {
      reject("demasiados personajes");
    }
    state.characters.push(data.character);
    state.nextCharId = Math.max(state.nextCharId, data.nextCharId);
    return data;
  },

  [EVENTS.CHARACTER_REMOVED](state, raw) {
    const data = schemas.characterRemoved.parse(raw);
    state.characters = state.characters.filter((c) => c.id !== data.charId);
    state.tokens = state.tokens.filter((t) => t.characterId !== data.charId);
    if (state.currentTurnId === data.charId) state.currentTurnId = null;
    return data;
  },

  [EVENTS.TOKEN_PLACED](state, raw) {
    const data = schemas.tokenPlaced.parse(raw);
    assertInGrid(state, data.row, data.col);
    if (!state.characters.some((c) => c.id === data.characterId)) {
      reject("personaje desconocido");
    }
    const existing = state.tokens.find(
      (t) => t.characterId === data.characterId,
    );
    if (existing) {
      existing.row = data.row;
      existing.col = data.col;
    } else {
      state.tokens.push({
        ...data.token,
        characterId: data.characterId,
        row: data.row,
        col: data.col,
      });
      state.nextTokenId = Math.max(state.nextTokenId, data.nextTokenId);
    }
    return data;
  },

  [EVENTS.TOKEN_REMOVED](state, raw) {
    const data = schemas.tokenRemoved.parse(raw);
    state.tokens = state.tokens.filter((t) => t.id !== data.tokenId);
    return data;
  },

  [EVENTS.FOG_UPDATED](state, raw) {
    const data = schemas.fogUpdated.parse(raw);
    assertGrid(state, data.cellStates, "cellStates");
    state.cellStates = data.cellStates;
    return data;
  },

  [EVENTS.WALLS_SET](state, raw) {
    const data = schemas.wallsSet.parse(raw);
    assertGrid(state, data.wallCells, "wallCells");
    state.wallCells = data.wallCells;
    return data;
  },

  [EVENTS.VIEW_CHANGED](state, raw) {
    const data = schemas.viewChanged.parse(raw);
    state.zoom = data.zoom;
    state.panX = data.panX;
    state.panY = data.panY;
    return data;
  },

  [EVENTS.INITIATIVE_CHANGED](state, raw) {
    const data = schemas.initiativeChanged.parse(raw);
    const char = state.characters.find((c) => c.id === data.charId);
    if (char) char.initiative = data.initiative;
    return data;
  },

  [EVENTS.TURN_CHANGED](state, raw) {
    const data = schemas.turnChanged.parse(raw);
    state.currentTurnId = data.charId;
    return data;
  },
};

// DM and player roles: who may send what, and what each player may see.
import { timingSafeEqual } from "node:crypto";
import { computeVision } from "../public/js/lib/vision.js";
import {
  CELL,
  EVENTS,
  PLAYER_EVENTS,
  ROLES,
} from "../public/js/shared/protocol.js";
import { RejectedEventError } from "./game.js";
import { schemas } from "./validation.js";

/**
 * The role of a connection. Without a DM key (tests, or a server started
 * without roles) everyone is DM.
 * @param {string | null} dmKey
 * @param {unknown} offered key sent by the client in the handshake
 */
export function roleFor(dmKey, offered) {
  if (!dmKey) return ROLES.DM;
  if (typeof offered !== "string") return ROLES.PLAYER;
  const a = Buffer.from(offered);
  const b = Buffer.from(dmKey);
  return a.length === b.length && timingSafeEqual(a, b)
    ? ROLES.DM
    : ROLES.PLAYER;
}

function allyOf(state, charId) {
  const char = state.characters.find((c) => c.id === charId);
  return char && !char.isEnemy ? char : null;
}

/**
 * Throws unless `role` may send `event`. Players may only move allied tokens
 * and change allied initiative.
 */
export function authorize(role, event, state, raw) {
  if (role === ROLES.DM) return;
  if (!PLAYER_EVENTS.includes(event)) {
    throw new RejectedEventError("solo el máster puede hacerlo");
  }
  if (event === EVENTS.TOKEN_PLACED) {
    const data = schemas.tokenPlaced.parse(raw);
    if (!allyOf(state, data.characterId)) {
      throw new RejectedEventError("los jugadores solo mueven aliados");
    }
    const existing = state.tokens.find((t) => t.id === data.token.id);
    if (existing && existing.characterId !== data.characterId) {
      throw new RejectedEventError("la ficha es de otro personaje");
    }
  }
  if (event === EVENTS.INITIATIVE_CHANGED) {
    const data = schemas.initiativeChanged.parse(raw);
    if (!allyOf(state, data.charId)) {
      throw new RejectedEventError("los jugadores solo cambian aliados");
    }
  }
}

/** Recomputes the fog on the server, which is the source of truth. */
export function refreshVision(state) {
  if (!state.gridRows || !state.gridCols) return;
  state.cellStates = computeVision({
    rows: state.gridRows,
    cols: state.gridCols,
    cellStates: state.cellStates,
    wallCells: state.wallCells,
    tokens: state.tokens,
    characters: state.characters,
  });
}

/** Allies are always visible; enemies only on a visible or revealed cell. */
function visibleTokens(state) {
  return state.tokens.filter((token) => {
    const char = state.characters.find((c) => c.id === token.characterId);
    if (!char) return false;
    if (!char.isEnemy) return true;
    const cell = state.cellStates[token.row]?.[token.col];
    return cell != null && cell !== CELL.HIDDEN;
  });
}

/**
 * What a player may see. Enemies off the map or in the fog are left out, and
 * so is enemy initiative. Portraits in `known` (character ids the player
 * already has) are omitted to keep updates small.
 * @param {ReturnType<typeof import("./game.js").createGameState>} state
 * @param {Set<number>} [known]
 */
export function playerView(state, known = new Set()) {
  const tokens = visibleTokens(state);
  const onBoard = new Set(tokens.map((t) => t.characterId));
  const characters = state.characters
    .filter((c) => !c.isEnemy || onBoard.has(c.id))
    .map((c) => {
      const char = c.isEnemy ? { ...c, initiative: null } : { ...c };
      if (known.has(c.id)) delete char.imageUrl;
      return char;
    });
  const turnVisible = characters.some((c) => c.id === state.currentTurnId);
  return {
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    cellStates: state.cellStates,
    characters,
    tokens,
    // Players do not see every token; new ones must not reuse a hidden id.
    nextTokenId: state.nextTokenId,
    currentTurnId: turnVisible ? state.currentTurnId : null,
    // Someone hidden is playing: players see "enemy turn" instead of a name.
    hiddenTurn: state.currentTurnId != null && !turnVisible,
  };
}

/** A full snapshot for a player: the view plus the map, without walls. */
export function playerSnapshot(state) {
  return {
    ...playerView(state),
    mapImage: state.mapImage,
    wallCells: [],
    nextCharId: state.nextCharId,
  };
}

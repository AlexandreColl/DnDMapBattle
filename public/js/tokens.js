// Tokens: characters placed on the grid.
import { refreshRosterState } from "./characters.js";
import { $$, cellElement, gridOverlay } from "./dom.js";
import { redrawFog } from "./fog.js";
import { calculateVision } from "./grid.js";
import { cssUrl } from "./lib/sanitize.js";
import { EVENTS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";
import { closeTokenMenu, openTokenMenu } from "./token-menu.js";
import { renderTurnTracker } from "./turns.js";

function createTokenElement(token, char) {
  const el = document.createElement("div");
  el.className = "token";
  el.classList.toggle("enemy", char.isEnemy);
  el.classList.toggle("selected", state.selectedTokenId === token.id);
  el.dataset.tokenId = token.id;
  el.dataset.charId = char.id;
  el.style.backgroundImage = cssUrl(char.imageUrl);
  el.draggable = true;
  el.title = char.name;

  el.addEventListener("click", (e) => {
    if (state.tool !== "move") return;
    e.stopPropagation();
    openTokenMenu(token.id);
  });
  el.addEventListener("auxclick", (e) => {
    if (e.button === 1) {
      e.stopPropagation();
      removeToken(token.id);
    }
  });
  el.addEventListener("mouseenter", () => {
    state.hoveredTokenId = token.id;
  });
  el.addEventListener("mouseleave", () => {
    if (state.hoveredTokenId === token.id) state.hoveredTokenId = null;
  });
  el.addEventListener("dragstart", (e) => {
    closeTokenMenu();
    e.dataTransfer.setData("text/plain", `token:${token.id}`);
    el.classList.add("dragging");
    e.stopPropagation();
  });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));
  return el;
}

export function tokenElement(tokenId) {
  return gridOverlay.querySelector(`.token[data-token-id="${tokenId}"]`);
}

export function renderTokens() {
  $$(".token", gridOverlay).forEach((el) => el.remove());
  for (const token of state.tokens) {
    const char = state.characters.find((c) => c.id === token.characterId);
    const cell = char && cellElement(token.row, token.col);
    if (cell) cell.appendChild(createTokenElement(token, char));
  }
  if (!state.tokens.some((t) => t.id === state.selectedTokenId)) {
    closeTokenMenu();
  }
  refreshRosterState();
  renderTurnTracker();
  redrawFog();
}

function syncPlacedToken(token) {
  renderTokens();
  calculateVision();
  emit(EVENTS.TOKEN_PLACED, {
    characterId: token.characterId,
    row: token.row,
    col: token.col,
    token,
    nextTokenId: state.nextTokenId,
  });
}

/** Drop from the roster (place/move) or from another cell (move). */
export function handleDrop(row, col, e) {
  const [kind, rawId] = e.dataTransfer.getData("text/plain").split(":");
  const id = parseInt(rawId, 10);
  if (!Number.isInteger(id)) return;

  let token;
  if (kind === "char") {
    if (!state.characters.some((c) => c.id === id)) return;
    token = state.tokens.find((t) => t.characterId === id);
    if (!token) {
      token = { id: state.nextTokenId++, characterId: id, row, col };
      state.tokens.push(token);
    }
  } else if (kind === "token") {
    token = state.tokens.find((t) => t.id === id);
  }
  if (!token) return;

  token.row = row;
  token.col = col;
  syncPlacedToken(token);
}

export function removeToken(tokenId) {
  state.tokens = state.tokens.filter((t) => t.id !== tokenId);
  if (state.hoveredTokenId === tokenId) state.hoveredTokenId = null;
  renderTokens();
  calculateVision();
  emit(EVENTS.TOKEN_REMOVED, { tokenId });
}

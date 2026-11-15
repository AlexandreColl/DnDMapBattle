// Tokens: characters placed on the grid.
import { refreshRosterState } from "./characters.js";
import { $$, cellElement, gridOverlay } from "./dom.js";
import { makeDraggable } from "./drag.js";
import { redrawFog } from "./fog.js";
import { calculateVision } from "./grid.js";
import { CONDITION_INFO, HEALTH_LABELS } from "./health.js";
import { characterHealth } from "./lib/health.js";
import { canControl, isDm } from "./roles.js";
import { cssUrl } from "./lib/sanitize.js";
import { EVENTS, HEALTH } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";
import {
  closeTokenMenu,
  openTokenMenu,
  refreshTokenMenu,
} from "./token-menu.js";
import { renderTurnTracker } from "./turns.js";

// Badges drawn on a token; the rest are counted in a "+N".
const MAX_BADGES = 3;

/** Hit point bar under the token: exact for the DM and allies. */
function healthBar(char) {
  const level = characterHealth(char);
  if (!level) return null;
  const bar = document.createElement("span");
  bar.className = `token-hp ${level}`;
  const fill = document.createElement("span");
  // Players see an enemy's level, not its hit points: a fixed width each.
  const ratio =
    char.maxHp != null
      ? char.hp / char.maxHp
      : {
          [HEALTH.UNHURT]: 1,
          [HEALTH.HURT]: 0.75,
          [HEALTH.BLOODIED]: 0.35,
          [HEALTH.DOWN]: 0,
        }[level];
  fill.style.width = `${Math.round(ratio * 100)}%`;
  bar.append(fill);
  return bar;
}

function conditionBadges(char) {
  const conditions = char.conditions ?? [];
  if (conditions.length === 0) return null;
  const badges = document.createElement("span");
  badges.className = "token-conditions";
  const shown = conditions.length > MAX_BADGES ? MAX_BADGES - 1 : MAX_BADGES;
  for (const condition of conditions.slice(0, shown)) {
    const badge = document.createElement("span");
    badge.textContent = CONDITION_INFO[condition].icon;
    badges.append(badge);
  }
  if (conditions.length > shown) {
    const more = document.createElement("span");
    more.textContent = `+${conditions.length - shown}`;
    badges.append(more);
  }
  return badges;
}

/** Name, health and conditions, for the tooltip. */
function tokenTitle(char) {
  const level = characterHealth(char);
  const health =
    char.maxHp != null
      ? `${char.hp}/${char.maxHp} PG`
      : level && HEALTH_LABELS[level];
  const conditions = (char.conditions ?? []).map(
    (c) => CONDITION_INFO[c].label,
  );
  return [char.name, health, ...conditions].filter(Boolean).join(" · ");
}

function createTokenElement(token, char) {
  const el = document.createElement("div");
  el.className = "token";
  el.classList.toggle("enemy", char.isEnemy);
  el.classList.toggle("selected", state.selectedTokenId === token.id);
  el.dataset.tokenId = token.id;
  el.dataset.charId = char.id;
  el.style.backgroundImage = cssUrl(char.imageUrl);
  el.classList.toggle("down", characterHealth(char) === HEALTH.DOWN);
  el.title = tokenTitle(char);
  el.append(...[healthBar(char), conditionBadges(char)].filter((part) => part));

  el.addEventListener("click", (e) => {
    if (state.tool !== "move") return;
    e.stopPropagation();
    openTokenMenu(token.id);
  });
  el.addEventListener("auxclick", (e) => {
    if (e.button === 1 && isDm()) {
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
  // With the walls tool, dragging over a token paints its cell instead.
  // Players can only drag their allies.
  makeDraggable(el, {
    kind: "token",
    id: token.id,
    image: el.style.backgroundImage,
    enabled: () => state.tool !== "walls" && canControl(char),
  });
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
  } else {
    refreshTokenMenu();
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
export function placeOnCell(row, col, kind, id) {
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

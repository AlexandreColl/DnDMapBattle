// Popover shown when clicking a token: initiative, vision, remove.
import { $, mapContainer } from "./dom.js";
import { state } from "./state.js";
import { removeToken, tokenElement } from "./tokens.js";
import { paintAvatar, setInitiative } from "./turns.js";

const menu = $("#token-menu");
const avatar = $("#token-menu-avatar");
const nameEl = $("#token-menu-name");
const initiativeInput = $("#token-menu-initiative");
const visionEl = $("#token-menu-vision");

function selectedCharacter() {
  const token = state.tokens.find((t) => t.id === state.selectedTokenId);
  return token && state.characters.find((c) => c.id === token.characterId);
}

function position(tokenEl) {
  const area = mapContainer.getBoundingClientRect();
  const rect = tokenEl.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  // Prefer the right of the token; flip left or clamp near the edges.
  let left = rect.right + 10 - area.left;
  if (left + width > area.width - 8) left = rect.left - width - 10 - area.left;
  let top = rect.top + rect.height / 2 - height / 2 - area.top;
  left = Math.max(8, Math.min(left, area.width - width - 8));
  top = Math.max(8, Math.min(top, area.height - height - 8));
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

export function openTokenMenu(tokenId) {
  const tokenEl = tokenElement(tokenId);
  if (!tokenEl) return;
  closeTokenMenu();
  state.selectedTokenId = tokenId;
  const char = selectedCharacter();
  if (!char) return;

  tokenEl.classList.add("selected");
  paintAvatar(avatar, char);
  nameEl.textContent = char.name;
  initiativeInput.value = char.initiative ?? "";
  visionEl.textContent = char.isEnemy
    ? "Enemigo"
    : `${char.visionRadius} casillas`;
  menu.hidden = false;
  position(tokenEl);
}

export function closeTokenMenu() {
  if (state.selectedTokenId == null) return;
  tokenElement(state.selectedTokenId)?.classList.remove("selected");
  state.selectedTokenId = null;
  menu.hidden = true;
}

export function initTokenMenu() {
  initiativeInput.addEventListener("change", () => {
    const char = selectedCharacter();
    if (char) setInitiative(char, initiativeInput.value.trim());
  });
  $("#token-menu-remove").addEventListener("click", () => {
    const tokenId = state.selectedTokenId;
    closeTokenMenu();
    if (tokenId != null) removeToken(tokenId);
  });
  $("#token-menu-close").addEventListener("click", closeTokenMenu);

  // Clicking anywhere else on the map closes the menu.
  mapContainer.addEventListener("pointerdown", (e) => {
    if (
      !menu.hidden &&
      !menu.contains(e.target) &&
      !e.target.closest(".token")
    ) {
      closeTokenMenu();
    }
  });
}

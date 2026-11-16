// Popover shown when clicking a token: initiative, vision, hit points,
// conditions, remove.
import { setSize, sizeOptions } from "./characters.js";
import { $, mapContainer } from "./dom.js";
import {
  CONDITION_ICONS,
  conditionLabel,
  healthLabel,
  changeHp,
  setHealth,
  toggleCondition,
} from "./health.js";
import { t } from "./i18n.js";
import { characterHealth } from "./lib/health.js";
import { characterSize } from "./lib/size.js";
import { CONDITIONS } from "./shared/protocol.js";
import { canControl } from "./roles.js";
import { state } from "./state.js";
import { removeToken, tokenElement } from "./tokens.js";
import { paintAvatar, setInitiative } from "./turns.js";

const menu = $("#token-menu");
const avatar = $("#token-menu-avatar");
const nameEl = $("#token-menu-name");
const initiativeInput = $("#token-menu-initiative");
const visionEl = $("#token-menu-vision");
const initiativeField = $("#token-menu-initiative-field");
const hpEdit = $("#token-menu-hp-edit");
const hpInput = $("#token-menu-hp");
const maxHpInput = $("#token-menu-max-hp");
const healthEl = $("#token-menu-health");
const hpAdjust = $("#token-menu-hp-adjust");
const amountInput = $("#token-menu-amount");
const conditionsEl = $("#token-menu-conditions");
const sizeSelect = $("#token-menu-size");
const sizeText = $("#token-menu-size-text");

/** Sets an input unless the user is typing in it. */
function fillInput(input, value) {
  if (document.activeElement !== input) input.value = value ?? "";
}

function conditionChip(char, condition, editable) {
  const label = conditionLabel(condition);
  const icon = CONDITION_ICONS[condition];
  const chip = document.createElement(editable ? "button" : "span");
  chip.className = "condition";
  chip.textContent = icon;
  chip.title = label;
  chip.setAttribute("aria-label", label);
  if (editable) {
    /** @type {HTMLButtonElement} */ (chip).type = "button";
    const active = (char.conditions ?? []).includes(condition);
    chip.setAttribute("aria-pressed", String(active));
    chip.addEventListener("click", () => toggleCondition(char, condition));
  }
  return chip;
}

/** Hit points and conditions: editable for the DM and allies. */
function fillHealth(char) {
  const editable = canControl(char);
  hpEdit.hidden = !editable;
  hpAdjust.hidden = !editable || char.maxHp == null;
  healthEl.hidden = editable;
  fillInput(hpInput, char.hp);
  fillInput(maxHpInput, char.maxHp);
  healthEl.textContent = healthLabel(characterHealth(char)) ?? "—";

  // Others' conditions are only listed; with none, a dash.
  const shown = editable ? CONDITIONS : (char.conditions ?? []);
  conditionsEl.replaceChildren(
    ...shown.map((c) => conditionChip(char, c, editable)),
  );
  if (shown.length === 0) conditionsEl.textContent = "—";
}

function fillSize(char) {
  const size = characterSize(char);
  sizeSelect.value = String(size);
  sizeText.textContent = t(`size.${size}`);
}

/** Brings the open menu up to date after a change, here or remote. */
export function refreshTokenMenu() {
  const char = !menu.hidden && selectedCharacter();
  if (char) {
    fillHealth(char);
    fillSize(char);
  }
}

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
  // Players do not see or change enemy initiative.
  initiativeField.hidden = !canControl(char);
  visionEl.textContent = char.isEnemy
    ? t("menu.enemy")
    : t("menu.visionCells", { count: char.visionRadius });
  amountInput.value = "";
  fillHealth(char);
  fillSize(char);
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
  sizeSelect.replaceChildren(...sizeOptions());
  sizeSelect.addEventListener("change", () => {
    const char = selectedCharacter();
    if (char) setSize(char, Number(sizeSelect.value));
    // Shows the stored size: a refused change keeps the old one.
    if (char) fillSize(char);
  });
  initiativeInput.addEventListener("change", () => {
    const char = selectedCharacter();
    if (char) setInitiative(char, initiativeInput.value.trim());
  });
  // Shows the stored values: what was typed may have been capped.
  function commitHealth(char, hp, maxHp) {
    setHealth(char, hp, maxHp);
    hpInput.value = char.hp ?? "";
    maxHpInput.value = char.maxHp ?? "";
  }
  hpInput.addEventListener("change", () => {
    const char = selectedCharacter();
    if (char) commitHealth(char, hpInput.value, maxHpInput.value);
  });
  maxHpInput.addEventListener("change", () => {
    const char = selectedCharacter();
    // A new maximum starts at full health; a lower one caps the current.
    if (char) commitHealth(char, char.hp ?? maxHpInput.value, maxHpInput.value);
  });
  /** Damage (sign -1) or healing (sign 1) by the amount typed. */
  function bindHpButton(id, sign) {
    $(id).addEventListener("click", () => {
      const char = selectedCharacter();
      const amount = parseInt(amountInput.value, 10);
      if (!char || !(amount > 0)) return;
      changeHp(char, sign * amount);
      amountInput.value = "";
    });
  }
  bindHpButton("#token-menu-damage", -1);
  bindHpButton("#token-menu-heal", 1);
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

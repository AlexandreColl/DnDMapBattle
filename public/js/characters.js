// Roster in the sidebar: allies and enemies, with inline initiative.
import { $, $$, revokeIfBlob } from "./dom.js";
import { makeDraggable } from "./drag.js";
import { calculateVision } from "./grid.js";
import { canControl, isDm } from "./roles.js";
import { CELL, EVENTS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";
import { renderTokens } from "./tokens.js";
import { paintAvatar, setInitiative } from "./turns.js";
import { confirmDialog, icon } from "./ui.js";

const allies = $("#roster-allies");
const enemies = $("#roster-enemies");
const enemiesTitle = $("#enemies-title");

function createCharacterItem(char) {
  const item = document.createElement("div");
  item.className = "char-item";
  item.dataset.charId = char.id;
  const controllable = canControl(char);
  item.classList.toggle("locked", !controllable);
  if (controllable) item.title = "Arrastra al mapa para colocar";

  const avatar = document.createElement("span");
  avatar.className = "avatar";
  paintAvatar(avatar, char);

  const name = document.createElement("span");
  name.className = "char-name";
  name.textContent = char.name;

  const initiative = document.createElement("input");
  initiative.type = "number";
  initiative.className = "char-initiative";
  initiative.placeholder = "—";
  initiative.title = "Iniciativa";
  initiative.value = char.initiative ?? "";
  initiative.addEventListener("change", () =>
    setInitiative(char, initiative.value.trim()),
  );

  const removeBtn = document.createElement("button");
  removeBtn.className = "icon-btn ghost remove-char";
  removeBtn.title = "Eliminar ficha";
  removeBtn.append(icon("x"));
  removeBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const ok = await confirmDialog({
      title: `Eliminar a ${char.name}`,
      message: "La ficha desaparecerá de la lista y del mapa.",
      confirmLabel: "Eliminar",
    });
    if (ok) removeCharacter(char.id);
  });

  // Players do not see enemy initiative, and cannot remove anyone.
  if (!controllable) initiative.hidden = true;
  if (!isDm()) removeBtn.hidden = true;

  const hiddenMark = icon("eye-off");
  hiddenMark.classList.add("hidden-mark");
  hiddenMark.setAttribute("aria-hidden", "false");
  hiddenMark.setAttribute("role", "img");
  hiddenMark.setAttribute("aria-label", "Oculto para los jugadores");

  item.append(avatar, name, hiddenMark, initiative, removeBtn);

  if (controllable) {
    makeDraggable(item, {
      kind: "char",
      id: char.id,
      image: avatar.style.backgroundImage,
      longPressOnTouch: true,
    });
  }
  return item;
}

export function renderCharacters() {
  // Players only get the enemies they can see.
  enemiesTitle.textContent = isDm() ? "Enemigos" : "A la vista";
  const items = state.characters.map((char) => [
    char,
    createCharacterItem(char),
  ]);
  allies.replaceChildren(
    ...items.filter(([c]) => !c.isEnemy).map(([, el]) => el),
  );
  enemies.replaceChildren(
    ...items.filter(([c]) => c.isEnemy).map(([, el]) => el),
  );
  refreshRosterState();
}

/** Whether players can see this enemy: on the map, outside the fog. */
function visibleToPlayers(char) {
  if (!char?.isEnemy) return true;
  const token = state.tokens.find((t) => t.characterId === char.id);
  const cell = token && state.cellStates[token.row]?.[token.col];
  return Boolean(cell) && cell !== CELL.HIDDEN;
}

/**
 * Dims characters that are not on the map and, for the DM, marks the
 * enemies the players cannot see.
 */
export function refreshRosterState() {
  const onBoard = new Set(state.tokens.map((t) => t.characterId));
  $$(".char-item").forEach((el) => {
    const id = Number(el.dataset.charId);
    const char = state.characters.find((c) => c.id === id);
    el.classList.toggle("off-board", !onBoard.has(id));
    el.querySelector(".hidden-mark").style.display =
      isDm() && !visibleToPlayers(char) ? "" : "none";
  });
}

export function addCharacter(char) {
  state.characters.push(char);
  state.nextCharId = Math.max(state.nextCharId, char.id + 1);
  renderCharacters();
  emit(EVENTS.CHARACTER_ADDED, {
    character: char,
    nextCharId: state.nextCharId,
  });
}

export function clearCharacters() {
  state.characters.forEach((c) => revokeIfBlob(c.imageUrl));
  state.characters = [];
  state.tokens = [];
}

export function removeCharacter(charId) {
  state.characters = state.characters.filter((c) => c.id !== charId);
  state.tokens = state.tokens.filter((t) => t.characterId !== charId);
  renderCharacters();
  renderTokens();
  calculateVision();
  emit(EVENTS.CHARACTER_REMOVED, { charId });
}

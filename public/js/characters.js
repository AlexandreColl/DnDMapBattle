// Roster in the sidebar: allies and enemies, with inline initiative.
import { $, $$, revokeIfBlob } from "./dom.js";
import { calculateVision } from "./grid.js";
import { EVENTS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";
import { renderTokens } from "./tokens.js";
import { paintAvatar, setInitiative } from "./turns.js";
import { confirmDialog, icon } from "./ui.js";

const allies = $("#roster-allies");
const enemies = $("#roster-enemies");

function createCharacterItem(char) {
  const item = document.createElement("div");
  item.className = "char-item";
  item.draggable = true;
  item.dataset.charId = char.id;
  item.title = "Arrastra al mapa para colocar";

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
  // Typing in the field must not start a drag of the whole row.
  initiative.addEventListener("pointerdown", (e) => e.stopPropagation());

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

  item.append(avatar, name, initiative, removeBtn);

  item.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", `char:${char.id}`);
    item.classList.add("dragging");
  });
  item.addEventListener("dragend", () => item.classList.remove("dragging"));
  return item;
}

export function renderCharacters() {
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

/** Dims characters that are not on the map. */
export function refreshRosterState() {
  const onBoard = new Set(state.tokens.map((t) => t.characterId));
  $$(".char-item").forEach((el) =>
    el.classList.toggle("off-board", !onBoard.has(Number(el.dataset.charId))),
  );
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

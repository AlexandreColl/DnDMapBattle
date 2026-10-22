// Character list in the sidebar.
import { charList, revokeIfBlob } from "./dom.js";
import { calculateVision } from "./grid.js";
import { EVENTS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";
import { renderTokens } from "./tokens.js";
import { editInitiative } from "./turns.js";

function createCharacterItem(char) {
  const item = document.createElement("div");
  item.className = "char-item";
  item.draggable = true;
  item.dataset.charId = char.id;

  const img = document.createElement("img");
  img.src = char.imageUrl;
  img.alt = char.name;

  const name = document.createElement("span");
  name.textContent = `${char.isEnemy ? "[E]" : "[A]"} ${char.name}`;

  const initiative = document.createElement("span");
  initiative.className = "char-initiative";
  initiative.textContent = char.initiative ?? "—";
  initiative.classList.toggle("none", char.initiative == null);
  initiative.title = "Click para editar iniciativa";
  initiative.addEventListener("click", (e) => {
    e.stopPropagation();
    editInitiative(char);
  });

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-char";
  removeBtn.textContent = "×";
  removeBtn.title = "Eliminar personaje";
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeCharacter(char.id);
  });

  item.append(img, name, initiative, removeBtn);

  item.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", `char:${char.id}`);
    item.classList.add("dragging");
  });
  item.addEventListener("dragend", () => item.classList.remove("dragging"));
  return item;
}

export function renderCharacters() {
  charList.replaceChildren(...state.characters.map(createCharacterItem));
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

// Initiative order and turn tracking.
import { $ } from "./dom.js";
import { renderCharacters } from "./characters.js";
import {
  getInitiativeEntries,
  nextTurn,
  resolveCurrentTurn,
} from "./lib/initiative.js";
import { cssUrl, parseInitiative } from "./lib/sanitize.js";
import { EVENTS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";

const turnDisplay = $("#turn-display");
const initiativeBar = $("#initiative-bar");

function entries() {
  return getInitiativeEntries(state.tokens, state.characters);
}

export function editInitiative(char) {
  const input = prompt(`Iniciativa para ${char.name}:`, char.initiative ?? "");
  if (input === null) return;
  char.initiative = parseInitiative(input.trim());
  renderCharacters();
  renderTurnTracker();
  emit(EVENTS.INITIATIVE_CHANGED, {
    charId: char.id,
    initiative: char.initiative,
  });
}

function renderInitiativeBar(list) {
  initiativeBar.replaceChildren();
  for (const { char } of list) {
    const item = document.createElement("div");
    item.className = "initiative-item";
    item.classList.toggle("current-turn", state.currentTurnId === char.id);
    item.title = `${char.name} (Init: ${char.initiative})`;

    const img = document.createElement("div");
    img.className = "initiative-image";
    img.style.backgroundImage = cssUrl(char.imageUrl);

    const value = document.createElement("span");
    value.className = "initiative-value";
    value.textContent = char.initiative;
    value.addEventListener("click", (e) => {
      e.stopPropagation();
      editInitiative(char);
    });

    item.append(img, value);
    initiativeBar.appendChild(item);
  }
}

/** Refreshes the current-turn label and the initiative bar. */
export function renderTurnTracker() {
  const list = entries();
  state.currentTurnId = resolveCurrentTurn(list, state.currentTurnId);
  const current = list.find((e) => e.char.id === state.currentTurnId)?.char;

  if (current) {
    // Character names come from other players: never inject them as HTML.
    const name = document.createElement("span");
    name.className = "turn-name";
    name.textContent = current.name;
    turnDisplay.replaceChildren(name, ` — Init ${current.initiative}`);
  } else {
    turnDisplay.textContent = "—";
  }
  renderInitiativeBar(list);
}

function changeTurn(charId) {
  state.currentTurnId = charId;
  renderTurnTracker();
  emit(EVENTS.TURN_CHANGED, { charId: state.currentTurnId });
}

export function initTurns() {
  $("#turn-start").addEventListener("click", () => {
    const list = entries();
    if (list.length === 0) {
      alert("No hay personajes con iniciativa en el tablero.");
      return;
    }
    changeTurn(list[0].char.id);
  });

  $("#turn-next").addEventListener("click", () => {
    const list = entries();
    if (list.length > 0) changeTurn(nextTurn(list, state.currentTurnId));
  });
}

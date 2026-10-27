// Initiative order and turn tracking.
import { $, $$ } from "./dom.js";
import { renderCharacters } from "./characters.js";
import {
  getInitiativeEntries,
  nextTurn,
  resolveCurrentTurn,
} from "./lib/initiative.js";
import { cssUrl, parseInitiative } from "./lib/sanitize.js";
import { isDm } from "./roles.js";
import { EVENTS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";
import { openTokenMenu } from "./token-menu.js";
import { toast } from "./ui.js";

const turnDisplay = $("#turn-display");
const turnSub = $("#turn-sub");
const turnAvatar = $("#turn-avatar");
const initiativeBar = $("#initiative-bar");

function entries() {
  return getInitiativeEntries(state.tokens, state.characters);
}

/** Paints a character portrait into an `.avatar` element. */
export function paintAvatar(el, char) {
  el.style.backgroundImage = char ? cssUrl(char.imageUrl) : "";
  el.classList.toggle("enemy", Boolean(char?.isEnemy));
  el.classList.toggle(
    "current",
    Boolean(char) && char.id === state.currentTurnId,
  );
}

export function setInitiative(char, value) {
  char.initiative = parseInitiative(value);
  renderCharacters();
  renderTurnTracker();
  emit(EVENTS.INITIATIVE_CHANGED, {
    charId: char.id,
    initiative: char.initiative,
  });
}

function renderInitiativeBar(list) {
  initiativeBar.replaceChildren(
    ...list.map(({ char, token }) => {
      const item = document.createElement("button");
      item.className = "initiative-item";
      item.classList.toggle("current-turn", state.currentTurnId === char.id);
      item.title = `${char.name} (iniciativa ${char.initiative})`;
      item.addEventListener("click", () => openTokenMenu(token.id));

      const avatar = document.createElement("span");
      avatar.className = "avatar";
      paintAvatar(avatar, char);

      const value = document.createElement("span");
      value.className = "initiative-value";
      value.textContent = char.initiative;

      item.append(avatar, value);
      return item;
    }),
  );
}

/** Marks the active character on the map and in the roster. */
function highlightCurrent() {
  $$("[data-char-id]").forEach((el) =>
    el.classList.toggle(
      "current",
      Number(el.dataset.charId) === state.currentTurnId,
    ),
  );
}

/** Refreshes the current-turn card, the initiative bar and highlights. */
export function renderTurnTracker() {
  const list = entries();
  // Players show exactly the turn the server sent: their list may lack
  // hidden enemies, so resolving it locally could point at someone else.
  if (isDm()) {
    state.currentTurnId = resolveCurrentTurn(list, state.currentTurnId);
  }
  // Players do not get enemy initiative, so they look the character up by id.
  const current = isDm()
    ? list.find((e) => e.char.id === state.currentTurnId)?.char
    : state.characters.find((c) => c.id === state.currentTurnId);

  // Character names come from other players: always set as text.
  if (state.hiddenTurn && !current) {
    turnDisplay.textContent = "Turno enemigo";
    turnSub.textContent = "Fuera de vuestra vista";
  } else {
    turnDisplay.textContent = current ? current.name : "—";
    turnSub.textContent = current
      ? current.initiative != null
        ? `Iniciativa ${current.initiative}`
        : "Turno enemigo"
      : isDm()
        ? "Coloca fichas con iniciativa"
        : "El máster aún no ha empezado";
  }
  paintAvatar(turnAvatar, current);
  renderInitiativeBar(list);
  highlightCurrent();
}

export function announceTurn() {
  const char = state.characters.find((c) => c.id === state.currentTurnId);
  const text = char
    ? `Turno de ${char.name}`
    : state.hiddenTurn && "Turno enemigo";
  if (text) toast(text, { kind: "turn", duration: 2500 });
}

function changeTurn(charId) {
  state.currentTurnId = charId;
  renderTurnTracker();
  announceTurn();
  emit(EVENTS.TURN_CHANGED, { charId: state.currentTurnId });
}

export function advanceTurn() {
  const list = entries();
  if (list.length === 0) {
    toast("No hay personajes con iniciativa en el mapa", { kind: "error" });
    return;
  }
  changeTurn(nextTurn(list, state.currentTurnId));
}

export function initTurns() {
  $("#turn-start").addEventListener("click", () => {
    const list = entries();
    if (list.length === 0) {
      toast("No hay personajes con iniciativa en el mapa", { kind: "error" });
      return;
    }
    changeTurn(list[0].char.id);
  });
  $("#turn-next").addEventListener("click", advanceTurn);
}

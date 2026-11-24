import { initBoard } from "./board.js";
import { $ } from "./dom.js";
import { initDrag } from "./drag.js";
import { initEditor } from "./editor.js";
import { initGrid } from "./grid.js";
import { LANGUAGES, language, setLanguage, translatePage } from "./i18n.js";
import { initMap } from "./map.js";
import { initPanels } from "./panels.js";
import { initPersistence } from "./persistence.js";
import { isDm } from "./roles.js";
import { state } from "./state.js";
import { initSync } from "./sync.js";
import { closeTokenMenu, initTokenMenu } from "./token-menu.js";
import { removeToken } from "./tokens.js";
import { SHORTCUTS, initTools, setTool } from "./tools.js";
import { advanceTurn, initTurns } from "./turns.js";
import { initView } from "./view.js";
import { initWalls } from "./walls.js";

/** Translates the page and fills the language selector. */
function initLanguage() {
  translatePage();
  const select = $("#language-select");
  select.replaceChildren(
    ...Object.entries(LANGUAGES).map(([code, name]) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = name;
      option.lang = code;
      return option;
    }),
  );
  select.value = language;
  select.addEventListener("change", () => setLanguage(select.value));
}

function isTyping(target) {
  return target.closest?.("input, textarea, select, [contenteditable]");
}

function initKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if ($("dialog[open]")) return;
    if (e.key === "Escape") {
      closeTokenMenu();
      setTool("move");
      return;
    }
    if (isTyping(e.target)) return;

    const key = e.key.toLowerCase();
    if (SHORTCUTS[key]) {
      setTool(SHORTCUTS[key]);
    } else if (key === "n" && isDm()) {
      advanceTurn();
    } else if (key === "d" && isDm() && state.hoveredTokenId != null) {
      // D deletes the token under the mouse.
      removeToken(state.hoveredTokenId);
    }
  });
}

function preventBrowserDefaults() {
  // Dropping a file outside a cell must not navigate away from the game.
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());
  // Middle click is used to reveal fog / remove tokens, not to autoscroll.
  document.addEventListener("auxclick", (e) => {
    if (e.button === 1) e.preventDefault();
  });
}

initLanguage();
initPanels();
initView();
initDrag();
initMap();
initGrid();
initWalls();
initTools();
initTurns();
initTokenMenu();
initEditor();
initPersistence();
initBoard();
initKeyboard();
preventBrowserDefaults();
initSync();

import { initBoard } from "./board.js";
import { $ } from "./dom.js";
import { initEditor } from "./editor.js";
import { initGrid } from "./grid.js";
import { initMap } from "./map.js";
import { initPanels } from "./panels.js";
import { initPersistence } from "./persistence.js";
import { state } from "./state.js";
import { initSync } from "./sync.js";
import { closeTokenMenu, initTokenMenu } from "./token-menu.js";
import { removeToken } from "./tokens.js";
import { SHORTCUTS, initTools, setTool } from "./tools.js";
import { advanceTurn, initTurns } from "./turns.js";
import { initView } from "./view.js";
import { initWalls } from "./walls.js";

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
    } else if (key === "n") {
      advanceTurn();
    } else if (key === "d" && state.hoveredTokenId != null) {
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

initPanels();
initView();
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

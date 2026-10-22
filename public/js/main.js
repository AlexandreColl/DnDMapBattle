import { initBoard } from "./board.js";
import { $ } from "./dom.js";
import { initEditor } from "./editor.js";
import { initGrid } from "./grid.js";
import { initMap } from "./map.js";
import { initMeasure } from "./measure.js";
import { initPersistence } from "./persistence.js";
import { state } from "./state.js";
import { initSync } from "./sync.js";
import { removeToken } from "./tokens.js";
import { initTurns } from "./turns.js";
import { initView } from "./view.js";
import { initWalls } from "./walls.js";

function initSidebar() {
  const sidebar = $("#sidebar");
  const toggle = $("#sidebar-toggle");
  toggle.addEventListener("click", () => {
    const collapsed = sidebar.classList.toggle("collapsed");
    toggle.classList.toggle("collapsed", collapsed);
    toggle.textContent = collapsed ? "☰" : "◀";
  });
}

function isTyping(target) {
  return target.closest?.("input, textarea, select, [contenteditable]");
}

function initKeyboard() {
  // D deletes the token under the mouse.
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "d" || isTyping(e.target)) return;
    if (state.hoveredTokenId != null) removeToken(state.hoveredTokenId);
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

initView();
initMap();
initGrid();
initWalls();
initMeasure();
initTurns();
initEditor();
initPersistence();
initBoard();
initSidebar();
initKeyboard();
preventBrowserDefaults();
initSync();

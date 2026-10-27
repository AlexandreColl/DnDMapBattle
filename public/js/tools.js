// Exclusive map tools: move, measure, reveal fog and paint walls.
import { $, $$, mapContainer } from "./dom.js";
import { clearMeasurement } from "./measure.js";
import { isDm } from "./roles.js";
import { state } from "./state.js";
import { closeTokenMenu } from "./token-menu.js";
import { icon } from "./ui.js";
import { applyWallCells } from "./walls.js";

const TOOLS = {
  move: { icon: "hand-move", hint: "Mover · arrastra fichas o el mapa" },
  measure: {
    icon: "ruler-measure",
    hint: "Medir · haz clic en dos casillas",
  },
  reveal: {
    icon: "eye",
    hint: "Revelar niebla · clic para revelar u ocultar una casilla",
  },
  walls: {
    icon: "wall",
    hint: "Paredes · arrastra para pintar, Mayús para borrar · Esc para salir",
  },
};

/** Keyboard shortcut → tool. */
export const SHORTCUTS = { v: "move", m: "measure", f: "reveal", w: "walls" };

const hintEl = $("#mode-hint");

/** Replaces the hint text, keeping the current tool's icon. */
export function setHint(text) {
  hintEl.replaceChildren(icon(TOOLS[state.tool].icon), text);
}

export function resetHint() {
  setHint(TOOLS[state.tool].hint);
}

/** Tools a player may use; the rest change the board for everyone. */
const PLAYER_TOOLS = ["move", "measure"];

export function setTool(tool) {
  if (!TOOLS[tool] || (!isDm() && !PLAYER_TOOLS.includes(tool))) return;
  const previous = state.tool;
  state.tool = tool;
  mapContainer.dataset.tool = tool;
  $$("#toolbar .tool[data-tool]").forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.tool === tool),
  );
  if (previous === "measure" && tool !== "measure") clearMeasurement();
  if (previous === "walls" || tool === "walls") applyWallCells();
  closeTokenMenu();
  resetHint();
}

export function initTools() {
  $$("#toolbar .tool[data-tool]").forEach((btn) =>
    btn.addEventListener("click", () => setTool(btn.dataset.tool)),
  );
  setTool("move");
}

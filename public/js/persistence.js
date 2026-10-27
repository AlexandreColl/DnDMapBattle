// Save/load games (.dndmap) and export/import characters (.dndchars).
import { applyFullState, snapshotState } from "./board.js";
import { addCharacter } from "./characters.js";
import { $, downloadJson, readFileAsText } from "./dom.js";
import {
  buildCharactersExport,
  buildSaveData,
  parseCharactersFile,
  parseSaveFile,
} from "./lib/save-file.js";
import { showPanel } from "./panels.js";
import { EVENTS } from "./shared/protocol.js";
import { emit, withoutEmitting } from "./socket.js";
import { state } from "./state.js";
import { toast } from "./ui.js";

function saveGame() {
  if (state.gridRows === 0 || state.gridCols === 0) {
    toast("Genera una cuadrícula antes de guardar", { kind: "error" });
    return;
  }
  downloadJson(buildSaveData(state), "partida.dndmap");
  toast("Partida guardada", { kind: "success" });
}

async function loadGame(file) {
  try {
    const data = parseSaveFile(await readFileAsText(file));
    withoutEmitting(() => applyFullState(data, { restoreView: true }));
    emit(EVENTS.STATE_FULL, snapshotState());
    showPanel("play");
    toast("Partida cargada", { kind: "success" });
  } catch (err) {
    toast(`No se pudo cargar la partida: ${err.message}`, { kind: "error" });
  }
}

function exportCharacters() {
  if (state.characters.length === 0) {
    toast("No hay fichas para exportar", { kind: "error" });
    return;
  }
  downloadJson(buildCharactersExport(state.characters), "personajes.dndchars");
}

async function importCharacters(file) {
  try {
    const text = await readFileAsText(file);
    const characters = parseCharactersFile(text, state.nextCharId);
    if (characters.length === 0) throw new Error("no hay fichas válidas");
    characters.forEach(addCharacter);
    toast(
      characters.length === 1
        ? "1 ficha importada"
        : `${characters.length} fichas importadas`,
      { kind: "success" },
    );
  } catch (err) {
    toast(`No se pudieron importar las fichas: ${err.message}`, {
      kind: "error",
    });
  }
}

/** Wires a button to a hidden file input and calls `onFile` with the pick. */
function bindFilePicker(buttonId, inputId, onFile) {
  const input = $(inputId);
  $(buttonId).addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files[0];
    input.value = "";
    if (file) onFile(file);
  });
}

export function initPersistence() {
  $("#save-state").addEventListener("click", saveGame);
  $("#export-chars").addEventListener("click", exportCharacters);
  bindFilePicker("#load-state", "#load-input", loadGame);
  bindFilePicker("#import-chars", "#import-chars-input", importCharacters);
}

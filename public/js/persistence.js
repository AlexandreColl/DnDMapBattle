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
import { EVENTS } from "./shared/protocol.js";
import { emit, withoutEmitting } from "./socket.js";
import { state } from "./state.js";

function saveGame() {
  if (state.gridRows === 0 || state.gridCols === 0) {
    alert("No hay partida que guardar. Genera una cuadrícula primero.");
    return;
  }
  downloadJson(buildSaveData(state), "partida.dndmap");
}

async function loadGame(file) {
  try {
    const data = parseSaveFile(await readFileAsText(file));
    withoutEmitting(() => applyFullState(data));
    emit(EVENTS.STATE_FULL, snapshotState());
  } catch (err) {
    alert(`Error al cargar la partida: ${err.message}`);
  }
}

function exportCharacters() {
  if (state.characters.length === 0) {
    alert("No hay personajes para exportar.");
    return;
  }
  downloadJson(buildCharactersExport(state.characters), "personajes.dndchars");
}

async function importCharacters(file) {
  try {
    const text = await readFileAsText(file);
    const characters = parseCharactersFile(text, state.nextCharId);
    if (characters.length === 0) throw new Error("No hay personajes válidos");
    characters.forEach(addCharacter);
  } catch (err) {
    alert(`Error al importar personajes: ${err.message}`);
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

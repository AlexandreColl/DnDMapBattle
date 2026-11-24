// Save/load games (.dndmap) and export/import characters (.dndchars).
import { applyFullState, snapshotState } from "./board.js";
import { addCharacter } from "./characters.js";
import { $, downloadJson, readFileAsText } from "./dom.js";
import { t } from "./i18n.js";
import {
  buildCharactersExport,
  buildSaveData,
  parseCharactersFile,
  parseSaveFile,
  SaveFileError,
} from "./lib/save-file.js";
import { showPanel } from "./panels.js";
import { EVENTS } from "./shared/protocol.js";
import { emit, withoutEmitting } from "./socket.js";
import { state } from "./state.js";
import { toast } from "./ui.js";

/** A save file error in this language; others (bad JSON) as they come. */
function errorMessage(err) {
  return err instanceof SaveFileError ? t(err.message) : err.message;
}

function saveGame() {
  if (state.gridRows === 0 || state.gridCols === 0) {
    toast(t("file.needGrid"), { kind: "error" });
    return;
  }
  downloadJson(buildSaveData(state), "partida.dndmap");
  toast(t("file.saved"), { kind: "success" });
}

async function loadGame(file) {
  try {
    const data = parseSaveFile(await readFileAsText(file));
    withoutEmitting(() => applyFullState(data, { restoreView: true }));
    emit(EVENTS.STATE_FULL, snapshotState());
    showPanel("play");
    toast(t("file.loaded"), { kind: "success" });
  } catch (err) {
    toast(t("file.loadFailed", { error: errorMessage(err) }), {
      kind: "error",
    });
  }
}

function exportCharacters() {
  if (state.characters.length === 0) {
    toast(t("file.noChars"), { kind: "error" });
    return;
  }
  downloadJson(buildCharactersExport(state.characters), "personajes.dndchars");
}

async function importCharacters(file) {
  try {
    const text = await readFileAsText(file);
    const characters = parseCharactersFile(text, state.nextCharId);
    if (characters.length === 0) throw new SaveFileError("file.noValidChars");
    characters.forEach(addCharacter);
    toast(
      characters.length === 1
        ? t("file.importedOne")
        : t("file.importedMany", { count: characters.length }),
      { kind: "success" },
    );
  } catch (err) {
    toast(t("file.importFailed", { error: errorMessage(err) }), {
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

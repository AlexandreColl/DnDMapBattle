import { LIMITS } from "../shared/protocol.js";
import { normalizeCharacter } from "./sanitize.js";

export const SAVE_VERSION = 1;

/** A file that is not a valid save. The message is a translation key. */
export class SaveFileError extends Error {}

function exportCharacter(c) {
  return {
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    visionRadius: c.visionRadius,
    isEnemy: c.isEnemy === true,
    initiative: c.initiative ?? null,
    hp: c.hp ?? null,
    maxHp: c.maxHp ?? null,
    conditions: c.conditions ?? [],
    size: c.size ?? 1,
  };
}

/** Serializable snapshot of a game, as stored in `.dndmap` files. */
export function buildSaveData(state) {
  return {
    version: SAVE_VERSION,
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    cellStates: state.cellStates,
    characters: state.characters.map(exportCharacter),
    tokens: state.tokens.map(({ id, characterId, row, col }) => ({
      id,
      characterId,
      row,
      col,
    })),
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    mapImage: state.mapDataURL || null,
    wallCells: state.wallCells,
  };
}

/** Parses a `.dndmap` file. Throws a SaveFileError when it is not one. */
export function parseSaveFile(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== "object" || !data.version) {
    throw new SaveFileError("file.invalidFormat");
  }
  const rows = data.gridRows;
  const cols = data.gridCols;
  const validSize = (n) =>
    Number.isInteger(n) && n > 0 && n <= LIMITS.maxGridSize;
  if (!validSize(rows) || !validSize(cols)) {
    throw new SaveFileError("file.invalidGrid");
  }
  if (!Array.isArray(data.characters) || !Array.isArray(data.tokens)) {
    throw new SaveFileError("file.missingData");
  }
  return data;
}

export function buildCharactersExport(characters) {
  return characters.map(exportCharacter);
}

/**
 * Parses a `.dndchars` file and assigns fresh ids starting at `firstId`.
 * Entries without a valid image are skipped.
 */
export function parseCharactersFile(text, firstId) {
  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new SaveFileError("file.invalidFormat");
  const characters = [];
  let id = firstId;
  for (const entry of raw.slice(0, LIMITS.maxCharacters)) {
    const char = normalizeCharacter(entry, id);
    if (char) {
      characters.push(char);
      id++;
    }
  }
  return characters;
}

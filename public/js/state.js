// Single mutable client state shared by every UI module.
export const state = {
  role: null, // ROLES.DM | ROLES.PLAYER, set by the server
  players: 0, // connected players (DM only)
  mapImage: null, // URL shown as background (blob: or data:)
  mapDataURL: null, // data: URL of the map, used for sync and save files
  imageNaturalWidth: 0,
  imageNaturalHeight: 0,
  gridRows: 0,
  gridCols: 0,
  cellStates: [], // 2D: CELL.HIDDEN | CELL.VISIBLE | CELL.REVEALED
  wallCells: [], // 2D boolean: true = wall
  characters: [], // { id, name, imageUrl, visionRadius, isEnemy, initiative }
  tokens: [], // { id, characterId, row, col }
  nextCharId: 1,
  nextTokenId: 1,
  zoom: 1, // zoom and pan are per device
  panX: 0,
  panY: 0,
  tool: "move", // "move" | "measure" | "reveal" | "walls" (local only)
  measurePoints: [], // [{ row, col }, ...]
  currentTurnId: null,
  hiddenTurn: false, // a character the player cannot see is playing
  hoveredTokenId: null,
  selectedTokenId: null, // token whose menu is open
};

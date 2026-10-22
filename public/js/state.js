// Single mutable client state shared by every UI module.
export const state = {
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
  zoom: 1,
  panX: 0,
  panY: 0,
  measuring: false,
  measurePoints: [], // [{ row, col }, ...]
  currentTurnId: null,
  editingWalls: false,
  hoveredTokenId: null,
};

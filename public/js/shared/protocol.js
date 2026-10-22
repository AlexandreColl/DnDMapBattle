// Shared between the browser client and the Node server.
// Keep this file dependency-free so both sides can import it as-is.

export const EVENTS = Object.freeze({
  STATE_FULL: "state:full",
  STATE_CLEARED: "state:cleared",
  MAP_CHANGED: "map:changed",
  GRID_GENERATED: "grid:generated",
  CHARACTER_ADDED: "character:added",
  CHARACTER_REMOVED: "character:removed",
  TOKEN_PLACED: "token:placed",
  TOKEN_REMOVED: "token:removed",
  FOG_UPDATED: "fog:updated",
  WALLS_SET: "walls:set",
  VIEW_CHANGED: "view:changed",
  INITIATIVE_CHANGED: "initiative:changed",
  TURN_CHANGED: "turn:changed",
});

export const CELL = Object.freeze({
  HIDDEN: "hidden",
  VISIBLE: "visible",
  REVEALED: "revealed",
});

export const LIMITS = Object.freeze({
  maxGridSize: 200,
  maxCharacters: 500,
  maxNameLength: 60,
  minVisionRadius: 1,
  maxVisionRadius: 100,
  defaultVisionRadius: 5,
  minInitiative: -99,
  maxInitiative: 999,
  minZoom: 0.1,
  maxZoom: 5,
});

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
  // The DM brings everyone to the area they are looking at.
  VIEW_CENTERED: "view:centered",
  INITIATIVE_CHANGED: "initiative:changed",
  HEALTH_CHANGED: "health:changed",
  CONDITIONS_CHANGED: "conditions:changed",
  SIZE_CHANGED: "size:changed",
  TURN_CHANGED: "turn:changed",
  // Server → client only.
  SESSION: "session", // { role } right after connecting
  PRESENCE: "presence", // { dms, players } to the DMs
  PLAYER_VIEW: "player:view", // what a player may see, after every change
});

export const ROLES = Object.freeze({ DM: "dm", PLAYER: "player" });

/** Events a player may send; everything else is for the DM only. */
export const PLAYER_EVENTS = Object.freeze([
  EVENTS.TOKEN_PLACED,
  EVENTS.INITIATIVE_CHANGED,
  EVENTS.HEALTH_CHANGED,
  EVENTS.CONDITIONS_CHANGED,
]);

/** The D&D 5e conditions, plus concentration. */
export const CONDITIONS = Object.freeze([
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "exhausted",
  "concentrating",
]);

/** How hurt a character looks, without its exact hit points. */
export const HEALTH = Object.freeze({
  UNHURT: "unhurt",
  HURT: "hurt",
  BLOODIED: "bloodied",
  DOWN: "down",
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
  maxHp: 9999,
  // Cells per side: 1 (small or medium), 2 (large), 3 (huge), 4 (gargantuan).
  maxSize: 4,
  minZoom: 0.1,
  maxZoom: 5,
});

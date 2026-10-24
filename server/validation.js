import { z } from "zod";
import { CELL, LIMITS } from "../public/js/shared/protocol.js";

// Only base64 image data URLs are accepted for maps and character portraits.
const DATA_IMAGE_RE = /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+=*$/i;
const MAX_PAN = 1_000_000;

const id = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const gridSize = z.number().int().min(0).max(LIMITS.maxGridSize);
const gridIndex = z
  .number()
  .int()
  .min(0)
  .max(LIMITS.maxGridSize - 1);

export const dataImage = z.string().regex(DATA_IMAGE_RE, "imagen no válida");

const initiative = z
  .number()
  .int()
  .min(LIMITS.minInitiative)
  .max(LIMITS.maxInitiative)
  .nullable();

export const character = z.object({
  id,
  name: z.string().trim().min(1).max(LIMITS.maxNameLength),
  imageUrl: dataImage,
  visionRadius: z
    .number()
    .int()
    .min(LIMITS.minVisionRadius)
    .max(LIMITS.maxVisionRadius)
    .default(LIMITS.defaultVisionRadius),
  isEnemy: z.boolean().default(false),
  initiative: initiative.default(null),
});

export const token = z.object({
  id,
  characterId: id,
  row: gridIndex,
  col: gridIndex,
});

const matrix = (cell) =>
  z.array(z.array(cell).max(LIMITS.maxGridSize)).max(LIMITS.maxGridSize);

export const cellStates = matrix(z.enum(Object.values(CELL)));
export const wallCells = matrix(z.boolean());

const zoom = z.number().min(LIMITS.minZoom).max(LIMITS.maxZoom);
const pan = z.number().min(-MAX_PAN).max(MAX_PAN);

export const schemas = {
  stateFull: z.object({
    mapImage: dataImage.nullable().default(null),
    gridRows: gridSize,
    gridCols: gridSize,
    cellStates,
    wallCells: wallCells.default([]),
    characters: z.array(character).max(LIMITS.maxCharacters),
    tokens: z.array(token).max(LIMITS.maxCharacters),
    nextCharId: id,
    nextTokenId: id,
    zoom: zoom.default(1),
    panX: pan.default(0),
    panY: pan.default(0),
    currentTurnId: id.nullable().default(null),
  }),
  mapChanged: z.object({ mapImage: dataImage.nullable() }),
  gridGenerated: z.object({
    gridRows: gridSize,
    gridCols: gridSize,
    cellStates,
    wallCells,
    tokens: z.array(token).max(LIMITS.maxCharacters),
    nextTokenId: id,
  }),
  characterAdded: z.object({ character, nextCharId: id }),
  characterRemoved: z.object({ charId: id }),
  tokenPlaced: z.object({
    characterId: id,
    row: gridIndex,
    col: gridIndex,
    token,
    nextTokenId: id,
  }),
  tokenRemoved: z.object({ tokenId: id }),
  fogUpdated: z.object({ cellStates }),
  wallsSet: z.object({ wallCells }),
  viewChanged: z.object({ zoom, panX: pan, panY: pan }),
  initiativeChanged: z.object({ charId: id, initiative }),
  turnChanged: z.object({ charId: id.nullable() }),
};

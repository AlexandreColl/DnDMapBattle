// Property-based tests: random sequences of events, valid and invalid, from
// DMs and players, checked against rules that must always hold.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { matrixMatches } from "../../public/js/lib/geometry.js";
import {
  CELL,
  CONDITIONS,
  EVENTS,
  ROLES,
} from "../../public/js/shared/protocol.js";
import {
  characterSize,
  coveredCells,
  fitsGrid,
} from "../../public/js/lib/size.js";
import {
  RejectedEventError,
  createGameState,
  reducers,
} from "../../server/game.js";
import {
  authorize,
  playerSnapshot,
  playerView,
  refreshVision,
  roleFor,
} from "../../server/roles.js";

const IMG = "data:image/png;base64,AAAA";

// Small ranges so that ids collide and positions fall off the grid often.
const size = fc.constantFrom(3, 4);
const charId = fc.integer({ min: 1, max: 5 });
const tokenId = fc.integer({ min: 1, max: 5 });
const index = fc.integer({ min: 0, max: 4 });
const cellState = fc.constantFrom(...Object.values(CELL));
const hp = fc.option(fc.integer({ min: 0, max: 30 }), { nil: null });
const maxHp = fc.option(fc.integer({ min: 1, max: 30 }), { nil: null });
const conditions = fc.array(fc.constantFrom(...CONDITIONS), { maxLength: 4 });

const matrixOf = (rows, cols, cell) =>
  fc.array(fc.array(cell, { minLength: cols, maxLength: cols }), {
    minLength: rows,
    maxLength: rows,
  });
const anyMatrix = (cell) =>
  fc.tuple(size, size).chain(([rows, cols]) => matrixOf(rows, cols, cell));

const character = fc.record({
  id: charId,
  name: fc.constant("PJ"),
  imageUrl: fc.constant(IMG),
  visionRadius: fc.integer({ min: 1, max: 3 }),
  isEnemy: fc.boolean(),
  initiative: fc.option(fc.integer({ min: -5, max: 30 }), { nil: null }),
  hp,
  maxHp,
  conditions,
  size: fc.integer({ min: 1, max: 3 }),
});
const token = fc.record({
  id: tokenId,
  characterId: charId,
  row: index,
  col: index,
});

const board = fc.tuple(size, size).chain(([rows, cols]) =>
  fc.record({
    gridRows: fc.constant(rows),
    gridCols: fc.constant(cols),
    cellStates: matrixOf(rows, cols, cellState),
    wallCells: matrixOf(rows, cols, fc.boolean()),
    tokens: fc.array(token, { maxLength: 4 }),
    nextTokenId: tokenId,
  }),
);

const on = (event, raw, weight = 1) => ({
  arbitrary: raw.map((r) => ({ event, raw: r })),
  weight,
});

const action = fc.oneof(
  on(EVENTS.GRID_GENERATED, board, 2),
  on(
    EVENTS.STATE_FULL,
    board.chain((b) =>
      fc.record({
        ...Object.fromEntries(
          Object.entries(b).map(([k, v]) => [k, fc.constant(v)]),
        ),
        characters: fc.array(character, { maxLength: 4 }),
        nextCharId: charId,
        currentTurnId: fc.option(charId, { nil: null }),
      }),
    ),
  ),
  on(EVENTS.STATE_CLEARED, fc.constant(undefined)),
  on(EVENTS.CHARACTER_ADDED, fc.record({ character, nextCharId: charId }), 4),
  on(EVENTS.CHARACTER_REMOVED, fc.record({ charId })),
  on(
    EVENTS.TOKEN_PLACED,
    fc.record({
      characterId: charId,
      row: index,
      col: index,
      token,
      nextTokenId: tokenId,
    }),
    6,
  ),
  on(EVENTS.TOKEN_REMOVED, fc.record({ tokenId })),
  on(EVENTS.FOG_UPDATED, fc.record({ cellStates: anyMatrix(cellState) })),
  on(EVENTS.WALLS_SET, fc.record({ wallCells: anyMatrix(fc.boolean()) })),
  on(
    EVENTS.INITIATIVE_CHANGED,
    fc.record({
      charId,
      initiative: fc.option(fc.integer({ min: -5, max: 30 }), { nil: null }),
    }),
    2,
  ),
  on(EVENTS.HEALTH_CHANGED, fc.record({ charId, hp, maxHp }), 2),
  on(EVENTS.CONDITIONS_CHANGED, fc.record({ charId, conditions })),
  on(
    EVENTS.SIZE_CHANGED,
    fc.record({ charId, size: fc.integer({ min: 1, max: 5 }) }),
  ),
  on(
    EVENTS.TURN_CHANGED,
    fc.record({ charId: fc.option(charId, { nil: null }) }),
  ),
  // Anything at all, sent as any event.
  {
    arbitrary: fc.record({
      event: fc.constantFrom(...Object.keys(reducers)),
      raw: fc.anything(),
    }),
    weight: 2,
  },
);

const command = fc.record({
  role: fc.constantFrom(ROLES.DM, ROLES.PLAYER),
  action,
});
const commands = fc.array(command, { maxLength: 40 });

/** Same steps as the socket handler: authorize, reduce, recompute the fog. */
function apply(state, { role, action: { event, raw } }) {
  try {
    authorize(role, event, state, raw);
    reducers[event](state, raw);
    refreshVision(state);
    return true;
  } catch (err) {
    if (err instanceof RejectedEventError || err instanceof ZodError) {
      return false;
    }
    throw err;
  }
}

/** Plays `cmds` from an empty game, calling `check` after each one. */
function play(cmds, check) {
  const state = createGameState();
  for (const cmd of cmds) {
    const before = structuredClone(state);
    const accepted = apply(state, cmd);
    check({ before, state, cmd, accepted });
  }
}

const unique = (values) => new Set(values).size === values.length;

function expectConsistent(state) {
  const { gridRows: rows, gridCols: cols } = state;
  expect(matrixMatches(state.cellStates, rows, cols)).toBe(true);
  if (state.wallCells.length) {
    expect(matrixMatches(state.wallCells, rows, cols)).toBe(true);
  }
  const charIds = state.characters.map((c) => c.id);
  expect(unique(charIds)).toBe(true);
  expect(unique(state.tokens.map((t) => t.id))).toBe(true);
  expect(unique(state.tokens.map((t) => t.characterId))).toBe(true);
  for (const t of state.tokens) {
    const char = state.characters.find((c) => c.id === t.characterId);
    expect(char).toBeDefined();
    expect(fitsGrid(t.row, t.col, characterSize(char), rows, cols)).toBe(true);
  }
  for (const c of state.characters) {
    if (c.maxHp == null) expect(c.hp).toBeNull();
    else expect(c.hp).toBeGreaterThanOrEqual(0);
    if (c.maxHp != null) expect(c.hp).toBeLessThanOrEqual(c.maxHp);
  }
  for (const id of charIds) expect(id).toBeLessThan(state.nextCharId);
  for (const t of state.tokens) expect(t.id).toBeLessThan(state.nextTokenId);
}

/** The state minus what a player is allowed to change. */
function beyondPlayers(state) {
  const allies = new Set(
    state.characters.filter((c) => !c.isEnemy).map((c) => c.id),
  );
  return {
    ...state,
    cellStates: null,
    nextTokenId: null,
    tokens: state.tokens.filter((t) => !allies.has(t.characterId)),
    characters: state.characters.map((c) =>
      allies.has(c.id)
        ? { ...c, initiative: null, hp: null, maxHp: null, conditions: null }
        : c,
    ),
  };
}

describe("propiedades del servidor", () => {
  it("un evento rechazado no cambia nada", () => {
    fc.assert(
      fc.property(commands, (cmds) =>
        play(cmds, ({ before, state, accepted }) => {
          if (!accepted) expect(state).toEqual(before);
        }),
      ),
    );
  });

  it("el estado siempre es coherente", () => {
    fc.assert(
      fc.property(commands, (cmds) =>
        play(cmds, ({ state }) => expectConsistent(state)),
      ),
    );
  });

  it("un jugador solo cambia fichas, iniciativa, vida y estados de aliados", () => {
    fc.assert(
      fc.property(commands, (cmds) =>
        play(cmds, ({ before, state, cmd, accepted }) => {
          if (accepted && cmd.role === ROLES.PLAYER) {
            expect(beyondPlayers(state)).toEqual(beyondPlayers(before));
          }
        }),
      ),
    );
  });

  it("un jugador nunca ve enemigos en la niebla, ni su iniciativa ni su vida", () => {
    fc.assert(
      fc.property(commands, (cmds) =>
        play(cmds, ({ state }) => {
          const view = playerView(state);
          const enemies = new Set(
            state.characters.filter((c) => c.isEnemy).map((c) => c.id),
          );
          for (const t of view.tokens) {
            if (enemies.has(t.characterId)) {
              // At least one of the cells it covers is in sight.
              const char = state.characters.find((c) => c.id === t.characterId);
              const seen = coveredCells(t, characterSize(char)).map(
                ({ row, col }) => state.cellStates[row][col],
              );
              expect(seen.some((cell) => cell !== CELL.HIDDEN)).toBe(true);
            }
          }
          const onBoard = new Set(view.tokens.map((t) => t.characterId));
          for (const c of view.characters) {
            if (enemies.has(c.id)) {
              expect(onBoard.has(c.id)).toBe(true);
              expect(c.initiative).toBeNull();
              expect(c.hp).toBeNull();
              expect(c.maxHp).toBeNull();
            }
          }
          if (view.currentTurnId != null) {
            expect(view.characters.map((c) => c.id)).toContain(
              view.currentTurnId,
            );
          }
          expect(playerSnapshot(state).wallCells).toEqual([]);
        }),
      ),
    );
  });

  it("solo la clave exacta da el rol de máster", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 6 }),
        fc.anything(),
        (key, offered) => {
          expect(roleFor(key, offered)).toBe(
            offered === key ? ROLES.DM : ROLES.PLAYER,
          );
          expect(roleFor(key, key)).toBe(ROLES.DM);
        },
      ),
    );
  });
});

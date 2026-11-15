import { beforeEach, describe, expect, it } from "vitest";
import { createMatrix } from "../../public/js/lib/geometry.js";
import { EVENTS } from "../../public/js/shared/protocol.js";
import { createGameState, reducers } from "../../server/game.js";

const IMG = "data:image/png;base64,AAAA";

function apply(state, event, payload) {
  return reducers[event](state, payload);
}

function withGrid(rows = 3, cols = 4) {
  const state = createGameState();
  apply(state, EVENTS.GRID_GENERATED, {
    gridRows: rows,
    gridCols: cols,
    cellStates: createMatrix(rows, cols, "hidden"),
    wallCells: createMatrix(rows, cols, false),
    tokens: [],
    nextTokenId: 1,
  });
  return state;
}

const hero = { id: 1, name: "Hero", imageUrl: IMG, visionRadius: 3 };

describe("game reducers", () => {
  let state;
  beforeEach(() => {
    state = withGrid();
  });

  it("adds characters with defaults and strips unknown fields", () => {
    const out = apply(state, EVENTS.CHARACTER_ADDED, {
      character: { ...hero, onclick: "x" },
      nextCharId: 2,
    });
    expect(out.character).toEqual({
      ...hero,
      isEnemy: false,
      initiative: null,
      hp: null,
      maxHp: null,
      conditions: [],
    });
    expect(state.characters).toHaveLength(1);
    expect(state.nextCharId).toBe(2);
  });

  it("rejects characters whose image is not a data:image URL", () => {
    expect(() =>
      apply(state, EVENTS.CHARACTER_ADDED, {
        character: { ...hero, imageUrl: "javascript:alert(1)" },
        nextCharId: 2,
      }),
    ).toThrow();
    expect(state.characters).toHaveLength(0);
  });

  it("rejects names that are too long", () => {
    expect(() =>
      apply(state, EVENTS.CHARACTER_ADDED, {
        character: { ...hero, name: "x".repeat(61) },
        nextCharId: 2,
      }),
    ).toThrow();
  });

  it("places and moves tokens inside the grid only", () => {
    apply(state, EVENTS.CHARACTER_ADDED, { character: hero, nextCharId: 2 });
    const token = { id: 1, characterId: 1, row: 0, col: 0 };
    apply(state, EVENTS.TOKEN_PLACED, {
      characterId: 1,
      row: 2,
      col: 3,
      token,
      nextTokenId: 2,
    });
    expect(state.tokens).toEqual([{ id: 1, characterId: 1, row: 2, col: 3 }]);

    expect(() =>
      apply(state, EVENTS.TOKEN_PLACED, {
        characterId: 1,
        row: 3,
        col: 0,
        token,
        nextTokenId: 2,
      }),
    ).toThrow("fuera de la cuadrícula");
    expect(state.tokens[0].row).toBe(2);
  });

  it("rejects tokens for unknown characters", () => {
    const token = { id: 1, characterId: 7, row: 0, col: 0 };
    expect(() =>
      apply(state, EVENTS.TOKEN_PLACED, {
        characterId: 7,
        row: 0,
        col: 0,
        token,
        nextTokenId: 2,
      }),
    ).toThrow("personaje desconocido");
  });

  it("rejects fog and walls that do not match the grid", () => {
    expect(() =>
      apply(state, EVENTS.FOG_UPDATED, {
        cellStates: createMatrix(2, 2, "hidden"),
      }),
    ).toThrow();
    expect(() =>
      apply(state, EVENTS.FOG_UPDATED, {
        cellStates: createMatrix(3, 4, "bogus"),
      }),
    ).toThrow();
    expect(() =>
      apply(state, EVENTS.WALLS_SET, { wallCells: [[true]] }),
    ).toThrow();
  });

  it("rejects malformed payloads instead of crashing", () => {
    for (const event of Object.keys(reducers)) {
      if (event === EVENTS.STATE_CLEARED) continue;
      expect(() => apply(state, event, null)).toThrow();
      expect(() =>
        apply(state, event, { cells: [{ row: 999, col: 999 }] }),
      ).toThrow();
    }
  });

  it("clears everything, walls included", () => {
    state.wallCells[0][0] = true;
    state.mapImage = IMG;
    apply(state, EVENTS.STATE_CLEARED);
    expect(state).toEqual(createGameState());
  });

  it("removing a character also removes its token and turn", () => {
    apply(state, EVENTS.CHARACTER_ADDED, { character: hero, nextCharId: 2 });
    apply(state, EVENTS.TOKEN_PLACED, {
      characterId: 1,
      row: 0,
      col: 0,
      token: { id: 1, characterId: 1, row: 0, col: 0 },
      nextTokenId: 2,
    });
    apply(state, EVENTS.TURN_CHANGED, { charId: 1 });
    apply(state, EVENTS.CHARACTER_REMOVED, { charId: 1 });
    expect(state.tokens).toEqual([]);
    expect(state.currentTurnId).toBe(null);
  });

  it("validates full snapshots", () => {
    const snapshot = {
      mapImage: IMG,
      gridRows: 1,
      gridCols: 1,
      cellStates: [["revealed"]],
      wallCells: [[false]],
      characters: [hero],
      tokens: [{ id: 1, characterId: 1, row: 0, col: 0 }],
      nextCharId: 2,
      nextTokenId: 2,
      zoom: 1,
      panX: 0,
      panY: 0,
    };
    apply(state, EVENTS.STATE_FULL, snapshot);
    expect(state.gridRows).toBe(1);
    expect(state.currentTurnId).toBe(null);

    expect(() =>
      apply(state, EVENTS.STATE_FULL, { ...snapshot, cellStates: [] }),
    ).toThrow();
  });

  it("keeps hit points consistent and conditions known", () => {
    apply(state, EVENTS.CHARACTER_ADDED, {
      character: { ...hero, hp: 50, maxHp: 20, conditions: ["prone", "prone"] },
      nextCharId: 2,
    });
    expect(state.characters[0]).toMatchObject({
      hp: 20,
      maxHp: 20,
      conditions: ["prone"],
    });

    expect(
      apply(state, EVENTS.HEALTH_CHANGED, { charId: 1, hp: 7, maxHp: 20 }),
    ).toEqual({ charId: 1, hp: 7, maxHp: 20 });
    expect(state.characters[0].hp).toBe(7);
    // Lowering the maximum caps the current hit points.
    apply(state, EVENTS.HEALTH_CHANGED, { charId: 1, hp: 7, maxHp: 5 });
    expect(state.characters[0]).toMatchObject({ hp: 5, maxHp: 5 });
    apply(state, EVENTS.HEALTH_CHANGED, { charId: 1, hp: 3, maxHp: null });
    expect(state.characters[0]).toMatchObject({ hp: null, maxHp: null });

    apply(state, EVENTS.CONDITIONS_CHANGED, {
      charId: 1,
      conditions: ["stunned", "poisoned"],
    });
    expect(state.characters[0].conditions).toEqual(["poisoned", "stunned"]);
    expect(() =>
      apply(state, EVENTS.CONDITIONS_CHANGED, {
        charId: 1,
        conditions: ["flying"],
      }),
    ).toThrow();
    expect(() =>
      apply(state, EVENTS.HEALTH_CHANGED, { charId: 1, hp: -1, maxHp: 5 }),
    ).toThrow();
  });
});

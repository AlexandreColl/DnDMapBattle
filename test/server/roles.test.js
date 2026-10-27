import { describe, expect, it } from "vitest";
import { CELL, EVENTS, ROLES } from "../../public/js/shared/protocol.js";
import { generateDmKey, resolveDmKey } from "../../server/dm-key.js";
import { createGameState } from "../../server/game.js";
import {
  authorize,
  playerSnapshot,
  playerView,
  refreshVision,
  roleFor,
} from "../../server/roles.js";

const IMG = "data:image/png;base64,AAAA";
const H = CELL.HIDDEN;

/** 1×6 corridor: an ally at col 0 that sees 2 cells, enemies at 1 and 5. */
function game() {
  const state = createGameState();
  Object.assign(state, {
    gridRows: 1,
    gridCols: 6,
    cellStates: [[H, H, H, H, H, H]],
    wallCells: [[false, false, false, false, false, false]],
    characters: [
      {
        id: 1,
        name: "Aria",
        imageUrl: IMG,
        visionRadius: 2,
        isEnemy: false,
        initiative: 12,
      },
      {
        id: 2,
        name: "Orco",
        imageUrl: IMG,
        visionRadius: 5,
        isEnemy: true,
        initiative: 15,
      },
      {
        id: 3,
        name: "Chamán",
        imageUrl: IMG,
        visionRadius: 5,
        isEnemy: true,
        initiative: 18,
      },
      {
        id: 4,
        name: "Lobo",
        imageUrl: IMG,
        visionRadius: 5,
        isEnemy: true,
        initiative: 3,
      },
    ],
    tokens: [
      { id: 1, characterId: 1, row: 0, col: 0 },
      { id: 2, characterId: 2, row: 0, col: 1 },
      { id: 3, characterId: 3, row: 0, col: 5 },
    ],
  });
  refreshVision(state);
  return state;
}

const place = (characterId, col, tokenId = characterId) => ({
  characterId,
  row: 0,
  col,
  token: { id: tokenId, characterId, row: 0, col },
  nextTokenId: 10,
});

describe("roleFor", () => {
  it("makes everyone DM when the server has no key", () => {
    expect(roleFor(null, undefined)).toBe(ROLES.DM);
  });

  it("gives DM only to the exact key", () => {
    expect(roleFor("K7Q2-M9XA", "K7Q2-M9XA")).toBe(ROLES.DM);
    expect(roleFor("K7Q2-M9XA", "K7Q2-M9XB")).toBe(ROLES.PLAYER);
    expect(roleFor("K7Q2-M9XA", "short")).toBe(ROLES.PLAYER);
    expect(roleFor("K7Q2-M9XA", undefined)).toBe(ROLES.PLAYER);
    expect(roleFor("K7Q2-M9XA", { key: "K7Q2-M9XA" })).toBe(ROLES.PLAYER);
  });
});

describe("dm key", () => {
  it("generates readable keys", () => {
    expect(generateDmKey()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(generateDmKey()).not.toBe(generateDmKey());
  });

  it("uses DM_KEY only when it is valid", () => {
    expect(resolveDmKey("my-table-42")).toBe("my-table-42");
    expect(resolveDmKey(undefined)).toMatch(/^.{4}-.{4}$/);
  });
});

describe("authorize", () => {
  const state = game();
  const asPlayer = (event, raw) => () =>
    authorize(ROLES.PLAYER, event, state, raw);

  it("lets the DM send anything", () => {
    expect(() =>
      authorize(ROLES.DM, EVENTS.WALLS_SET, state, {}),
    ).not.toThrow();
  });

  it("lets players move allies and change their initiative", () => {
    expect(asPlayer(EVENTS.TOKEN_PLACED, place(1, 2))).not.toThrow();
    expect(
      asPlayer(EVENTS.INITIATIVE_CHANGED, { charId: 1, initiative: 9 }),
    ).not.toThrow();
  });

  it("rejects players moving enemies or changing their initiative", () => {
    expect(asPlayer(EVENTS.TOKEN_PLACED, place(2, 3))).toThrow(/aliados/);
    expect(
      asPlayer(EVENTS.INITIATIVE_CHANGED, { charId: 2, initiative: 1 }),
    ).toThrow(/aliados/);
  });

  it("rejects a new ally token that reuses an enemy token id", () => {
    expect(asPlayer(EVENTS.TOKEN_PLACED, place(1, 2, 2))).toThrow(/otro/);
  });

  it.each([
    EVENTS.WALLS_SET,
    EVENTS.FOG_UPDATED,
    EVENTS.TOKEN_REMOVED,
    EVENTS.TURN_CHANGED,
    EVENTS.STATE_FULL,
    EVENTS.STATE_CLEARED,
    EVENTS.VIEW_CENTERED,
  ])("rejects players sending %s", (event) => {
    expect(asPlayer(event, {})).toThrow(/máster/);
  });
});

describe("playerView", () => {
  it("shows allies and visible enemies, hides enemies in the fog", () => {
    const view = playerView(game());
    expect(view.tokens.map((t) => t.characterId)).toEqual([1, 2]);
    expect(view.characters.map((c) => c.name)).toEqual(["Aria", "Orco"]);
    expect(view.cellStates[0]).toEqual([
      CELL.VISIBLE,
      CELL.VISIBLE,
      CELL.VISIBLE,
      H,
      H,
      H,
    ]);
  });

  it("shows enemies on manually revealed cells", () => {
    const state = game();
    state.cellStates[0][5] = CELL.REVEALED;
    expect(playerView(state).characters.map((c) => c.name)).toContain("Chamán");
  });

  it("hides enemy initiative but keeps allied initiative", () => {
    const [aria, orco] = playerView(game()).characters;
    expect(aria.initiative).toBe(12);
    expect(orco.initiative).toBeNull();
  });

  it("omits portraits the player already has", () => {
    const [aria, orco] = playerView(game(), new Set([1])).characters;
    expect(aria.imageUrl).toBeUndefined();
    expect(orco.imageUrl).toBe(IMG);
  });

  it("reports a hidden enemy's turn without revealing who", () => {
    const state = game();
    state.currentTurnId = 3;
    expect(playerView(state)).toMatchObject({
      currentTurnId: null,
      hiddenTurn: true,
    });
    state.currentTurnId = 2;
    expect(playerView(state)).toMatchObject({
      currentTurnId: 2,
      hiddenTurn: false,
    });
  });

  it("never sends the walls", () => {
    expect(playerSnapshot(game()).wallCells).toEqual([]);
  });
});

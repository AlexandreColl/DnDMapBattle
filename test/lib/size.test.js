import { describe, expect, it } from "vitest";
import {
  anchorFor,
  characterSize,
  coveredCells,
  fitsGrid,
  resizeCharacter,
} from "../../public/js/lib/size.js";

describe("creature size", () => {
  it("is 1 unless the character has a valid size", () => {
    expect(characterSize({ size: 3 })).toBe(3);
    expect(characterSize({})).toBe(1);
    expect(characterSize({ size: 9 })).toBe(1);
    expect(characterSize({ size: "2" })).toBe(1);
    expect(characterSize(undefined)).toBe(1);
  });

  it("checks that a whole token fits the grid", () => {
    expect(fitsGrid(3, 3, 2, 5, 5)).toBe(true);
    expect(fitsGrid(4, 3, 2, 5, 5)).toBe(false);
    expect(fitsGrid(-1, 0, 1, 5, 5)).toBe(false);
  });

  it("centers a dropped token on the cell and keeps it inside", () => {
    expect(anchorFor(2, 2, 3, 6, 6)).toEqual({ row: 1, col: 1 });
    expect(anchorFor(2, 2, 2, 6, 6)).toEqual({ row: 2, col: 2 });
    expect(anchorFor(0, 5, 3, 6, 6)).toEqual({ row: 0, col: 3 });
    expect(anchorFor(1, 1, 1, 6, 6)).toEqual({ row: 1, col: 1 });
  });

  it("lists the cells a token covers", () => {
    expect(coveredCells({ row: 1, col: 2 }, 2)).toEqual([
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ]);
  });

  it("resizes, moving the token back inside or refusing", () => {
    const state = {
      gridRows: 3,
      gridCols: 4,
      characters: [{ id: 1, size: 1 }],
      tokens: [{ id: 1, characterId: 1, row: 2, col: 3 }],
    };
    expect(resizeCharacter(state, 1, 2)).toBe(true);
    expect(state.tokens[0]).toMatchObject({ row: 1, col: 2 });
    expect(resizeCharacter(state, 1, 4)).toBe(false);
    expect(state.characters[0].size).toBe(2);
    expect(resizeCharacter(state, 99, 2)).toBe(true);
  });
});

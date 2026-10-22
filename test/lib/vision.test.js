import { describe, expect, it } from "vitest";
import { createMatrix } from "../../public/js/lib/geometry.js";
import { computeVision } from "../../public/js/lib/vision.js";

const H = "hidden";
const V = "visible";
const R = "revealed";

function board({
  rows = 5,
  cols = 5,
  walls = [],
  revealed = [],
  tokens,
  characters,
}) {
  const wallCells = createMatrix(rows, cols, false);
  for (const [r, c] of walls) wallCells[r][c] = true;
  const cellStates = createMatrix(rows, cols, H);
  for (const [r, c] of revealed) cellStates[r][c] = R;
  return { rows, cols, wallCells, cellStates, tokens, characters };
}

const ally = { id: 1, visionRadius: 1, isEnemy: false };
const enemy = { id: 2, visionRadius: 3, isEnemy: true };

describe("computeVision", () => {
  it("lights cells within an ally's radius", () => {
    const result = computeVision(
      board({
        tokens: [{ id: 1, characterId: 1, row: 2, col: 2 }],
        characters: [ally],
      }),
    );
    expect(result[2]).toEqual([H, V, V, V, H]);
    expect(result[1][1]).toBe(H); // diagonal distance √2 > 1
    expect(result[0][2]).toBe(H);
  });

  it("ignores enemy tokens", () => {
    const result = computeVision(
      board({
        tokens: [{ id: 1, characterId: 2, row: 2, col: 2 }],
        characters: [enemy],
      }),
    );
    expect(result.flat().every((s) => s === H)).toBe(true);
  });

  it("does not see through walls", () => {
    const result = computeVision(
      board({
        walls: [[2, 3]],
        tokens: [{ id: 1, characterId: 1, row: 2, col: 2 }],
        characters: [{ ...ally, visionRadius: 3 }],
      }),
    );
    expect(result[2][3]).toBe(V); // the wall itself is visible
    expect(result[2][4]).toBe(H); // what is behind it is not
  });

  it("keeps manually revealed cells and hides stale visibility", () => {
    const input = board({ revealed: [[0, 0]], tokens: [], characters: [] });
    input.cellStates[4][4] = V;
    const result = computeVision(input);
    expect(result[0][0]).toBe(R);
    expect(result[4][4]).toBe(H);
  });
});

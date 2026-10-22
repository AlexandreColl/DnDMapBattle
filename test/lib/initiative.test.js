import { describe, expect, it } from "vitest";
import {
  getInitiativeEntries,
  nextTurn,
  resolveCurrentTurn,
} from "../../public/js/lib/initiative.js";

const characters = [
  { id: 1, initiative: 12 },
  { id: 2, initiative: 18 },
  { id: 3, initiative: null },
  { id: 4, initiative: 0 },
];
const tokens = [1, 2, 3, 4].map((id) => ({
  id,
  characterId: id,
  row: 0,
  col: 0,
}));

describe("initiative order", () => {
  const entries = getInitiativeEntries(tokens, characters);

  it("sorts by initiative and skips characters without one", () => {
    expect(entries.map((e) => e.char.id)).toEqual([2, 1, 4]);
  });

  it("only includes characters that are on the board", () => {
    expect(getInitiativeEntries([tokens[0]], characters)).toHaveLength(1);
  });

  it("keeps the current turn when still valid, else starts from the top", () => {
    expect(resolveCurrentTurn(entries, 1)).toBe(1);
    expect(resolveCurrentTurn(entries, 3)).toBe(2);
    expect(resolveCurrentTurn([], 1)).toBe(null);
  });

  it("advances and wraps around", () => {
    expect(nextTurn(entries, 2)).toBe(1);
    expect(nextTurn(entries, 4)).toBe(2);
    expect(nextTurn(entries, null)).toBe(2);
  });
});

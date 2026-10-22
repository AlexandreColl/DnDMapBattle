import { describe, expect, it } from "vitest";
import {
  cssUrl,
  isSafeImageUrl,
  normalizeCharacter,
  normalizeToken,
  parseInitiative,
} from "../../public/js/lib/sanitize.js";
import {
  buildSaveData,
  parseCharactersFile,
  parseSaveFile,
} from "../../public/js/lib/save-file.js";

const IMG = "data:image/png;base64,AAAA";

describe("sanitize", () => {
  it("only accepts data:image and blob: URLs", () => {
    expect(isSafeImageUrl(IMG)).toBe(true);
    expect(isSafeImageUrl("blob:http://localhost/abc")).toBe(true);
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("https://evil.example/x.png")).toBe(false);
  });

  it("escapes quotes so a URL cannot break out of url()", () => {
    expect(cssUrl('a")b')).toBe('url("a\\22 )b")');
  });

  it("keeps initiative 0 and clamps out-of-range values", () => {
    expect(parseInitiative(0)).toBe(0);
    expect(parseInitiative("")).toBe(null);
    expect(parseInitiative("abc")).toBe(null);
    expect(parseInitiative(100000)).toBe(999);
  });

  it("normalizes characters and drops unsafe ones", () => {
    expect(
      normalizeCharacter({
        id: 3,
        name: " <b>x</b> ",
        imageUrl: IMG,
        initiative: 0,
      }),
    ).toEqual({
      id: 3,
      name: "<b>x</b>",
      imageUrl: IMG,
      visionRadius: 5,
      isEnemy: false,
      initiative: 0,
    });
    expect(normalizeCharacter({ id: 1, name: "x", imageUrl: "http://x" })).toBe(
      null,
    );
  });

  it("drops tokens outside the grid", () => {
    expect(
      normalizeToken({ id: 1, characterId: 1, row: 4, col: 0 }, 5, 5),
    ).not.toBe(null);
    expect(
      normalizeToken({ id: 1, characterId: 1, row: 5, col: 0 }, 5, 5),
    ).toBe(null);
  });
});

describe("save files", () => {
  it("round-trips a game", () => {
    const state = {
      gridRows: 1,
      gridCols: 2,
      cellStates: [["hidden", "revealed"]],
      wallCells: [[false, true]],
      characters: [
        { id: 1, name: "A", imageUrl: IMG, visionRadius: 3, initiative: 0 },
      ],
      tokens: [{ id: 1, characterId: 1, row: 0, col: 1, extra: "dropped" }],
      zoom: 1,
      panX: 0,
      panY: 0,
      mapDataURL: IMG,
    };
    const data = parseSaveFile(JSON.stringify(buildSaveData(state)));
    expect(data.characters[0].initiative).toBe(0);
    expect(data.tokens[0]).toEqual({ id: 1, characterId: 1, row: 0, col: 1 });
    expect(data.mapImage).toBe(IMG);
  });

  it("rejects files without a valid grid", () => {
    expect(() => parseSaveFile("{}")).toThrow("Formato no válido");
    expect(() => parseSaveFile('{"version":1,"gridRows":0}')).toThrow(
      "Tamaño de cuadrícula",
    );
  });

  it("re-numbers imported characters and skips invalid ones", () => {
    const text = JSON.stringify([
      { id: 99, name: "A", imageUrl: IMG },
      { id: 98, name: "B", imageUrl: "javascript:alert(1)" },
      { id: 97, name: "C", imageUrl: IMG },
    ]);
    expect(parseCharactersFile(text, 10).map((c) => [c.id, c.name])).toEqual([
      [10, "A"],
      [11, "C"],
    ]);
  });
});

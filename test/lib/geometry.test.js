import { describe, expect, it } from "vitest";
import {
  cellDistance,
  computeGridRect,
  fitMatrix,
  getLineCells,
  isSquareGrid,
  matrixMatches,
  rowsForSquareCells,
} from "../../public/js/lib/geometry.js";

describe("getLineCells", () => {
  it("includes both end points", () => {
    expect(getLineCells(0, 0, 0, 3)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ]);
  });

  it("walks diagonals one cell per step", () => {
    expect(getLineCells(2, 2, 0, 0)).toEqual([
      { row: 2, col: 2 },
      { row: 1, col: 1 },
      { row: 0, col: 0 },
    ]);
  });

  it("returns a single cell for a zero-length line", () => {
    expect(getLineCells(4, 4, 4, 4)).toEqual([{ row: 4, col: 4 }]);
  });
});

describe("grid sizing", () => {
  it("measures euclidean distance in cells", () => {
    expect(cellDistance({ row: 0, col: 0 }, { row: 3, col: 4 })).toBe(5);
  });

  it("derives rows that keep cells square", () => {
    expect(rowsForSquareCells(20, 2000, 1000)).toBe(10);
    expect(isSquareGrid(10, 20, 2000, 1000)).toBe(true);
    expect(isSquareGrid(15, 20, 2000, 1000)).toBe(false);
  });

  it("centers a square-celled grid on a contained image", () => {
    const rect = computeGridRect({
      containerWidth: 1000,
      containerHeight: 1000,
      imageWidth: 2000,
      imageHeight: 1000,
      rows: 10,
      cols: 20,
    });
    expect(rect).toEqual({ left: 0, top: 250, width: 1000, height: 500 });
  });
});

describe("matrices", () => {
  it("checks exact dimensions", () => {
    expect(matrixMatches([[1, 2]], 1, 2)).toBe(true);
    expect(matrixMatches([[1, 2]], 2, 1)).toBe(false);
    expect(matrixMatches(null, 0, 0)).toBe(false);
  });

  it("fits a partial or invalid matrix into the requested size", () => {
    const out = fitMatrix([[true, "x"], null], 2, 3, false, (v) => v === true);
    expect(out).toEqual([
      [true, false, false],
      [false, false, false],
    ]);
  });
});

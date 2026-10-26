import { describe, expect, it } from "vitest";
import { FOG_ALPHA, fogAlphas, stepTowards } from "../../public/js/lib/fog.js";

// Values are stored in a Float32Array, so compare at float32 precision.
const HIDDEN = Math.fround(FOG_ALPHA.hidden);

describe("fogAlphas", () => {
  it("pads the grid with a hidden border", () => {
    const alphas = fogAlphas([["visible", "revealed"]], 1, 2);
    expect(alphas).toHaveLength(3 * 4);
    // Row 0 and row 2 are the border; row 1 is [border, cell, cell, border].
    expect([...alphas.slice(0, 4)]).toEqual(Array(4).fill(HIDDEN));
    expect([...alphas.slice(4, 8)]).toEqual([HIDDEN, 0, 0, HIDDEN]);
    expect([...alphas.slice(8)]).toEqual(Array(4).fill(HIDDEN));
  });

  it("treats unknown or missing states as hidden", () => {
    const alphas = fogAlphas([["bogus"]], 2, 1);
    expect(alphas[1 * 3 + 1]).toBe(HIDDEN);
    expect(alphas[2 * 3 + 1]).toBe(HIDDEN);
  });
});

describe("stepTowards", () => {
  it("eases towards the target and reports when it arrives", () => {
    const current = new Float32Array([0, 1]);
    const target = new Float32Array([1, 1]);
    expect(stepTowards(current, target, 0.5)).toBe(false);
    expect(current[0]).toBeCloseTo(0.5);
    let steps = 0;
    while (!stepTowards(current, target, 0.5)) steps++;
    expect([...current]).toEqual([1, 1]);
    expect(steps).toBeLessThan(10);
  });
});

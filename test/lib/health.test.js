import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  adjustHp,
  characterHealth,
  healthLevel,
  normalizeConditions,
  normalizeHealth,
} from "../../public/js/lib/health.js";
import { HEALTH, LIMITS } from "../../public/js/shared/protocol.js";

describe("hit points", () => {
  it("has no hit points without a maximum", () => {
    expect(normalizeHealth(5, null)).toEqual({ hp: null, maxHp: null });
    expect(normalizeHealth(5, "")).toEqual({ hp: null, maxHp: null });
    expect(normalizeHealth(5, "abc")).toEqual({ hp: null, maxHp: null });
    // Found by fast-check: an object that cannot become text.
    expect(normalizeHealth(1, { toString: 1 })).toEqual({
      hp: null,
      maxHp: null,
    });
  });

  it("starts at the maximum and never goes above it", () => {
    expect(normalizeHealth(null, 20)).toEqual({ hp: 20, maxHp: 20 });
    expect(normalizeHealth("", "20")).toEqual({ hp: 20, maxHp: 20 });
    expect(normalizeHealth(35, 20)).toEqual({ hp: 20, maxHp: 20 });
    expect(normalizeHealth(-4, 20)).toEqual({ hp: 0, maxHp: 20 });
    expect(normalizeHealth(7.8, 0)).toEqual({ hp: 1, maxHp: 1 });
    expect(normalizeHealth(1, 1e9).maxHp).toBe(LIMITS.maxHp);
  });

  it("applies damage and healing within 0 and the maximum", () => {
    expect(adjustHp(10, 20, -4)).toBe(6);
    expect(adjustHp(3, 20, -10)).toBe(0);
    expect(adjustHp(18, 20, 10)).toBe(20);
    expect(adjustHp(null, 20, -5)).toBe(15);
    expect(adjustHp(null, null, -5)).toBeNull();
  });

  it("stays consistent whatever comes in", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (hp, maxHp) => {
        const health = normalizeHealth(hp, maxHp);
        if (health.maxHp == null) {
          expect(health.hp).toBeNull();
        } else {
          expect(Number.isInteger(health.hp)).toBe(true);
          expect(health.hp).toBeGreaterThanOrEqual(0);
          expect(health.hp).toBeLessThanOrEqual(health.maxHp);
          expect(health.maxHp).toBeLessThanOrEqual(LIMITS.maxHp);
        }
      }),
    );
  });
});

describe("health level", () => {
  it.each([
    [20, 20, HEALTH.UNHURT],
    [19, 20, HEALTH.HURT],
    [11, 20, HEALTH.HURT],
    [10, 20, HEALTH.BLOODIED],
    [1, 20, HEALTH.BLOODIED],
    [0, 20, HEALTH.DOWN],
    [null, null, null],
  ])("%s/%s is %s", (hp, maxHp, level) => {
    expect(healthLevel(hp, maxHp)).toBe(level);
  });

  it("uses the level the server sent when hit points are hidden", () => {
    expect(characterHealth({ hp: 3, maxHp: 20, health: "unhurt" })).toBe(
      HEALTH.BLOODIED,
    );
    expect(characterHealth({ hp: null, maxHp: null, health: "hurt" })).toBe(
      HEALTH.HURT,
    );
    expect(characterHealth({ health: "<img>" })).toBeNull();
  });
});

describe("conditions", () => {
  it("keeps known conditions once, in a fixed order", () => {
    expect(
      normalizeConditions(["prone", "poisoned", "prone", "flying", 3]),
    ).toEqual(["poisoned", "prone"]);
    expect(normalizeConditions("prone")).toEqual([]);
  });
});

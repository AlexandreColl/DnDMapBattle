import { describe, expect, it } from "vitest";
import {
  extractReleaseNotes,
  releaseNotes,
} from "../../scripts/release-notes.js";

const CHANGELOG = `# Changelog

## [Sin publicar]

### Añadido

- Something new.

## [1.1.0] - 2026-10-26

### Cambiado

- Touch support.

### Seguridad

- Pinned actions.

## [1.0.0] - 2026-10-22

Primera versión estable.

[Sin publicar]: https://example.com/compare/v1.1.0...HEAD
[1.1.0]: https://example.com/compare/v1.0.0...v1.1.0
`;

describe("extractReleaseNotes", () => {
  it("returns the body of a section, up to the next one", () => {
    expect(extractReleaseNotes(CHANGELOG, "1.1.0")).toBe(
      "### Cambiado\n\n- Touch support.\n\n### Seguridad\n\n- Pinned actions.",
    );
  });

  it("stops at the link references after the last section", () => {
    expect(extractReleaseNotes(CHANGELOG, "1.0.0")).toBe(
      "Primera versión estable.",
    );
  });

  it("does not match a version that is only a prefix of another", () => {
    expect(extractReleaseNotes(CHANGELOG, "1.1")).toBeNull();
  });

  it("returns null for a missing or empty section", () => {
    expect(extractReleaseNotes(CHANGELOG, "2.0.0")).toBeNull();
    expect(extractReleaseNotes("## [3.0.0]\n\n## [2.0.0]", "3.0.0")).toBeNull();
  });

  it("handles Windows line endings", () => {
    const crlf = CHANGELOG.replaceAll("\n", "\r\n");
    expect(extractReleaseNotes(crlf, "1.0.0")).toBe("Primera versión estable.");
  });
});

describe("releaseNotes", () => {
  const sources = { changelog: CHANGELOG, packageVersion: "1.1.0" };

  it("accepts the tag with or without the v prefix", () => {
    expect(releaseNotes("v1.1.0", sources)).toMatch(/^### Cambiado/);
    expect(releaseNotes("1.1.0", sources)).toMatch(/^### Cambiado/);
  });

  it("rejects a tag that does not match package.json", () => {
    expect(() => releaseNotes("v1.2.0", sources)).toThrow(/package.json/);
    expect(() => releaseNotes("", sources)).toThrow(/vacía/);
  });

  it("rejects a version without a CHANGELOG section", () => {
    const missing = { changelog: CHANGELOG, packageVersion: "2.0.0" };
    expect(() => releaseNotes("v2.0.0", missing)).toThrow(/CHANGELOG/);
  });
});

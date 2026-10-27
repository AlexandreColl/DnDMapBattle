// Release notes for a version, taken from its CHANGELOG.md section.
// Usage: node scripts/release-notes.js <version>  (e.g. 1.2.0 or v1.2.0)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Body of the "## [version]" section of a Keep a Changelog file, or null.
 * @param {string} changelog
 * @param {string} version
 * @returns {string | null}
 */
export function extractReleaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const heading = `## [${version}]`;
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1) return null;
  const end = lines.findIndex(
    (line, i) =>
      i > start && (line.startsWith("## ") || /^\[.+\]: /.test(line)),
  );
  const body = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
  return body || null;
}

/**
 * Notes for a tag such as "v1.2.0". Throws if the tag does not match the
 * package version or the CHANGELOG has no section for it.
 * @param {string} tag
 * @param {{ changelog: string, packageVersion: string }} sources
 * @returns {string}
 */
export function releaseNotes(tag, { changelog, packageVersion }) {
  const version = tag.replace(/^v/, "");
  if (version !== packageVersion) {
    throw new Error(
      `La versión ${version || "(vacía)"} no coincide con package.json (${packageVersion}).`,
    );
  }
  const notes = extractReleaseNotes(changelog, version);
  if (!notes) {
    throw new Error(`CHANGELOG.md no tiene una sección «## [${version}]».`);
  }
  return notes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const sources = {
      changelog: readFileSync("CHANGELOG.md", "utf8"),
      packageVersion: JSON.parse(readFileSync("package.json", "utf8")).version,
    };
    console.log(releaseNotes(process.argv[2] ?? "", sources));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

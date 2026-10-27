// Checks a PR's title and commits against the commit convention.
// Run by .github/workflows/pr-format.yml with PR_TITLE, BASE_SHA and HEAD_SHA.
import { execFileSync } from "node:child_process";
import { formatError } from "./commit-format.js";

const { PR_TITLE = "", BASE_SHA, HEAD_SHA } = process.env;
const problems = [];

const titleError = formatError(PR_TITLE);
if (titleError) problems.push(`Título del PR «${PR_TITLE}»: ${titleError}`);

if (BASE_SHA && HEAD_SHA) {
  // Merge commits (e.g. updating the branch from GitHub) are not checked.
  const log = execFileSync(
    "git",
    ["log", "--no-merges", "--format=%h %s", `${BASE_SHA}..${HEAD_SHA}`],
    { encoding: "utf8" },
  );
  for (const line of log.split("\n").filter(Boolean)) {
    const [sha, ...rest] = line.split(" ");
    const subject = rest.join(" ");
    const error = formatError(subject);
    if (error) problems.push(`Commit ${sha} «${subject}»: ${error}`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  console.error("\nFormato: <emoji> tipo(ámbito): descripción (README).");
  process.exit(1);
}
console.log("✓ Título y commits siguen el formato.");

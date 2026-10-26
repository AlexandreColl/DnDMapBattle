// Automated accessibility checks (axe) on the main screens.
import AxeBuilder from "@axe-core/playwright";
import { addCharacter, expect, generateGrid, test } from "./fixtures.js";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function violations(page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target).join(", ")})`,
  );
}

test("the empty table has no accessibility violations", async ({
  openPlayer,
}) => {
  const page = await openPlayer();
  expect(await violations(page)).toEqual([]);
  await page.locator('[data-panel="setup"]').click();
  expect(await violations(page)).toEqual([]);
});

test("a game in progress has no accessibility violations", async ({
  openPlayer,
}) => {
  const page = await openPlayer();
  await generateGrid(page, 5, 5);
  await addCharacter(page, { name: "Aria", initiative: 10 });
  expect(await violations(page)).toEqual([]);
});

test("the character editor has no accessibility violations", async ({
  openPlayer,
}) => {
  const page = await openPlayer();
  await page.locator('[data-panel="play"]').click();
  await page.locator("#char-add").click();
  await expect(page.locator("#token-editor")).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

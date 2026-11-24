// Hit points and conditions: exact for the DM and allies, vague for enemies.
import AxeBuilder from "@axe-core/playwright";
import {
  addCharacter,
  cell,
  dragTo,
  expect,
  generateGrid,
  test,
} from "./fixtures.js";

/** Aria (30 HP) at 2,1 sees the Orco (20 HP) at 2,3. */
async function setUpTable(dm) {
  await generateGrid(dm, 5, 8);
  await addCharacter(dm, { name: "Aria", vision: 4, maxHp: 30 });
  await addCharacter(dm, { name: "Orco", enemy: true, maxHp: 20 });
  for (const [name, col] of [
    ["Aria", 1],
    ["Orco", 3],
  ]) {
    await dragTo(
      dm,
      dm.locator(".char-item", { hasText: name }),
      cell(dm, 2, col),
    );
  }
}

const token = (page, name) =>
  page.locator(`.token[data-char-id="${name === "Aria" ? 1 : 2}"]`);

async function hurt(page, name, amount) {
  await token(page, name).click();
  await page.locator("#token-menu-amount").fill(String(amount));
  await page.locator("#token-menu-damage").click();
}

test("the DM tracks hit points; players only see how hurt enemies look", async ({
  openDm,
  openPlayer,
}) => {
  const dm = await openDm();
  const player = await openPlayer();
  await setUpTable(dm);

  await hurt(dm, "Orco", 12);
  await expect(dm.locator("#token-menu-hp")).toHaveValue("8");
  await expect(token(dm, "Orco")).toHaveAttribute("title", /8\/20 PG/);
  await dm.getByRole("button", { name: "Derribado" }).click();
  await expect(dm.getByRole("button", { name: "Derribado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const { violations } = await new AxeBuilder({ page: dm })
    .include("#token-menu")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  // The player sees a bloodied, prone Orco, but not its numbers.
  await expect(token(player, "Orco").locator(".token-hp")).toHaveClass(
    /bloodied/,
  );
  await expect(token(player, "Orco")).toHaveAttribute(
    "title",
    "Orco · Malherido · Derribado",
  );
  await token(player, "Orco").click();
  await expect(player.locator("#token-menu-health")).toHaveText("Malherido");
  await expect(player.locator("#token-menu-hp-edit")).toBeHidden();
  await expect(player.locator("#token-menu-hp-adjust")).toBeHidden();
  await expect(player.getByRole("button", { name: "Derribado" })).toHaveCount(
    0,
  );

  // A player looks after their own ally, and the DM sees it.
  await hurt(player, "Aria", 5);
  await expect(token(dm, "Aria")).toHaveAttribute("title", /25\/30 PG/);

  // At 0 the Orco stays on the map, marked as down.
  await hurt(dm, "Orco", 50);
  await expect(token(player, "Orco")).toHaveClass(/down/);
});

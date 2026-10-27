// DM and player roles: what each one sees and can do.
import AxeBuilder from "@axe-core/playwright";
import {
  addCharacter,
  cell,
  dragTo,
  expect,
  generateGrid,
  test,
} from "./fixtures.js";

/** A 5×8 table: Aria (sees 2 cells) at 2,1 and an Orco far away at 2,6. */
async function setUpTable(dm) {
  await generateGrid(dm, 5, 8);
  await addCharacter(dm, { name: "Aria", vision: 2 });
  await addCharacter(dm, { name: "Orco", enemy: true, initiative: 15 });
  await dragTo(
    dm,
    dm.locator(".char-item", { hasText: "Aria" }),
    cell(dm, 2, 1),
  );
  await dragTo(
    dm,
    dm.locator(".char-item", { hasText: "Orco" }),
    cell(dm, 2, 6),
  );
}

test("players get a reduced interface", async ({ openDm, openPlayer }) => {
  const dm = await openDm();
  const player = await openPlayer();

  await expect(dm.locator("#role-badge")).toHaveText("Máster");
  await expect(player.locator("#role-badge")).toHaveText("Jugador");

  // Both on the play panel, where the DM-only buttons live.
  await dm.locator('[data-panel="play"]').click();
  for (const selector of [
    '#toolbar [data-tool="reveal"]',
    '#toolbar [data-tool="walls"]',
    '[data-panel="setup"]',
    "#char-add",
    "#turn-start",
    "#center-all",
  ]) {
    await expect(dm.locator(selector)).toBeVisible();
    await expect(player.locator(selector)).toBeHidden();
  }
  await expect(player.locator(".empty-title:visible")).toHaveText(
    "Esperando al máster",
  );

  // Shortcuts for DM tools do nothing for a player.
  await player.keyboard.press("w");
  await expect(player.locator('#toolbar [data-tool="move"]')).toHaveClass(
    /active/,
  );
});

test("the DM sees how many players are connected", async ({
  openDm,
  openPlayer,
}) => {
  const dm = await openDm();
  await expect(dm.locator("#presence-text")).toHaveText("Ningún jugador");
  const player = await openPlayer();
  await expect(dm.locator("#presence-text")).toHaveText("1 jugador");
  await player.close();
  await expect(dm.locator("#presence-text")).toHaveText("Ningún jugador");
});

test("enemies in the fog are hidden from players, not from the DM", async ({
  openDm,
  openPlayer,
}) => {
  const dm = await openDm();
  const player = await openPlayer();
  await setUpTable(dm);

  // The DM sees the Orco and knows players cannot.
  await expect(cell(dm, 2, 6).locator(".token")).toBeVisible();
  await expect(
    dm.locator(".char-item", { hasText: "Orco" }).locator(".hidden-mark"),
  ).toBeVisible();

  // The player does not even receive it.
  await expect(cell(player, 2, 1).locator(".token")).toBeVisible();
  await expect(player.locator(".token")).toHaveCount(1);
  await expect(player.locator(".char-item", { hasText: "Orco" })).toHaveCount(
    0,
  );

  // Once it walks into sight, it shows up for the player, without initiative.
  await dragTo(dm, cell(dm, 2, 6).locator(".token"), cell(dm, 2, 3));
  await expect(cell(player, 2, 3).locator(".token")).toBeVisible();
  const orco = player.locator(".char-item", { hasText: "Orco" });
  await expect(orco).toBeVisible();
  await expect(orco.locator(".char-initiative")).toBeHidden();
  await expect(player.locator("#enemies-title")).toHaveText("A la vista");
});

test("players move allies but not enemies", async ({ openDm, openPlayer }) => {
  const dm = await openDm();
  const player = await openPlayer();
  await setUpTable(dm);
  await dragTo(dm, cell(dm, 2, 6).locator(".token"), cell(dm, 2, 2));
  await expect(cell(player, 2, 2).locator(".token")).toBeVisible();

  // Moving Aria reaches the DM.
  await dragTo(
    player,
    cell(player, 2, 1).locator(".token"),
    cell(player, 3, 1),
  );
  await expect(cell(dm, 3, 1).locator(".token")).toBeVisible();

  // Dragging the Orco does nothing.
  await dragTo(
    player,
    cell(player, 2, 2).locator(".token"),
    cell(player, 4, 4),
  );
  await expect(cell(player, 2, 2).locator(".token")).toBeVisible();
  await expect(cell(dm, 2, 2).locator(".token")).toBeVisible();
});

test("the DM centers every player on their view", async ({
  openDm,
  openPlayer,
}) => {
  const dm = await openDm();
  const player = await openPlayer();
  await generateGrid(dm, 6, 6);

  // Each device zooms on its own.
  await dm.locator("#zoom-in").click();
  await expect(dm.locator("#zoom-reset")).toHaveText("120%");
  await expect(player.locator("#zoom-reset")).toHaveText("100%");

  await dm.locator('[data-panel="play"]').click();
  await dm.locator("#center-all").click();
  await expect(player.locator(".toast")).toContainText(
    "El máster te ha llevado a su vista",
  );
  await expect(player.locator("#zoom-reset")).not.toHaveText("100%");
});

test("the player view has no accessibility violations", async ({
  openDm,
  openPlayer,
}) => {
  const dm = await openDm();
  const player = await openPlayer();
  await setUpTable(dm);
  await expect(player.locator(".token")).toHaveCount(1);
  const { violations } = await new AxeBuilder({ page: player })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

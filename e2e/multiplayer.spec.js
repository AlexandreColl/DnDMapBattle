// Two players at the same table: every change must reach the other one.
import {
  addCharacter,
  cell,
  dragTo,
  expect,
  generateGrid,
  test,
} from "./fixtures.js";

test("grid, characters and tokens are shared between players", async ({
  openPlayer,
}) => {
  const dm = await openPlayer();
  const player = await openPlayer();

  await generateGrid(dm, 6, 8);
  await expect(player.locator(".grid-cell")).toHaveCount(48);

  await addCharacter(dm, { name: "Aria" });
  await player.locator('[data-panel="play"]').click();
  await expect(player.locator(".char-item", { hasText: "Aria" })).toBeVisible();

  await dragTo(
    dm,
    dm.locator(".char-item", { hasText: "Aria" }),
    cell(dm, 2, 3),
  );
  await expect(cell(player, 2, 3).locator(".token")).toBeVisible();

  // Moving the token on the board moves it for everyone.
  await dragTo(dm, cell(dm, 2, 3).locator(".token"), cell(dm, 4, 6));
  await expect(cell(player, 4, 6).locator(".token")).toBeVisible();
  await expect(cell(player, 2, 3).locator(".token")).toHaveCount(0);
});

test("the token menu removes a token from the map", async ({ openPlayer }) => {
  const dm = await openPlayer();
  const player = await openPlayer();
  await generateGrid(dm, 5, 5);
  await addCharacter(dm, { name: "Orco", enemy: true });
  await dragTo(
    dm,
    dm.locator(".char-item", { hasText: "Orco" }),
    cell(dm, 1, 1),
  );
  await expect(player.locator(".token")).toHaveCount(1);

  await cell(dm, 1, 1).locator(".token").click();
  await expect(dm.locator("#token-menu")).toBeVisible();
  await dm.locator("#token-menu-remove").click();

  await expect(dm.locator(".token")).toHaveCount(0);
  await expect(player.locator(".token")).toHaveCount(0);
  // The character stays in the roster, dimmed.
  await expect(dm.locator(".char-item.off-board")).toHaveCount(1);
});

test("walls painted by one player reach the other", async ({ openPlayer }) => {
  const dm = await openPlayer();
  const player = await openPlayer();
  await generateGrid(dm, 5, 5);

  await dm.keyboard.press("w");
  await dragTo(dm, cell(dm, 0, 0), cell(dm, 0, 3));

  await player.keyboard.press("w");
  await expect(player.locator(".grid-cell.wall-cell")).toHaveCount(4);
});

test("turns follow initiative and sync", async ({ openPlayer }) => {
  const dm = await openPlayer();
  const player = await openPlayer();
  await generateGrid(dm, 5, 5);
  await addCharacter(dm, { name: "Aria", initiative: 12 });
  await addCharacter(dm, { name: "Orco", enemy: true, initiative: 18 });
  await dragTo(
    dm,
    dm.locator(".char-item", { hasText: "Aria" }),
    cell(dm, 1, 1),
  );
  await dragTo(
    dm,
    dm.locator(".char-item", { hasText: "Orco" }),
    cell(dm, 3, 3),
  );

  await dm.locator("#turn-start").click();
  await expect(dm.locator("#turn-display")).toHaveText("Orco");
  await player.locator('[data-panel="play"]').click();
  await expect(player.locator("#turn-display")).toHaveText("Orco");

  await dm.keyboard.press("n");
  await expect(player.locator("#turn-display")).toHaveText("Aria");
});

test("measuring shows the distance between two cells", async ({
  openPlayer,
}) => {
  const dm = await openPlayer();
  await generateGrid(dm, 6, 6);
  await dm.keyboard.press("m");
  await cell(dm, 0, 0).click();
  await cell(dm, 0, 4).click();
  await expect(dm.locator("#measure-label")).toHaveText("4.0 casillas");
});

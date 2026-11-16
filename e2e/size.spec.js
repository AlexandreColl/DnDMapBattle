// Large creatures: tokens that cover several cells.
import {
  addCharacter,
  cell,
  dragTo,
  expect,
  generateGrid,
  test,
} from "./fixtures.js";

/** Width of a token measured in cells. */
async function widthInCells(page, charId) {
  const token = await page
    .locator(`.token[data-char-id="${charId}"]`)
    .boundingBox();
  const one = await cell(page, 0, 0).boundingBox();
  return Math.round(token.width / one.width);
}

test("a large enemy covers several cells and shows when any is in sight", async ({
  openDm,
  openPlayer,
}) => {
  const dm = await openDm();
  const player = await openPlayer();
  await generateGrid(dm, 5, 8);
  await addCharacter(dm, { name: "Aria", vision: 2 });
  await addCharacter(dm, { name: "Ogro", enemy: true, size: 2 });
  await dragTo(
    dm,
    dm.locator(".char-item", { hasText: "Aria" }),
    cell(dm, 2, 1),
  );
  await dragTo(
    dm,
    dm.locator(".char-item", { hasText: "Ogro" }),
    cell(dm, 2, 5),
  );

  // The 2×2 ogre covers rows 2-3 and columns 5-6, out of Aria's sight.
  await expect(cell(dm, 2, 5).locator(".token")).toHaveCount(1);
  expect(await widthInCells(dm, 2)).toBe(2);
  await expect(player.locator('.token[data-char-id="2"]')).toHaveCount(0);

  // Aria walks to column 3 and sees column 5, the ogre's first column.
  await dragTo(
    player,
    player.locator('.token[data-char-id="1"]'),
    cell(player, 2, 3),
  );
  await expect(player.locator('.token[data-char-id="2"]')).toHaveCount(1);
  expect(await widthInCells(player, 2)).toBe(2);

  // Grown to 3×3 it still fits, from the same corner.
  await dm.locator('.token[data-char-id="2"]').click();
  await dm.locator("#token-menu-size").selectOption("3");
  await expect(cell(dm, 2, 5).locator(".token")).toHaveCount(1);
  expect(await widthInCells(dm, 2)).toBe(3);
  await expect(player.locator("#token-menu-size")).toBeHidden();

  // 4×4 does not fit in 5 rows from row 2: it moves up to row 1.
  await dm.locator("#token-menu-size").selectOption("4");
  await expect(cell(dm, 1, 4).locator(".token")).toHaveCount(1);
  expect(await widthInCells(dm, 2)).toBe(4);
});

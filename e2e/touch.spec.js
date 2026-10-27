// Touch input on a tablet, with real touch events sent through CDP.
import { addCharacter, cell, expect, generateGrid, test } from "./fixtures.js";

const tablet = { viewport: { width: 1024, height: 768 }, hasTouch: true };

async function center(locator) {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Sends a touch gesture: each step is a list of finger positions. */
async function touchGesture(page, steps, { holdMs = 0 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const points = (fingers) => fingers.map((p, id) => ({ ...p, id }));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: points(steps[0]),
  });
  if (holdMs) await page.waitForTimeout(holdMs);
  for (const fingers of steps.slice(1)) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: points(fingers),
    });
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

/** One finger moving from `from` to `to` in small steps. */
function path(from, to, count = 8) {
  return Array.from({ length: count + 1 }, (_, i) => [
    {
      x: from.x + ((to.x - from.x) * i) / count,
      y: from.y + ((to.y - from.y) * i) / count,
    },
  ]);
}

test.describe("touch", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "uses CDP");

  test("long press on the roster drags a character onto the map", async ({
    openDm,
  }) => {
    const page = await openDm(tablet);
    await generateGrid(page, 5, 5);
    await addCharacter(page, { name: "Aria" });
    const from = await center(page.locator(".char-item", { hasText: "Aria" }));
    const to = await center(cell(page, 2, 3));

    // A quick swipe scrolls the list instead of dragging.
    await touchGesture(page, path(from, to));
    await expect(page.locator(".token")).toHaveCount(0);

    await touchGesture(page, path(from, to), { holdMs: 500 });
    await expect(cell(page, 2, 3).locator(".token")).toBeVisible();
  });

  test("one finger pans and two fingers pinch to zoom", async ({ openDm }) => {
    const page = await openDm(tablet);
    await generateGrid(page, 5, 5);
    const zoom = page.locator("#zoom-reset");
    const start = await center(cell(page, 2, 2));

    await touchGesture(page, path(start, { x: start.x + 60, y: start.y + 40 }));
    await expect(page.locator("#map-wrapper")).toHaveAttribute(
      "style",
      /translate\(60px, 40px\)/,
    );
    await expect(zoom).toHaveText("100%");

    // Fingers 80px apart that end 160px apart: twice the zoom.
    const pinch = Array.from({ length: 9 }, (_, i) => [
      { x: start.x - 40 - i * 5, y: start.y },
      { x: start.x + 40 + i * 5, y: start.y },
    ]);
    await touchGesture(page, pinch);
    await expect(zoom).toHaveText("200%");
  });

  test("dragging a finger paints walls", async ({ openDm }) => {
    const page = await openDm(tablet);
    await generateGrid(page, 5, 5);
    await page.keyboard.press("w");
    await touchGesture(
      page,
      path(await center(cell(page, 1, 1)), await center(cell(page, 1, 4))),
    );
    await expect(page.locator(".grid-cell.wall-cell")).toHaveCount(4);
  });
});

// Shared fixtures: a fresh game server per test and helpers to drive the UI.
import { test as base, expect } from "@playwright/test";
import { createApp } from "../server/app.js";

// 1×1 PNG, enough for maps and token images.
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

// The DM key of the test servers; pages opened with it are DMs.
export const DM_KEY = "TEST-DM-KEY";

/**
 * @typedef {import("@playwright/test").Page} Page
 * @typedef {(
 *   options?: import("@playwright/test").BrowserContextOptions,
 * ) => Promise<Page>} OpenPage
 * @typedef {{
 *   serverUrl: string,
 *   openPage: (role: "dm" | "player", options?: import("@playwright/test").BrowserContextOptions) => Promise<Page>,
 *   openDm: OpenPage,
 *   openPlayer: OpenPage,
 * }} GameFixtures
 */

/**
 * @typedef {import("@playwright/test").PlaywrightTestArgs &
 *   import("@playwright/test").PlaywrightTestOptions} TestArgs
 * @typedef {import("@playwright/test").PlaywrightWorkerArgs &
 *   import("@playwright/test").PlaywrightWorkerOptions} WorkerArgs
 * @type {import("@playwright/test").TestType<TestArgs & GameFixtures, WorkerArgs>}
 */
export const test = base.extend({
  // A server with an empty game, so tests never share state.
  // eslint-disable-next-line no-empty-pattern -- Playwright requires it
  serverUrl: async ({}, use) => {
    const { server, io } = createApp({ logger: { warn() {} }, dmKey: DM_KEY });
    await new Promise((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve(undefined)),
    );
    const { port } = /** @type {import("node:net").AddressInfo} */ (
      server.address()
    );
    await use(`http://127.0.0.1:${port}`);
    await new Promise((resolve) => io.close(resolve));
  },

  // Opens the game in a new browser context, as DM (with the key in the
  // link) or as a player. The test fails if any page throws an uncaught error.
  openPage: async ({ browser, serverUrl }, use) => {
    const contexts = [];
    const errors = [];
    await use(async (role, options = {}) => {
      const context = await browser.newContext(options);
      contexts.push(context);
      const page = await context.newPage();
      page.on("pageerror", (err) => errors.push(err.message));
      await page.goto(role === "dm" ? `${serverUrl}/#dm=${DM_KEY}` : serverUrl);
      await expect(page.locator("body")).toHaveAttribute("data-role", role);
      return page;
    });
    await Promise.all(contexts.map((c) => c.close()));
    expect(errors, "uncaught errors in the page").toEqual([]);
  },
  openDm: async ({ openPage }, use) => {
    await use((options) => openPage("dm", options));
  },
  openPlayer: async ({ openPage }, use) => {
    await use((options) => openPage("player", options));
  },
});

export { expect };

export function cell(page, row, col) {
  return page.locator(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
}

export async function generateGrid(page, rows, cols) {
  await page.locator('[data-panel="setup"]').click();
  await page.locator("#grid-rows").fill(String(rows));
  await page.locator("#grid-cols").fill(String(cols));
  await page.locator("#grid-generate").click();
  await expect(page.locator(".grid-cell")).toHaveCount(rows * cols);
}

/**
 * Creates a character through the editor dialog.
 * @param {Page} page
 * @param {{ name: string, enemy?: boolean, initiative?: number, vision?: number }} character
 */
export async function addCharacter(
  page,
  { name, enemy = false, initiative, vision },
) {
  await page.locator('[data-panel="play"]').click();
  await page.locator("#char-add").click();
  await page.locator("#char-upload").setInputFiles({
    name: "token.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.locator("#editor-drop")).toHaveClass(/has-image/);
  await page.locator("#char-name").fill(name);
  if (enemy) await page.locator('#editor-side [data-enemy="true"]').click();
  if (vision != null) await page.locator("#editor-vision").fill(String(vision));
  if (initiative != null) {
    await page.locator("#editor-initiative").fill(String(initiative));
  }
  await page.locator("#editor-confirm").click();
  await expect(page.locator(".char-item", { hasText: name })).toBeVisible();
}

/** Drags with real mouse events, in small steps like a person would. */
export async function dragTo(page, source, target) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
}

// Interface language: chosen per device, from the selector or the browser.
import { addCharacter, expect, generateGrid, test } from "./fixtures.js";

test("the DM switches to English and then Catalan, and it is remembered", async ({
  openDm,
}) => {
  const dm = await openDm();
  await generateGrid(dm, 3, 3);
  await addCharacter(dm, { name: "Aria" });
  await expect(dm.locator("#sidebar h1")).toHaveText("Mesa de batalla");

  await dm.locator("#language-select").selectOption("en");
  await expect(dm.locator("html")).toHaveAttribute("lang", "en");
  await expect(dm.locator("#sidebar h1")).toHaveText("Battle table");
  await expect(dm.locator("#role-badge")).toHaveText("DM");
  await expect(dm.locator("#turn-sub")).toHaveText(
    "Place tokens with initiative",
  );
  // The board comes back from the server after the reload.
  await expect(dm.locator(".char-item", { hasText: "Aria" })).toBeVisible();

  await dm.reload();
  await expect(dm.locator("#language-select")).toHaveValue("en");

  await dm.locator("#language-select").selectOption("ca");
  await expect(dm.locator("#sidebar h1")).toHaveText("Taula de batalla");
  await expect(dm.locator("#role-badge")).toHaveText("Màster");
  await expect(dm.locator('[data-panel="setup"]')).toHaveText("Preparar");
  await expect(dm.locator("#char-add")).toHaveText("Nova fitxa");
});

test("a player gets the browser's language until they pick another", async ({
  openPlayer,
}) => {
  const player = await openPlayer({ locale: "ca-ES" });
  await expect(player.locator("html")).toHaveAttribute("lang", "ca");
  await expect(player.locator("#role-badge")).toHaveText("Jugador");
  await expect(player.locator(".empty-title:visible")).toHaveText(
    "Esperant el màster",
  );

  const english = await openPlayer({ locale: "en-GB" });
  await expect(english.locator(".empty-title:visible")).toHaveText(
    "Waiting for the DM",
  );
  await expect(english.locator("#language-select")).toHaveValue("en");
});

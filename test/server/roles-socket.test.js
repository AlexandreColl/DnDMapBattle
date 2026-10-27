import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as connect } from "socket.io-client";
import { CELL, EVENTS, ROLES } from "../../public/js/shared/protocol.js";
import { createApp } from "../../server/app.js";

const IMG = "data:image/png;base64,AAAA";
const DM_KEY = "TEST-KEY1";
const H = CELL.HIDDEN;

let server;
let url;
const clients = [];

function once(socket, event, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout: ${event}`)),
      timeout,
    );
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/** Resolves true if `event` arrives within `ms`, false otherwise. */
function arrives(socket, event, ms = 150) {
  return once(socket, event, ms).then(
    () => true,
    () => false,
  );
}

async function join(dmKey) {
  const socket = connect(url, {
    transports: ["websocket"],
    forceNew: true,
    auth: dmKey ? { dmKey } : {},
  });
  clients.push(socket);
  const [session, state] = await Promise.all([
    once(socket, EVENTS.SESSION),
    once(socket, EVENTS.STATE_FULL),
  ]);
  return { socket, role: session.role, state };
}

/** 1×6 corridor: an ally at col 0 that sees 2 cells, enemies at 1 and 5. */
async function setUpTable(dm) {
  dm.socket.emit(EVENTS.STATE_FULL, {
    mapImage: null,
    gridRows: 1,
    gridCols: 6,
    cellStates: [[H, H, H, H, H, H]],
    wallCells: [[false, false, false, false, false, false]],
    characters: [
      { id: 1, name: "Aria", imageUrl: IMG, visionRadius: 2 },
      { id: 2, name: "Orco", imageUrl: IMG, isEnemy: true, initiative: 15 },
      { id: 3, name: "Chamán", imageUrl: IMG, isEnemy: true },
    ],
    tokens: [
      { id: 1, characterId: 1, row: 0, col: 0 },
      { id: 2, characterId: 2, row: 0, col: 1 },
      { id: 3, characterId: 3, row: 0, col: 5 },
    ],
    nextCharId: 4,
    nextTokenId: 4,
  });
}

const move = (characterId, col) => ({
  characterId,
  row: 0,
  col,
  token: { id: characterId, characterId, row: 0, col },
  nextTokenId: 4,
});

beforeEach(async () => {
  ({ server } = createApp({ logger: { warn() {} }, dmKey: DM_KEY }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  clients.splice(0).forEach((s) => s.disconnect());
  await new Promise((resolve) => server.close(resolve));
});

describe("roles", () => {
  it("makes the DM key holder DM and everyone else a player", async () => {
    expect((await join(DM_KEY)).role).toBe(ROLES.DM);
    expect((await join()).role).toBe(ROLES.PLAYER);
    expect((await join("WRONG-KEY")).role).toBe(ROLES.PLAYER);
  });

  it("tells the DMs how many players are connected", async () => {
    const dm = await join(DM_KEY);
    const presence = once(dm.socket, EVENTS.PRESENCE);
    await join();
    expect(await presence).toEqual({ dms: 1, players: 1 });
  });

  it("sends players a snapshot without hidden enemies or walls", async () => {
    const dm = await join(DM_KEY);
    await setUpTable(dm);
    await once(dm.socket, EVENTS.PRESENCE).catch(() => {});
    const player = await join();
    const names = player.state.characters.map((c) => c.name);
    expect(names).toEqual(["Aria", "Orco"]);
    expect(player.state.tokens).toHaveLength(2);
    expect(player.state.wallCells).toEqual([]);
    expect(player.state.characters[1].initiative).toBeNull();
  });

  it("hides an enemy that walks into the fog", async () => {
    const dm = await join(DM_KEY);
    await setUpTable(dm);
    const player = await join();

    const view = once(player.socket, EVENTS.PLAYER_VIEW);
    dm.socket.emit(EVENTS.TOKEN_PLACED, move(2, 4));
    const { characters, tokens } = await view;
    expect(characters.map((c) => c.name)).toEqual(["Aria"]);
    expect(tokens.map((t) => t.characterId)).toEqual([1]);
  });

  it("lets a player move an ally, and the DM sees it", async () => {
    const dm = await join(DM_KEY);
    await setUpTable(dm);
    const player = await join();

    const seenByDm = once(dm.socket, EVENTS.TOKEN_PLACED);
    const view = once(player.socket, EVENTS.PLAYER_VIEW);
    player.socket.emit(EVENTS.TOKEN_PLACED, move(1, 3));
    expect(await seenByDm).toMatchObject({ characterId: 1, col: 3 });
    // The server recomputes the fog: now the Chamán at col 5 is in sight.
    const { characters } = await view;
    expect(characters.map((c) => c.name)).toContain("Chamán");
  });

  it("rejects a player moving an enemy and restores their board", async () => {
    const dm = await join(DM_KEY);
    await setUpTable(dm);
    const player = await join();

    const dmNotified = arrives(dm.socket, EVENTS.TOKEN_PLACED);
    const restored = once(player.socket, EVENTS.STATE_FULL);
    player.socket.emit(EVENTS.TOKEN_PLACED, move(2, 0));
    expect(await dmNotified).toBe(false);
    const { tokens } = await restored;
    expect(tokens.find((t) => t.characterId === 2).col).toBe(1);
  });

  it("rejects DM-only events from players", async () => {
    const dm = await join(DM_KEY);
    await setUpTable(dm);
    const player = await join();

    const dmNotified = arrives(dm.socket, EVENTS.WALLS_SET);
    player.socket.emit(EVENTS.WALLS_SET, {
      wallCells: [[true, true, true, true, true, true]],
    });
    expect(await dmNotified).toBe(false);
  });

  it("sends portraits once, then only the rest of each character", async () => {
    const dm = await join(DM_KEY);
    await setUpTable(dm);
    const player = await join();
    expect(player.state.characters[0].imageUrl).toBe(IMG);

    const view = once(player.socket, EVENTS.PLAYER_VIEW);
    dm.socket.emit(EVENTS.INITIATIVE_CHANGED, { charId: 1, initiative: 7 });
    const aria = (await view).characters[0];
    expect(aria).toMatchObject({ name: "Aria", initiative: 7 });
    expect(aria.imageUrl).toBeUndefined();
  });

  it("resends the portrait of an enemy that comes back from the fog", async () => {
    const dm = await join(DM_KEY);
    await setUpTable(dm);
    const player = await join();

    const hidden = once(player.socket, EVENTS.PLAYER_VIEW);
    dm.socket.emit(EVENTS.TOKEN_PLACED, move(2, 4));
    await hidden;
    const back = once(player.socket, EVENTS.PLAYER_VIEW);
    dm.socket.emit(EVENTS.TOKEN_PLACED, move(2, 2));
    const orco = (await back).characters.find((c) => c.name === "Orco");
    expect(orco.imageUrl).toBe(IMG);
  });

  it("forwards the DM's center request to everyone", async () => {
    const dm = await join(DM_KEY);
    const player = await join();
    const centered = once(player.socket, EVENTS.VIEW_CENTERED);
    dm.socket.emit(EVENTS.VIEW_CENTERED, { x: 0.5, y: 0.25, span: 0.4 });
    expect(await centered).toEqual({ x: 0.5, y: 0.25, span: 0.4 });
  });
});

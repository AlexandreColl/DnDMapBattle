import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { io as connect } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CELL, EVENTS } from "../../public/js/shared/protocol.js";
import { createApp } from "../../server/app.js";
import { createAutosave } from "../../server/autosave.js";
import { createGameState } from "../../server/game.js";

const IMG = "data:image/png;base64,AAAA";

let dir;
let file;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "dndmap-"));
  file = path.join(dir, "data", "partida.json");
});

afterEach(() => {
  vi.useRealTimers();
  fs.rmSync(dir, { recursive: true, force: true });
});

function board() {
  return {
    ...createGameState(),
    gridRows: 2,
    gridCols: 3,
    cellStates: [
      [CELL.HIDDEN, CELL.HIDDEN, CELL.HIDDEN],
      [CELL.HIDDEN, CELL.HIDDEN, CELL.REVEALED],
    ],
    characters: [{ id: 1, name: "Hero", imageUrl: IMG }],
    tokens: [{ id: 1, characterId: 1, row: 0, col: 0 }],
    nextCharId: 2,
    nextTokenId: 2,
  };
}

function logger() {
  const warnings = [];
  return { warnings, warn: (msg) => warnings.push(msg) };
}

describe("autosave", () => {
  it("starts empty when there is no save", () => {
    const state = createGameState();
    expect(createAutosave(state, file).load()).toBe(false);
    expect(state).toEqual(createGameState());
  });

  it("saves the board and loads it back", () => {
    const saved = board();
    const autosave = createAutosave(saved, file);
    autosave.schedule();
    autosave.flush();

    const state = createGameState();
    expect(createAutosave(state, file).load()).toBe(true);
    expect(state.characters).toEqual([
      expect.objectContaining({ id: 1, name: "Hero" }),
    ]);
    expect(state.tokens).toEqual(saved.tokens);
    // Vision is recomputed: the hero sees around its cell.
    expect(state.cellStates[0][0]).toBe(CELL.VISIBLE);
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);
  });

  it("writes once per delay, however many changes come in", () => {
    vi.useFakeTimers();
    const state = board();
    const write = vi.spyOn(fs, "writeFileSync");
    const autosave = createAutosave(state, file, { delayMs: 1000 });
    autosave.schedule();
    state.currentTurnId = 1;
    autosave.schedule();
    expect(fs.existsSync(file)).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fs.readFileSync(file, "utf8")).currentTurnId).toBe(1);
    autosave.flush();
    expect(write).toHaveBeenCalledTimes(1);
    write.mockRestore();
  });

  it("sets a broken save aside and starts empty", () => {
    fs.mkdirSync(path.dirname(file));
    fs.writeFileSync(file, '{"gridRows": "no"');
    const log = logger();
    const state = createGameState();

    expect(createAutosave(state, file, { logger: log }).load()).toBe(false);
    expect(state).toEqual(createGameState());
    expect(log.warnings[0]).toMatch(/no es válida/);
    expect(fs.existsSync(file)).toBe(false);
    expect(fs.readFileSync(`${file}.bak`, "utf8")).toBe('{"gridRows": "no"');
  });

  it("rejects a save that would not pass as a client's board", () => {
    fs.mkdirSync(path.dirname(file));
    fs.writeFileSync(
      file,
      JSON.stringify({ ...board(), cellStates: [[CELL.HIDDEN]] }),
    );
    const log = logger();
    const state = createGameState();

    expect(createAutosave(state, file, { logger: log }).load()).toBe(false);
    expect(state.characters).toEqual([]);
    expect(fs.existsSync(`${file}.bak`)).toBe(true);
  });

  it("warns instead of crashing when it cannot write", () => {
    // A folder where the save should go makes the rename fail.
    fs.mkdirSync(file, { recursive: true });
    const log = logger();
    const autosave = createAutosave(board(), file, { logger: log });
    autosave.schedule();
    autosave.flush();
    expect(log.warnings[0]).toMatch(/No se pudo guardar/);
  });
});

describe("server with autosave", () => {
  let server;
  const clients = [];

  afterEach(async () => {
    clients.splice(0).forEach((s) => s.disconnect());
    if (server) await new Promise((resolve) => server.close(resolve));
    server = null;
  });

  async function start() {
    const app = createApp({ logger: logger(), saveFile: file });
    ({ server } = app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const socket = connect(`http://127.0.0.1:${server.address().port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    clients.push(socket);
    const state = await new Promise((resolve) =>
      socket.once(EVENTS.STATE_FULL, resolve),
    );
    return { ...app, socket, received: state };
  }

  it("keeps the game across a restart", async () => {
    const first = await start();
    expect(first.restored).toBe(false);
    first.socket.emit(EVENTS.STATE_FULL, board());
    await vi.waitFor(() => expect(first.state.characters).toHaveLength(1));
    first.autosave.flush();
    clients.splice(0).forEach((s) => s.disconnect());
    await new Promise((resolve) => server.close(resolve));

    const second = await start();
    expect(second.restored).toBe(true);
    expect(second.received.characters[0].name).toBe("Hero");
    expect(second.received.tokens).toHaveLength(1);
  });

  it("does not save a rejected change", async () => {
    const { socket, autosave } = await start();
    const resync = new Promise((resolve) =>
      socket.once(EVENTS.STATE_FULL, resolve),
    );
    socket.emit(EVENTS.TOKEN_PLACED, { characterId: 9, row: 0, col: 0 });
    await resync;
    autosave.flush();
    expect(fs.existsSync(file)).toBe(false);
  });
});

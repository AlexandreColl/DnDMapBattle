import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as connect } from "socket.io-client";
import { EVENTS } from "../../public/js/shared/protocol.js";
import { createApp } from "../../server/app.js";

const IMG = "data:image/png;base64,AAAA";
const silentLogger = { warn() {} };

let server;
let url;
const clients = [];

async function client() {
  const socket = connect(url, { transports: ["websocket"], forceNew: true });
  clients.push(socket);
  const state = await once(socket, EVENTS.STATE_FULL);
  return { socket, state };
}

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

beforeEach(async () => {
  ({ server } = createApp({ logger: silentLogger }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  clients.splice(0).forEach((s) => s.disconnect());
  await new Promise((resolve) => server.close(resolve));
});

describe("socket server", () => {
  it("sends the current state to new clients", async () => {
    const { state } = await client();
    expect(state.gridRows).toBe(0);
    expect(state.characters).toEqual([]);
  });

  it("broadcasts valid changes to the other clients", async () => {
    const a = await client();
    const b = await client();
    const received = once(b.socket, EVENTS.CHARACTER_ADDED);
    a.socket.emit(EVENTS.CHARACTER_ADDED, {
      character: { id: 1, name: "Hero", imageUrl: IMG },
      nextCharId: 2,
    });
    expect((await received).character.name).toBe("Hero");

    const late = await client();
    expect(late.state.characters).toHaveLength(1);
  });

  it("drops invalid events and keeps serving", async () => {
    const a = await client();
    const b = await client();
    let leaked = false;
    b.socket.on(EVENTS.FOG_UPDATED, () => (leaked = true));

    a.socket.emit(EVENTS.FOG_UPDATED, { cellStates: "nope" });
    a.socket.emit("fog:revealed", { cells: [{ row: 999, col: 999 }] });
    a.socket.emit(EVENTS.MAP_CHANGED, { mapImage: "https://evil.example/x" });

    const received = once(b.socket, EVENTS.TURN_CHANGED);
    a.socket.emit(EVENTS.TURN_CHANGED, { charId: 5 });
    expect(await received).toEqual({ charId: 5 });
    expect(leaked).toBe(false);
  });

  it("resyncs a DM whose character id is already taken", async () => {
    const a = await client();
    const b = await client();
    const added = once(b.socket, EVENTS.CHARACTER_ADDED);
    a.socket.emit(EVENTS.CHARACTER_ADDED, {
      character: { id: 1, name: "Hero", imageUrl: IMG },
      nextCharId: 2,
    });
    await added;

    const resync = once(b.socket, EVENTS.STATE_FULL);
    b.socket.emit(EVENTS.CHARACTER_ADDED, {
      character: { id: 1, name: "Villain", imageUrl: IMG },
      nextCharId: 2,
    });
    const state = await resync;
    expect(state.characters.map((c) => c.name)).toEqual(["Hero"]);
    expect(state.nextCharId).toBe(2);
  });

  it("serves only the public folder, with security headers", async () => {
    const index = await fetch(`${url}/`);
    expect(index.status).toBe(200);
    expect(index.headers.get("content-security-policy")).toContain(
      "default-src 'self'",
    );
    expect(index.headers.get("x-powered-by")).toBe(null);

    for (const path of ["/server/index.js", "/package.json", "/launcher.bat"]) {
      expect((await fetch(url + path)).status).toBe(404);
    }
    expect((await fetch(`${url}/js/shared/protocol.js`)).status).toBe(200);
  });
});

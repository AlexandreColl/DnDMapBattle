import fc from "fast-check";
import { io as connect } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { EVENTS } from "../../public/js/shared/protocol.js";
import { createApp } from "../../server/app.js";
import { createRateLimiter, eventCost } from "../../server/rate-limit.js";

describe("rate limiter", () => {
  it("allows a burst up to its capacity, then refills over time", () => {
    let now = 0;
    const limiter = createRateLimiter(
      { capacity: 3, refillPerSecond: 2 },
      () => now,
    );
    expect([1, 2, 3, 4].map(() => limiter.take())).toEqual([
      true,
      true,
      true,
      false,
    ]);
    now = 500;
    expect(limiter.take()).toBe(true);
    expect(limiter.take()).toBe(false);
    now = 60_000;
    expect([1, 2, 3, 4].map(() => limiter.take())).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it("charges more for events that replace the whole board", () => {
    expect(eventCost(EVENTS.STATE_FULL)).toBeGreaterThan(1);
    expect(eventCost(EVENTS.MAP_CHANGED)).toBeGreaterThan(1);
    expect(eventCost(EVENTS.TOKEN_PLACED)).toBe(1);
    expect(eventCost("anything")).toBe(1);
  });

  it("never lets through more than the capacity plus what was refilled", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 20 }),
        fc.array(
          fc.record({
            wait: fc.integer({ min: 0, max: 2000 }),
            cost: fc.integer({ min: 1, max: 25 }),
          }),
          { maxLength: 200 },
        ),
        (capacity, refillPerSecond, calls) => {
          let now = 0;
          const limiter = createRateLimiter(
            { capacity, refillPerSecond },
            () => now,
          );
          let spent = 0;
          for (const { wait, cost } of calls) {
            now += wait;
            if (limiter.take(cost)) spent += cost;
          }
          expect(spent).toBeLessThanOrEqual(
            capacity + (now / 1000) * refillPerSecond,
          );
        },
      ),
    );
  });
});

describe("socket rate limit", () => {
  let server;
  const clients = [];

  afterEach(async () => {
    clients.splice(0).forEach((s) => s.disconnect());
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  async function client(url) {
    const socket = connect(url, { transports: ["websocket"], forceNew: true });
    clients.push(socket);
    await new Promise((resolve) => socket.once(EVENTS.STATE_FULL, resolve));
    return socket;
  }

  it("drops a flood, warns once and resyncs the sender", async () => {
    const warnings = [];
    ({ server } = createApp({
      logger: { warn: (msg) => warnings.push(msg) },
      rateLimit: { capacity: 3, refillPerSecond: 0 },
    }));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const flooder = await client(url);
    const other = await client(url);

    const received = [];
    other.on(EVENTS.TURN_CHANGED, (data) => received.push(data.charId));
    const resync = new Promise((resolve) =>
      flooder.once(EVENTS.STATE_FULL, resolve),
    );
    for (let charId = 1; charId <= 10; charId++) {
      flooder.emit(EVENTS.TURN_CHANGED, { charId });
    }

    await resync;
    expect(received).toEqual([1, 2, 3]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/demasiados eventos/);
  }, 5000);
});

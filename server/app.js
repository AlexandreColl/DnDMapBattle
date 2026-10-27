import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { EVENTS, ROLES } from "../public/js/shared/protocol.js";
import { createGameState, reducers } from "./game.js";
import {
  authorize,
  playerSnapshot,
  playerView,
  refreshVision,
  roleFor,
} from "./roles.js";

const DEFAULT_PUBLIC_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
);

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

function securityHeaders(_req, res, next) {
  res.setHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
}

function describeError(err) {
  if (err?.issues) {
    return err.issues
      .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
      .join("; ");
  }
  return err?.message ?? String(err);
}

function isDm(socket) {
  return socket.data.role === ROLES.DM;
}

/** Sends a player what changed for them, skipping identical updates. */
function sendPlayerView(socket, state) {
  const view = playerView(state, socket.data.known);
  // Compare without portraits: they are only omitted once already sent.
  const signature = JSON.stringify(view, (key, value) =>
    key === "imageUrl" ? undefined : value,
  );
  if (signature === socket.data.lastView) return;
  socket.data.lastView = signature;
  // The client drops characters that leave the view, so an enemy coming back
  // out of the fog needs its portrait again.
  socket.data.known = new Set(view.characters.map((c) => c.id));
  socket.emit(EVENTS.PLAYER_VIEW, view);
}

function sendSnapshot(socket, state) {
  if (isDm(socket)) {
    socket.emit(EVENTS.STATE_FULL, state);
    return;
  }
  const snapshot = playerSnapshot(state);
  socket.data.known = new Set(snapshot.characters.map((c) => c.id));
  socket.data.lastView = null;
  socket.emit(EVENTS.STATE_FULL, snapshot);
}

/**
 * DMs get every change as is. Players get the map and the "center" request as
 * is, a new snapshot when the whole board changes, and otherwise a filtered
 * view of tokens, characters, fog and turn.
 */
function broadcast(io, sender, event, payload, state) {
  for (const socket of io.sockets.sockets.values()) {
    if (isDm(socket)) {
      if (socket !== sender) socket.emit(event, payload);
    } else if (event === EVENTS.STATE_CLEARED) {
      socket.data.known = new Set();
      socket.data.lastView = null;
      socket.emit(event);
    } else if (event === EVENTS.MAP_CHANGED || event === EVENTS.VIEW_CENTERED) {
      socket.emit(event, payload);
    } else if (event === EVENTS.STATE_FULL || event === EVENTS.GRID_GENERATED) {
      sendSnapshot(socket, state);
    } else {
      sendPlayerView(socket, state);
    }
  }
}

function sendPresence(io) {
  const sockets = [...io.sockets.sockets.values()];
  const dms = sockets.filter(isDm).length;
  const presence = { dms, players: sockets.length - dms };
  for (const socket of sockets) {
    if (isDm(socket)) socket.emit(EVENTS.PRESENCE, presence);
  }
}

/**
 * @param {import("socket.io").Server} io
 * @param {ReturnType<typeof createGameState>} state
 * @param {{ logger?: Pick<Console, "warn">, dmKey?: string | null }} [options]
 */
export function registerSocketHandlers(
  io,
  state,
  { logger = console, dmKey = null } = {},
) {
  io.on("connection", (socket) => {
    socket.data.role = roleFor(dmKey, socket.handshake.auth?.dmKey);
    socket.emit(EVENTS.SESSION, { role: socket.data.role });
    sendSnapshot(socket, state);
    sendPresence(io);
    socket.on("disconnect", () => sendPresence(io));

    for (const [event, reduce] of Object.entries(reducers)) {
      socket.on(event, (raw) => {
        try {
          authorize(socket.data.role, event, state, raw);
          const payload = reduce(state, raw);
          refreshVision(state);
          broadcast(io, socket, event, payload, state);
        } catch (err) {
          logger.warn(
            `[socket ${socket.id}] evento "${event}" rechazado: ${describeError(err)}`,
          );
          // Undo what the player already changed on their screen.
          if (!isDm(socket)) sendSnapshot(socket, state);
        }
      });
    }
  });
}

/**
 * Builds the HTTP + Socket.IO server without starting it, so tests can listen
 * on an ephemeral port. Clients that send `dmKey` in the handshake are DMs;
 * without a `dmKey` option every client is.
 * @param {{ publicDir?: string, maxPayloadBytes?: number,
 *   logger?: Pick<Console, "warn">, dmKey?: string | null }} [options]
 */
export function createApp({
  publicDir = DEFAULT_PUBLIC_DIR,
  maxPayloadBytes = 16 * 1024 * 1024,
  logger = console,
  dmKey = null,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(express.static(publicDir));

  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: maxPayloadBytes });
  const state = createGameState();
  registerSocketHandlers(io, state, { logger, dmKey });

  return { app, server, io, state };
}

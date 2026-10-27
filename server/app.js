import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { EVENTS } from "../public/js/shared/protocol.js";
import { createGameState, reducers } from "./game.js";

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

/**
 * @param {import("socket.io").Server} io
 * @param {ReturnType<typeof createGameState>} state
 * @param {{ logger?: Pick<Console, "warn"> }} [options]
 */
export function registerSocketHandlers(io, state, { logger = console } = {}) {
  io.on("connection", (socket) => {
    socket.emit(EVENTS.STATE_FULL, state);

    for (const [event, reduce] of Object.entries(reducers)) {
      socket.on(event, (raw) => {
        try {
          const payload = reduce(state, raw);
          socket.broadcast.emit(event, payload);
        } catch (err) {
          logger.warn(
            `[socket ${socket.id}] evento "${event}" rechazado: ${describeError(err)}`,
          );
        }
      });
    }
  });
}

/**
 * Builds the HTTP + Socket.IO server without starting it, so tests can listen
 * on an ephemeral port.
 * @param {{ publicDir?: string, maxPayloadBytes?: number,
 *   logger?: Pick<Console, "warn"> }} [options]
 */
export function createApp({
  publicDir = DEFAULT_PUBLIC_DIR,
  maxPayloadBytes = 16 * 1024 * 1024,
  logger = console,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(express.static(publicDir));

  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: maxPayloadBytes });
  const state = createGameState();
  registerSocketHandlers(io, state, { logger });

  return { app, server, io, state };
}

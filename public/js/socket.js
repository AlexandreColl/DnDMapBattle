/* global io -- provided by /socket.io/socket.io.js */
import { canSend, dmKeyFromUrl } from "./roles.js";

// The DM opens the game with "#dm=KEY"; the server decides the role.
// WebSocket first: on a local network it always works, and a closed tab ends
// the connection at once. With long-polling first, a tab closed before the
// upgrade lingered as a ghost player. Polling stays as a fallback.
export const socket = io({
  auth: { dmKey: dmKeyFromUrl() },
  transports: ["websocket", "polling"],
});

let silenced = 0;

/**
 * Sends a change to the other clients, unless we are applying a remote one
 * or this device's role may not send it.
 */
export function emit(event, payload) {
  if (silenced === 0 && canSend(event)) socket.emit(event, payload);
}

/** Runs `fn` without broadcasting the changes it makes. */
export function withoutEmitting(fn) {
  silenced++;
  try {
    return fn();
  } finally {
    silenced--;
  }
}

/** Handles a server event; changes made while handling it are not echoed. */
export function onRemote(event, handler) {
  socket.on(event, (data) => withoutEmitting(() => handler(data)));
}

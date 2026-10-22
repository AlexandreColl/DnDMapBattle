/* global io -- provided by /socket.io/socket.io.js */

export const socket = io();

let silenced = 0;

/** Sends a change to the other clients, unless we are applying a remote one. */
export function emit(event, payload) {
  if (silenced === 0) socket.emit(event, payload);
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

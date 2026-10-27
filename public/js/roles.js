// This device's role (DM or player), set by the server when connecting.
// The server enforces permissions; the client only hides what a player
// cannot use.
import { PLAYER_EVENTS, ROLES } from "./shared/protocol.js";
import { state } from "./state.js";

export function isDm() {
  return state.role === ROLES.DM;
}

/** Whether this device may send `event` to the server. */
export function canSend(event) {
  return isDm() || PLAYER_EVENTS.includes(event);
}

/** Whether this device may drag or edit `char`. */
export function canControl(char) {
  return isDm() || Boolean(char && !char.isEnemy);
}

/** The DM key from a "#dm=KEY" link, if any. */
export function dmKeyFromUrl(hash = location.hash) {
  return new URLSearchParams(hash.slice(1)).get("dm");
}

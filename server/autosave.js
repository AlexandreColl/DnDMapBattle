// Keeps the game on disk, so closing the server or restarting the computer
// does not lose the board.
import fs from "node:fs";
import path from "node:path";
import { EVENTS } from "../public/js/shared/protocol.js";
import { createGameState, reducers } from "./game.js";
import { refreshVision } from "./roles.js";

// At most one write per this long, however fast the board changes.
export const SAVE_DELAY_MS = 2000;

/**
 * @param {ReturnType<typeof createGameState>} state
 * @param {string} file
 * @param {{ logger?: Pick<Console, "warn">, delayMs?: number }} [options]
 */
export function createAutosave(
  state,
  file,
  { logger = console, delayMs = SAVE_DELAY_MS } = {},
) {
  let timer = null;

  // Written next to the save and renamed over it, so a crash mid-write
  // leaves the previous save intact.
  function write() {
    const tmp = `${file}.tmp`;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(state));
      fs.renameSync(tmp, file);
    } catch (err) {
      logger.warn(`No se pudo guardar la partida en ${file}: ${err.message}`);
    }
  }

  return {
    /**
     * Loads the save into `state` through the same checks as a client's
     * board. Returns whether there was one. A broken save is set aside as
     * .bak, so the next write does not overwrite it.
     */
    load() {
      if (!fs.existsSync(file)) return false;
      try {
        const loaded = createGameState();
        reducers[EVENTS.STATE_FULL](
          loaded,
          JSON.parse(fs.readFileSync(file, "utf8")),
        );
        refreshVision(loaded);
        Object.assign(state, loaded);
        return true;
      } catch (err) {
        logger.warn(
          `La partida guardada en ${file} no es válida (${err.message}); se aparta como .bak y se empieza de cero.`,
        );
        try {
          fs.renameSync(file, `${file}.bak`);
        } catch {
          // Nothing else to do: the next write replaces it.
        }
        return false;
      }
    },

    /** Saves within `delayMs`; calls in between share that one write. */
    schedule() {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        write();
      }, delayMs);
      timer.unref();
    },

    /** Writes a pending save now, for a clean shutdown. */
    flush() {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      write();
    },
  };
}

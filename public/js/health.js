// Hit points and conditions: how they are shown, and the changes made here.
import {
  adjustHp,
  normalizeConditions,
  normalizeHealth,
} from "./lib/health.js";
import { EVENTS, HEALTH } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { renderTokens } from "./tokens.js";

export const CONDITION_INFO = Object.freeze({
  blinded: { label: "Cegado", icon: "🙈" },
  charmed: { label: "Hechizado", icon: "💖" },
  deafened: { label: "Ensordecido", icon: "🔇" },
  frightened: { label: "Asustado", icon: "😱" },
  grappled: { label: "Agarrado", icon: "✊" },
  incapacitated: { label: "Incapacitado", icon: "💫" },
  invisible: { label: "Invisible", icon: "👻" },
  paralyzed: { label: "Paralizado", icon: "⚡" },
  petrified: { label: "Petrificado", icon: "🗿" },
  poisoned: { label: "Envenenado", icon: "🤢" },
  prone: { label: "Derribado", icon: "🛌" },
  restrained: { label: "Apresado", icon: "⛓️" },
  stunned: { label: "Aturdido", icon: "😵" },
  unconscious: { label: "Inconsciente", icon: "💤" },
  exhausted: { label: "Agotado", icon: "🥱" },
  concentrating: { label: "Concentrado", icon: "🔮" },
});

export const HEALTH_LABELS = Object.freeze({
  [HEALTH.UNHURT]: "Ileso",
  [HEALTH.HURT]: "Herido",
  [HEALTH.BLOODIED]: "Malherido",
  [HEALTH.DOWN]: "Caído",
});

export function setHealth(char, hp, maxHp) {
  Object.assign(char, normalizeHealth(hp, maxHp));
  renderTokens();
  emit(EVENTS.HEALTH_CHANGED, {
    charId: char.id,
    hp: char.hp,
    maxHp: char.maxHp,
  });
}

/** Damage (negative `delta`) or healing, within 0 and the maximum. */
export function changeHp(char, delta) {
  if (char.maxHp == null) return;
  setHealth(char, adjustHp(char.hp, char.maxHp, delta), char.maxHp);
}

export function toggleCondition(char, condition) {
  const current = char.conditions ?? [];
  char.conditions = normalizeConditions(
    current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition],
  );
  renderTokens();
  emit(EVENTS.CONDITIONS_CHANGED, {
    charId: char.id,
    conditions: char.conditions,
  });
}

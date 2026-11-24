// Hit points and conditions: how they are shown, and the changes made here.
import { t } from "./i18n.js";
import {
  adjustHp,
  normalizeConditions,
  normalizeHealth,
} from "./lib/health.js";
import { EVENTS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { renderTokens } from "./tokens.js";

export const CONDITION_ICONS = Object.freeze({
  blinded: "🙈",
  charmed: "💖",
  deafened: "🔇",
  frightened: "😱",
  grappled: "✊",
  incapacitated: "💫",
  invisible: "👻",
  paralyzed: "⚡",
  petrified: "🗿",
  poisoned: "🤢",
  prone: "🛌",
  restrained: "⛓️",
  stunned: "😵",
  unconscious: "💤",
  exhausted: "🥱",
  concentrating: "🔮",
});

export function conditionLabel(condition) {
  return t(`condition.${condition}`);
}

/** "Unhurt", "Hurt"… for a HEALTH level, or null without one. */
export function healthLabel(level) {
  return level ? t(`health.${level}`) : null;
}

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

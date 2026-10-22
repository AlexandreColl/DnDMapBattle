/** Characters on the board with an initiative, highest first. */
export function getInitiativeEntries(tokens, characters) {
  const entries = [];
  for (const token of tokens) {
    const char = characters.find((c) => c.id === token.characterId);
    if (char && char.initiative != null) entries.push({ token, char });
  }
  return entries.sort((a, b) => b.char.initiative - a.char.initiative);
}

/**
 * The character whose turn it is: `currentId` if still in the order,
 * otherwise the first one. Null when nobody has initiative.
 */
export function resolveCurrentTurn(entries, currentId) {
  if (entries.length === 0) return null;
  if (entries.some((e) => e.char.id === currentId)) return currentId;
  return entries[0].char.id;
}

/** The character after `currentId`, wrapping around. */
export function nextTurn(entries, currentId) {
  if (entries.length === 0) return null;
  const idx = entries.findIndex((e) => e.char.id === currentId);
  return entries[(idx + 1) % entries.length].char.id;
}

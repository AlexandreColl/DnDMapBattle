// Dragging tokens and roster characters onto the grid with pointer events,
// so it works the same with a mouse, a pen or a finger.
import { cellFromTarget } from "./dom.js";
import { placeOnCell } from "./tokens.js";
import { closeTokenMenu } from "./token-menu.js";

// Mouse and pen start dragging after a small movement. On the roster a finger
// must hold still first, so a normal swipe still scrolls the list.
const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 350;

// The gesture in progress, if any.
let pending = null;
let ghost = null;
let overCell = null;

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function cellAt(x, y) {
  return cellFromTarget(document.elementFromPoint(x, y));
}

function highlight(cell) {
  if (overCell?.el === cell?.el) return;
  overCell?.el.classList.remove("drag-over");
  overCell = cell;
  overCell?.el.classList.add("drag-over");
}

function moveGhost(x, y) {
  ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  highlight(cellAt(x, y));
}

function activate() {
  const { source, image, size, last } = pending;
  clearTimeout(pending.timer);
  pending.active = true;
  closeTokenMenu();
  source.classList.add("dragging");
  document.body.classList.add("dragging-piece");

  ghost = document.createElement("div");
  ghost.className = "drag-ghost";
  ghost.style.backgroundImage = image;
  ghost.style.width = ghost.style.height = `${size}px`;
  document.body.appendChild(ghost);
  moveGhost(last.clientX, last.clientY);
  if (pending.longPress) navigator.vibrate?.(15);
}

function finish(drop) {
  if (!pending) return;
  const { active, source, kind, id, last } = pending;
  clearTimeout(pending.timer);
  pending = null;
  if (!active) return;

  source.classList.remove("dragging");
  document.body.classList.remove("dragging-piece");
  ghost.remove();
  ghost = null;
  highlight(null);
  suppressNextClick();

  const cell = drop && cellAt(last.clientX, last.clientY);
  if (cell) placeOnCell(cell.row, cell.col, kind, id);
}

/** The click that ends a drag must not open menus or toggle fog. */
function suppressNextClick() {
  const swallow = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener("click", swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", swallow, true), 0);
}

/** Abandons the drag in progress, e.g. when a second finger starts a pinch. */
export function cancelDrag() {
  finish(false);
}

/**
 * Makes `source` draggable onto the grid.
 * @param {HTMLElement} source
 * @param {{ kind: "char" | "token", id: number, image: string,
 *   longPressOnTouch?: boolean, enabled?: () => boolean }} options
 */
export function makeDraggable(source, options) {
  source.addEventListener("pointerdown", (e) => {
    if (pending || !e.isPrimary || e.button !== 0) return;
    if (options.enabled && !options.enabled()) return;
    if (e.target.closest("input, button")) return;

    const longPress = options.longPressOnTouch && e.pointerType === "touch";
    pending = {
      ...options,
      source,
      pointerId: e.pointerId,
      start: e,
      last: e,
      longPress,
      size: Math.max(44, Math.min(source.getBoundingClientRect().height, 96)),
      active: false,
    };
    if (longPress) pending.timer = setTimeout(activate, LONG_PRESS_MS);
  });
}

export function initDrag() {
  document.addEventListener("pointermove", (e) => {
    if (!pending || e.pointerId !== pending.pointerId) return;
    pending.last = e;
    if (pending.active) {
      moveGhost(e.clientX, e.clientY);
    } else if (distance(e, pending.start) > DRAG_THRESHOLD) {
      // A finger that moves before the long press is scrolling the list.
      if (pending.longPress) finish(false);
      else activate();
    }
  });

  document.addEventListener("pointerup", (e) => {
    if (pending?.pointerId === e.pointerId) finish(true);
  });
  document.addEventListener("pointercancel", (e) => {
    if (pending?.pointerId === e.pointerId) finish(false);
  });

  // Once a touch drag has started the page must not scroll under it.
  document.addEventListener(
    "touchmove",
    (e) => {
      if (pending?.active && e.cancelable) e.preventDefault();
    },
    { passive: false },
  );
  // Long-pressing a roster item would otherwise open the context menu.
  document.addEventListener("contextmenu", (e) => {
    if (pending || e.target.closest(".char-item, .token")) e.preventDefault();
  });
}

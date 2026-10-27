// Zoom and pan of the map. Each device keeps its own view; the DM can bring
// everyone to the area they are looking at.
import { $, gridOverlay, mapContainer, mapWrapper } from "./dom.js";
import { cancelDrag } from "./drag.js";
import { clamp } from "./lib/geometry.js";
import { EVENTS, LIMITS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";
import { closeTokenMenu } from "./token-menu.js";
import { toast } from "./ui.js";
import { cancelPainting } from "./walls.js";

const zoomLabel = $("#zoom-reset");

export function applyTransform() {
  mapWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
}

export function resetView() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  applyTransform();
}

function zoomAtPoint(requestedZoom, clientX, clientY) {
  const newZoom = clamp(requestedZoom, LIMITS.minZoom, LIMITS.maxZoom);
  const rect = mapContainer.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;
  const ratio = newZoom / state.zoom;
  state.panX = mx - (mx - state.panX) * ratio;
  state.panY = my - (my - state.panY) * ratio;
  state.zoom = newZoom;
  applyTransform();
}

function zoomAtCenter(factor) {
  const rect = mapContainer.getBoundingClientRect();
  zoomAtPoint(
    state.zoom * factor,
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
}

/** The grid area in map coordinates (before zoom and pan). */
function gridBox() {
  if (!state.gridRows) {
    return {
      left: 0,
      top: 0,
      width: mapWrapper.clientWidth || 1,
      height: mapWrapper.clientHeight || 1,
    };
  }
  return {
    left: gridOverlay.offsetLeft,
    top: gridOverlay.offsetTop,
    width: gridOverlay.offsetWidth || 1,
    height: gridOverlay.offsetHeight || 1,
  };
}

/**
 * Sends the center of this view as a fraction of the grid, and how much of
 * its width is visible, so screens of any size can frame the same area.
 */
export function centerEveryone() {
  const grid = gridBox();
  const width = mapContainer.clientWidth;
  const height = mapContainer.clientHeight;
  const centerX = (width / 2 - state.panX) / state.zoom;
  const centerY = (height / 2 - state.panY) / state.zoom;
  emit(EVENTS.VIEW_CENTERED, {
    x: clamp((centerX - grid.left) / grid.width, 0, 1),
    y: clamp((centerY - grid.top) / grid.height, 0, 1),
    span: clamp(width / state.zoom / grid.width, 0.01, 100),
  });
  toast("Has centrado a todos en tu vista", { kind: "success" });
}

/** Frames the area the DM sent with `centerEveryone`. */
export function applyCenter({ x, y, span }) {
  closeTokenMenu();
  const grid = gridBox();
  const width = mapContainer.clientWidth;
  const height = mapContainer.clientHeight;
  state.zoom = clamp(
    width / (span * grid.width),
    LIMITS.minZoom,
    LIMITS.maxZoom,
  );
  state.panX = width / 2 - (grid.left + x * grid.width) * state.zoom;
  state.panY = height / 2 - (grid.top + y * grid.height) * state.zoom;
  applyTransform();
  toast("El máster te ha llevado a su vista");
}

// Pointers currently pressed on the map, by pointerId → { x, y }.
const pointers = new Map();
// One pointer pans; two pointers pinch (zoom and pan around their midpoint).
let gesture = null;
const PAN_THRESHOLD = 4;

/** Whether a press on `target` should pan the map with the current tool. */
function startsPan(target) {
  if (target.closest(".token, .popover, .pill, #initiative-bar")) return false;
  const onCell = target.closest(".grid-cell");
  return state.tool === "move" || !onCell;
}

function pinchMetrics() {
  const [a, b] = [...pointers.values()];
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
  };
}

function startPinch() {
  // A second finger turns whatever the first one was doing into a pinch.
  cancelDrag();
  cancelPainting();
  closeTokenMenu();
  gesture = {
    kind: "pinch",
    start: pinchMetrics(),
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
  };
  mapContainer.classList.add("panning");
}

function updatePinch() {
  const { start, zoom, panX, panY } = gesture;
  const now = pinchMetrics();
  // Pan with the midpoint, then zoom around where it is now.
  state.zoom = zoom;
  state.panX = panX + (now.x - start.x);
  state.panY = panY + (now.y - start.y);
  zoomAtPoint(zoom * (now.distance / start.distance), now.x, now.y);
  gesture.moved = true;
}

function updatePan(e) {
  const dx = e.clientX - gesture.x;
  const dy = e.clientY - gesture.y;
  if (!gesture.moved && Math.hypot(dx, dy) < PAN_THRESHOLD) return;
  if (!gesture.moved) closeTokenMenu();
  gesture.moved = true;
  state.panX = gesture.panX + dx;
  state.panY = gesture.panY + dy;
  applyTransform();
}

function endGesture() {
  if (!gesture) return;
  gesture = null;
  mapContainer.classList.remove("panning");
}

export function initView() {
  mapContainer.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      closeTokenMenu();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAtPoint(state.zoom * factor, e.clientX, e.clientY);
    },
    { passive: false },
  );

  mapContainer.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".popover, .pill")) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && e.pointerType === "touch") {
      startPinch();
    } else if (pointers.size === 1 && startsPan(e.target)) {
      gesture = {
        kind: "pan",
        x: e.clientX,
        y: e.clientY,
        panX: state.panX,
        panY: state.panY,
        moved: false,
      };
      mapContainer.classList.add("panning");
      if (e.pointerType === "mouse") e.preventDefault();
    }
  });

  document.addEventListener("pointermove", (e) => {
    const pointer = pointers.get(e.pointerId);
    if (!pointer) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (gesture?.kind === "pinch") updatePinch();
    else if (gesture?.kind === "pan") updatePan(e);
  });

  const release = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    // Lifting one finger of a pinch ends it; the other does not start a pan.
    if (gesture?.kind === "pinch" || pointers.size === 0) endGesture();
  };
  document.addEventListener("pointerup", release);
  document.addEventListener("pointercancel", release);

  $("#zoom-in").addEventListener("click", () => zoomAtCenter(1.2));
  $("#zoom-out").addEventListener("click", () => zoomAtCenter(1 / 1.2));
  $("#zoom-reset").addEventListener("click", resetView);
  $("#center-all").addEventListener("click", centerEveryone);
  applyTransform();
}

// Zoom and pan of the map, shared with every connected client.
import { $, mapContainer, mapWrapper } from "./dom.js";
import { clamp } from "./lib/geometry.js";
import { EVENTS, LIMITS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";
import { closeTokenMenu } from "./token-menu.js";

const zoomLabel = $("#zoom-reset");

export function applyTransform() {
  mapWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
}

function emitView() {
  emit(EVENTS.VIEW_CHANGED, {
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
  });
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
  emitView();
}

let panStart = null;

/** Whether a press on `target` should pan the map with the current tool. */
function startsPan(target) {
  if (target.closest(".token, .popover, .pill, #initiative-bar")) return false;
  const onCell = target.closest(".grid-cell");
  return state.tool === "move" || !onCell;
}

export function initView() {
  mapContainer.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      closeTokenMenu();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAtPoint(state.zoom * factor, e.clientX, e.clientY);
      emitView();
    },
    { passive: false },
  );

  mapContainer.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || !startsPan(e.target)) return;
    panStart = {
      x: e.clientX,
      y: e.clientY,
      panX: state.panX,
      panY: state.panY,
      moved: false,
    };
    mapContainer.classList.add("panning");
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!panStart) return;
    if (!panStart.moved) closeTokenMenu();
    panStart.moved = true;
    state.panX = panStart.panX + (e.clientX - panStart.x);
    state.panY = panStart.panY + (e.clientY - panStart.y);
    applyTransform();
  });

  document.addEventListener("mouseup", () => {
    if (!panStart) return;
    const { moved } = panStart;
    panStart = null;
    mapContainer.classList.remove("panning");
    if (moved) emitView();
  });

  $("#zoom-in").addEventListener("click", () => zoomAtCenter(1.2));
  $("#zoom-out").addEventListener("click", () => zoomAtCenter(1 / 1.2));
  $("#zoom-reset").addEventListener("click", () => {
    resetView();
    emitView();
  });
  applyTransform();
}

// Zoom and pan of the map, shared with every connected client.
import { mapContainer, mapWrapper } from "./dom.js";
import { clamp } from "./lib/geometry.js";
import { EVENTS, LIMITS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";

export function applyTransform() {
  mapWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
}

export function resetView() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  applyTransform();
}

function emitView() {
  emit(EVENTS.VIEW_CHANGED, {
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
  });
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

let panStart = null;

export function initView() {
  mapContainer.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAtPoint(state.zoom * factor, e.clientX, e.clientY);
      emitView();
    },
    { passive: false },
  );

  mapContainer.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    const cell = e.target.closest(".grid-cell");
    if (e.target.closest(".token") || cell?.querySelector(".token")) return;
    if (state.measuring && cell) return;
    panStart = {
      x: e.clientX,
      y: e.clientY,
      panX: state.panX,
      panY: state.panY,
    };
    mapContainer.classList.add("panning");
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!panStart) return;
    state.panX = panStart.panX + (e.clientX - panStart.x);
    state.panY = panStart.panY + (e.clientY - panStart.y);
    applyTransform();
  });

  document.addEventListener("mouseup", () => {
    if (!panStart) return;
    panStart = null;
    mapContainer.classList.remove("panning");
    emitView();
  });
}

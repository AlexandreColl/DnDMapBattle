// Map background image.
import {
  $,
  gridOverlay,
  mapBg,
  readFileAsDataURL,
  revokeIfBlob,
} from "./dom.js";
import {
  autoFitGrid,
  updateEmptyState,
  updateGridInfo,
  updateGridLayout,
} from "./grid.js";
import { cssUrl, isSafeImageUrl } from "./lib/sanitize.js";
import { EVENTS } from "./shared/protocol.js";
import { emit } from "./socket.js";
import { state } from "./state.js";

const thumb = $("#map-thumb");
const mapName = $("#map-name");

function showMapInPicker(src, name) {
  thumb.style.backgroundImage = src ? cssUrl(src) : "";
  mapName.textContent = src ? name || "Mapa cargado" : "Cargar mapa";
}

/**
 * Shows `src` as the map (or clears it when null). `dataUrl` is what gets
 * synced and saved; it defaults to `src`. With `autoFit`, the grid inputs are
 * adjusted to square cells when there is no grid yet.
 */
export function setMapImage(
  src,
  { dataUrl = src, autoFit = false, name = "" } = {},
) {
  if (state.mapImage !== src) revokeIfBlob(state.mapImage);

  if (!src || !isSafeImageUrl(src)) {
    state.mapImage = null;
    state.mapDataURL = null;
    state.imageNaturalWidth = 0;
    state.imageNaturalHeight = 0;
    mapBg.style.backgroundImage = "";
    showMapInPicker(null);
    updateGridInfo();
    updateEmptyState();
    return;
  }

  state.mapImage = src;
  state.mapDataURL = dataUrl;
  mapBg.style.backgroundImage = cssUrl(src);
  showMapInPicker(src, name);
  updateEmptyState();

  const img = new Image();
  img.onload = () => {
    if (state.mapImage !== src) return; // replaced while loading
    state.imageNaturalWidth = img.naturalWidth;
    state.imageNaturalHeight = img.naturalHeight;
    if (gridOverlay.classList.contains("has-grid")) updateGridLayout();
    else if (autoFit) autoFitGrid(false);
    updateGridInfo();
  };
  img.src = src;
}

export function initMap() {
  $("#map-upload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setMapImage(blobUrl, { dataUrl: null, autoFit: true, name: file.name });
    const dataUrl = await readFileAsDataURL(file);
    if (state.mapImage !== blobUrl) return;
    state.mapDataURL = dataUrl;
    emit(EVENTS.MAP_CHANGED, { mapImage: dataUrl });
  });
}

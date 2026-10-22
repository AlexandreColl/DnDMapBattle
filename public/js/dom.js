export const $ = (s, p = document) => p.querySelector(s);
export const $$ = (s, p = document) => p.querySelectorAll(s);

export const mapBg = $("#map-bg");
export const gridOverlay = $("#grid-overlay");
export const fogOverlay = $("#fog-overlay");
export const mapWrapper = $("#map-wrapper");
export const mapContainer = $("#map-container");
export const charList = $("#char-list");

export function cellElement(row, col) {
  return $(`[data-row="${row}"][data-col="${col}"]`, gridOverlay);
}

/** Triggers a browser download of `data` serialized as JSON. */
export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function revokeIfBlob(url) {
  if (typeof url === "string" && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

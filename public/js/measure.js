// Distance measurement between two cells (local only, not synced).
import { $, $$, cellElement, gridOverlay, mapWrapper } from "./dom.js";
import { cellDistance } from "./lib/geometry.js";
import { state } from "./state.js";
import { resetHint, setHint } from "./tools.js";

const markerA = $("#measure-marker-a");
const markerB = $("#measure-marker-b");
const label = $("#measure-label");
const line = $("#measure-line");

function clearCellHighlights() {
  $$(".grid-cell.measure-a, .grid-cell.measure-b", gridOverlay).forEach((el) =>
    el.classList.remove("measure-a", "measure-b"),
  );
}

function hide(...elements) {
  for (const el of elements) el.style.display = "none";
}

function placeAt(el, { x, y }) {
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.display = "block";
}

/** Center of a cell in map-wrapper coordinates (before zoom/pan). */
function getCellCenter({ row, col }) {
  const cell = cellElement(row, col);
  if (!cell) return null;
  const wrapperRect = mapWrapper.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  return {
    x: (cellRect.left + cellRect.width / 2 - wrapperRect.left) / state.zoom,
    y: (cellRect.top + cellRect.height / 2 - wrapperRect.top) / state.zoom,
  };
}

export function clearMeasurement() {
  state.measurePoints = [];
  hide(markerA, markerB, label, line);
  clearCellHighlights();
  if (state.tool === "measure") resetHint();
}

export function handleMeasureClick(row, col) {
  if (state.measurePoints.length >= 2) state.measurePoints = [];
  state.measurePoints.push({ row, col });
  updateMeasurement();
}

function updateMeasurement() {
  const [a, b] = state.measurePoints;
  clearCellHighlights();
  hide(markerA, markerB, label, line);
  if (!a) return;

  cellElement(a.row, a.col)?.classList.add("measure-a");
  const posA = getCellCenter(a);
  if (posA) placeAt(markerA, posA);

  if (!b) {
    setHint("Medir · haz clic en otra casilla");
    return;
  }

  cellElement(b.row, b.col)?.classList.add("measure-b");
  const posB = getCellCenter(b);
  if (!posA || !posB) return;
  placeAt(markerB, posB);

  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  placeAt(line, posA);
  line.style.width = `${Math.hypot(dx, dy)}px`;
  line.style.transform = `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`;

  const text = `${cellDistance(a, b).toFixed(1)} casillas`;
  label.textContent = text;
  placeAt(label, { x: (posA.x + posB.x) / 2, y: (posA.y + posB.y) / 2 - 18 });
  setHint(`Distancia: ${text}`);
}

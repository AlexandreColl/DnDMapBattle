// Distance measurement between two cells (local only, not synced).
import { $, $$, cellElement, gridOverlay, mapWrapper } from "./dom.js";
import { cellDistance } from "./lib/geometry.js";
import { state } from "./state.js";

const toggleButton = $("#toggle-measure");
const info = $("#measure-info");
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

function getCellCenter({ row, col }) {
  const cell = cellElement(row, col);
  if (!cell) return null;
  const wrapperRect = mapWrapper.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  return {
    x: cellRect.left + cellRect.width / 2 - wrapperRect.left,
    y: cellRect.top + cellRect.height / 2 - wrapperRect.top,
  };
}

export function clearMeasurement() {
  state.measurePoints = [];
  hide(markerA, markerB, label, line);
  clearCellHighlights();
  info.textContent = "";
}

export function setMeasuring(measuring) {
  state.measuring = measuring;
  toggleButton.classList.toggle("active", measuring);
  clearMeasurement();
  if (measuring) info.textContent = "Haz clic en una celda para empezar";
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
    info.textContent = "Haz clic en otra celda";
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
  placeAt(label, { x: (posA.x + posB.x) / 2, y: (posA.y + posB.y) / 2 - 24 });
  info.textContent = text;
}

export function initMeasure() {
  toggleButton.addEventListener("click", () => setMeasuring(!state.measuring));
}

// Fog of war drawn on a canvas: soft edges between cells, smooth transitions
// when vision changes, and a warm torch halo around allied tokens.
import { fogCanvas } from "./dom.js";
import { fogAlphas, stepTowards } from "./lib/fog.js";
import { state } from "./state.js";

const FOG_RGB = [8, 6, 4];
const TORCH = "255, 184, 90";
const MAX_CANVAS_PX = 4096;

const ctx = fogCanvas.getContext("2d");
const cellLayer = document.createElement("canvas");
const cellCtx = cellLayer.getContext("2d");

let rows = 0;
let cols = 0;
let current = new Float32Array(0);
let target = new Float32Array(0);
let frame = 0;
let placed = false;

/** Places the fog canvas over the grid (CSS pixels, relative to the map). */
export function placeFog({ left, top, width, height }) {
  Object.assign(fogCanvas.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  });
  placed = width > 0 && height > 0;
  const scale = Math.min(
    window.devicePixelRatio || 1,
    MAX_CANVAS_PX / Math.max(width, height, 1),
  );
  fogCanvas.width = Math.max(1, Math.round(width * scale));
  fogCanvas.height = Math.max(1, Math.round(height * scale));
  draw();
}

/** Starts animating the fog towards the current `state.cellStates`. */
export function applyFog() {
  const next = fogAlphas(state.cellStates, state.gridRows, state.gridCols);
  if (state.gridRows !== rows || state.gridCols !== cols) {
    rows = state.gridRows;
    cols = state.gridCols;
    current = next.slice();
    cellLayer.width = cols + 2;
    cellLayer.height = rows + 2;
  }
  target = next;
  if (!frame) frame = requestAnimationFrame(animate);
}

function animate() {
  const settled = stepTowards(current, target);
  draw();
  frame = settled ? 0 : requestAnimationFrame(animate);
}

function drawCells() {
  const image = cellCtx.createImageData(cols + 2, rows + 2);
  for (let i = 0; i < current.length; i++) {
    image.data.set(FOG_RGB, i * 4);
    image.data[i * 4 + 3] = Math.round(current[i] * 255);
  }
  cellCtx.putImageData(image, 0, 0);
}

function drawTorches(cellW, cellH) {
  for (const token of state.tokens) {
    const char = state.characters.find((c) => c.id === token.characterId);
    if (!char || char.isEnemy) continue;
    const x = (token.col + 0.5) * cellW;
    const y = (token.row + 0.5) * cellH;
    const radius = (char.visionRadius + 0.5) * Math.min(cellW, cellH);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(${TORCH}, 0.12)`);
    glow.addColorStop(0.5, `rgba(${TORCH}, 0.04)`);
    glow.addColorStop(1, `rgba(${TORCH}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

function draw() {
  const { width, height } = fogCanvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (!rows || !cols || !placed) return;

  const cellW = width / cols;
  const cellH = height / rows;

  // Torches first, so the fog on top dims them where nobody can see.
  drawTorches(cellW, cellH);

  // One pixel per cell, scaled up with smoothing: soft gradients between
  // cells. The blur rounds off the remaining corners where supported.
  drawCells();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = `blur(${Math.min(cellW, cellH) * 0.3}px)`;
  ctx.drawImage(
    cellLayer,
    -cellW,
    -cellH,
    (cols + 2) * cellW,
    (rows + 2) * cellH,
  );
  ctx.filter = "none";
}

/** Redraws immediately (e.g. after tokens move, to follow the torches). */
export function redrawFog() {
  if (!frame) draw();
}

// Pure grid math: no DOM, no state. Covered by unit tests.

/** Bresenham line: every cell between (r0,c0) and (r1,c1), both inclusive. */
export function getLineCells(r0, c0, r1, c1) {
  const cells = [];
  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;
  let r = r0;
  let c = c0;
  while (true) {
    cells.push({ row: r, col: c });
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dc) {
      err -= dc;
      r += sr;
    }
    if (e2 < dr) {
      err += dr;
      c += sc;
    }
  }
  return cells;
}

/** Euclidean distance between two cells, in cells. */
export function cellDistance(a, b) {
  return Math.hypot(b.row - a.row, b.col - a.col);
}

/** Rows needed for square cells given a column count and image size. */
export function rowsForSquareCells(cols, imageWidth, imageHeight) {
  return Math.round((cols * imageHeight) / imageWidth);
}

/** Columns needed for square cells given a row count and image size. */
export function colsForSquareCells(rows, imageWidth, imageHeight) {
  return Math.round((rows * imageWidth) / imageHeight);
}

export function isSquareGrid(rows, cols, imageWidth, imageHeight) {
  if (!rows || !cols || !imageWidth || !imageHeight) return false;
  return Math.abs(imageWidth / imageHeight - cols / rows) < 0.02;
}

/**
 * Where to draw the grid inside a container showing an image scaled with
 * `background-size: contain`. Cells are square and the grid is centered on
 * the image.
 */
export function computeGridRect({
  containerWidth,
  containerHeight,
  imageWidth,
  imageHeight,
  rows,
  cols,
}) {
  const scale = Math.min(
    containerWidth / imageWidth,
    containerHeight / imageHeight,
  );
  const imgW = imageWidth * scale;
  const imgH = imageHeight * scale;
  const imgL = (containerWidth - imgW) / 2;
  const imgT = (containerHeight - imgH) / 2;
  const cell = Math.min(imgW / cols, imgH / rows);
  const width = cell * cols;
  const height = cell * rows;
  return {
    left: imgL + (imgW - width) / 2,
    top: imgT + (imgH - height) / 2,
    width,
    height,
  };
}

/** New rows × cols matrix filled with `value`. */
export function createMatrix(rows, cols, value) {
  return Array.from({ length: rows }, () => Array(cols).fill(value));
}

/** True when `m` is a matrix of exactly rows × cols. */
export function matrixMatches(m, rows, cols) {
  return (
    Array.isArray(m) &&
    m.length === rows &&
    m.every((row) => Array.isArray(row) && row.length === cols)
  );
}

/**
 * Copies `source` into a fresh rows × cols matrix. Cells missing from
 * `source`, or rejected by `accept`, get `fallback`.
 */
export function fitMatrix(source, rows, cols, fallback, accept = () => true) {
  const out = createMatrix(rows, cols, fallback);
  if (!Array.isArray(source)) return out;
  for (let r = 0; r < rows && r < source.length; r++) {
    const row = source[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < cols && c < row.length; c++) {
      if (accept(row[c])) out[r][c] = row[c];
    }
  }
  return out;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

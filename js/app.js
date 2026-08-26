let saveMapDataURL = null;

// ─── State ───
const state = {
  mapImage: null,
  gridRows: 15,
  gridCols: 20,
  cellStates: [], // 2D array: 'hidden' | 'visible' | 'revealed'
  characters: [], // { id, name, imageUrl, visionRadius }
  tokens: [], // { id, characterId, row, col }
  nextCharId: 1,
  nextTokenId: 1,
  dragSource: null, // { type: 'char'|'token', id }
  zoom: 1,
  panX: 0,
  panY: 0,
  measuring: false,
  measurePoints: [], // [{ row, col }, ...]
  currentTurnId: null, // character ID whose turn it is
  editingWalls: false,
  wallCells: [], // 2D boolean array: true = wall
  imageNaturalWidth: 0,
  imageNaturalHeight: 0,
};

// ─── DOM refs ───
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => p.querySelectorAll(s);

const mapBg = $("#map-bg");
const gridOverlay = $("#grid-overlay");
const fogOverlay = $("#fog-overlay");
const mapWrapper = $("#map-wrapper");
const charList = $("#char-list");
const mapContainer = $("#map-container");
const measureOverlay = $("#measure-overlay");
const measureMarkerA = $("#measure-marker-a");
const measureMarkerB = $("#measure-marker-b");
const measureLabel = $("#measure-label");
const measureLine = $("#measure-line");

// ─── Socket.IO sync ───
const socket = io();
let socketIgnoreNext = false;

function receiveFullState(data) {
  socketIgnoreNext = true;

  // Only apply if server has actual data
  if (
    data.gridRows > 0 ||
    data.characters?.length > 0 ||
    data.mapImage ||
    data.tokens?.length > 0
  ) {
    state.characters.forEach((c) => {
      if (c.imageUrl.startsWith("blob:")) URL.revokeObjectURL(c.imageUrl);
    });
    state.characters = [];
    state.tokens = [];
    if (state.mapImage) {
      if (state.mapImage.startsWith("blob:"))
        URL.revokeObjectURL(state.mapImage);
      state.mapImage = null;
      saveMapDataURL = null;
      mapBg.style.backgroundImage = "";
    }

    if (data.mapImage) {
      saveMapDataURL = data.mapImage;
      state.mapImage = data.mapImage;
      mapBg.style.backgroundImage = `url(${data.mapImage})`;
      const img = new Image();
      img.onload = () => {
        state.imageNaturalWidth = img.naturalWidth;
        state.imageNaturalHeight = img.naturalHeight;
      };
      img.src = data.mapImage;
    }

    state.nextCharId = 1;
    for (const c of data.characters) {
      state.characters.push({
        id: c.id,
        name: c.name,
        imageUrl: c.imageUrl,
        visionRadius: c.visionRadius || 5,
        isEnemy: c.isEnemy || false,
        initiative: c.initiative || null,
      });
      if (c.id >= state.nextCharId) state.nextCharId = c.id + 1;
    }

    state.zoom = data.zoom || 1;
    state.panX = data.panX || 0;
    state.panY = data.panY || 0;

    if (data.gridRows && data.gridCols) {
      generateGrid(data.gridRows, data.gridCols);
      state.cellStates = data.cellStates;
      if (data.wallCells) {
        for (let r = 0; r < state.gridRows && r < data.wallCells.length; r++) {
          for (
            let c = 0;
            c < state.gridCols && c < data.wallCells[r].length;
            c++
          ) {
            state.wallCells[r][c] = !!data.wallCells[r][c];
          }
        }
      }
      state.nextTokenId = 1;
      state.tokens = data.tokens.map((t) => {
        const token = { ...t };
        if (token.id >= state.nextTokenId) state.nextTokenId = token.id + 1;
        return token;
      });
      renderTokens();
      calculateVision();
      applyTransform();
      if (data.wallCells) applyWallCells();
      requestAnimationFrame(() => {
        updateGridLayout();
        updateGridInfo();
      });
    }

    state.currentTurnId = null;
    $("#turn-display").textContent = "—";
    state.measuring = false;
    clearMeasurement();
    state.editingWalls = false;
    fogOverlay.style.opacity = "1";
    $("#toggle-measure").classList.remove("active");
    $("#toggle-walls").classList.remove("active");
    renderCharacters();
  }
  socketIgnoreNext = false;
}

socket.on("connect", () => {});

socket.on("state:full", (data) => {
  if (socketIgnoreNext) return;
  receiveFullState(data);
});

socket.on("map:changed", (data) => {
  if (socketIgnoreNext) return;
  if (state.mapImage && state.mapImage.startsWith("blob:"))
    URL.revokeObjectURL(state.mapImage);
  state.mapImage = data.mapImage;
  saveMapDataURL = data.mapImage;
  mapBg.style.backgroundImage = `url(${data.mapImage})`;
  const img = new Image();
  img.onload = () => {
    state.imageNaturalWidth = img.naturalWidth;
    state.imageNaturalHeight = img.naturalHeight;
    requestAnimationFrame(() => {
      updateGridLayout();
      updateGridInfo();
    });
  };
  img.src = data.mapImage;
});

socket.on("grid:generated", (data) => {
  if (socketIgnoreNext) return;
  generateGrid(data.gridRows, data.gridCols);
  state.cellStates = data.cellStates;
  if (data.wallCells) {
    for (let r = 0; r < state.gridRows && r < data.wallCells.length; r++) {
      for (let c = 0; c < state.gridCols && c < data.wallCells[r].length; c++) {
        state.wallCells[r][c] = !!data.wallCells[r][c];
      }
    }
  }
  state.tokens = data.tokens;
  state.nextTokenId = data.nextTokenId;
  applyWallCells();
  renderTokens();
  calculateVision();
});

socket.on("character:added", (data) => {
  if (socketIgnoreNext) return;
  state.characters.push(data.character);
  if (data.nextCharId > state.nextCharId) state.nextCharId = data.nextCharId;
  renderCharacters();
});

socket.on("character:removed", (data) => {
  if (socketIgnoreNext) return;
  state.characters = state.characters.filter((c) => c.id !== data.charId);
  state.tokens = state.tokens.filter((t) => t.characterId !== data.charId);
  renderCharacters();
  renderTokens();
  calculateVision();
  renderInitiativeBar();
  renderTurnTracker();
});

socket.on("token:placed", (data) => {
  if (socketIgnoreNext) return;
  const existing = state.tokens.find((t) => t.characterId === data.characterId);
  if (existing) {
    existing.row = data.row;
    existing.col = data.col;
  } else {
    state.tokens.push(data.token);
    if (data.nextTokenId > state.nextTokenId)
      state.nextTokenId = data.nextTokenId;
  }
  renderTokens();
  calculateVision();
});

socket.on("token:removed", (data) => {
  if (socketIgnoreNext) return;
  state.tokens = state.tokens.filter((t) => t.id !== data.tokenId);
  renderTokens();
  calculateVision();
});

socket.on("fog:revealed", (data) => {
  if (socketIgnoreNext) return;
  for (const { row, col } of data.cells) {
    if (state.cellStates[row] && state.cellStates[row][col] !== undefined) {
      state.cellStates[row][col] = "revealed";
    }
  }
  calculateVision();
});

socket.on("fog:updated", (data) => {
  if (socketIgnoreNext) return;
  state.cellStates = data.cellStates;
  applyFog();
});

socket.on("walls:set", (data) => {
  if (socketIgnoreNext) return;
  state.wallCells = data.wallCells;
  applyFog();
  $$(".grid-cell.wall-cell", gridOverlay).forEach((el) =>
    el.classList.remove("wall-cell"),
  );
  applyWallCells();
  calculateVision();
});

socket.on("view:changed", (data) => {
  if (socketIgnoreNext) return;
  state.zoom = data.zoom;
  state.panX = data.panX;
  state.panY = data.panY;
  applyTransform();
});

socket.on("initiative:changed", (data) => {
  if (socketIgnoreNext) return;
  const char = state.characters.find((c) => c.id === data.charId);
  if (char) {
    char.initiative = data.initiative;
    renderCharacters();
    renderInitiativeBar();
    renderTurnTracker();
  }
});

socket.on("turn:changed", (data) => {
  if (socketIgnoreNext) return;
  state.currentTurnId = data.charId;
  renderTurnTracker();
});

socket.on("state:cleared", () => {
  if (socketIgnoreNext) return;
  state.characters.forEach((c) => {
    if (c.imageUrl.startsWith("blob:")) URL.revokeObjectURL(c.imageUrl);
  });
  state.characters = [];
  state.tokens = [];
  if (state.mapImage) {
    if (state.mapImage.startsWith("blob:")) URL.revokeObjectURL(state.mapImage);
    state.mapImage = null;
    saveMapDataURL = null;
    mapBg.style.backgroundImage = "";
  }
  gridOverlay.innerHTML = "";
  gridOverlay.classList.remove("has-grid");
  fogOverlay.innerHTML = "";
  state.cellStates = [];
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  applyTransform();
  state.measuring = false;
  clearMeasurement();
  state.currentTurnId = null;
  state.editingWalls = false;
  state.wallCells = [];
  state.imageNaturalWidth = 0;
  state.imageNaturalHeight = 0;
  fogOverlay.style.opacity = "1";
  $("#toggle-measure").classList.remove("active");
  $("#toggle-walls").classList.remove("active");
  $("#turn-display").textContent = "—";
  renderCharacters();
  renderInitiativeBar();
});

// ─── Zoom / Pan ───
function applyTransform() {
  mapWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
}

function zoomAtPoint(newZoom, cx, cy) {
  const rect = mapContainer.getBoundingClientRect();
  const mx = cx - rect.left;
  const my = cy - rect.top;
  const prev = state.zoom;
  state.panX = mx - (mx - state.panX) * (newZoom / prev);
  state.panY = my - (my - state.panY) * (newZoom / prev);
  state.zoom = Math.min(5, Math.max(0.1, newZoom));
  applyTransform();
}

mapContainer.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomAtPoint(state.zoom * dir, e.clientX, e.clientY);
    if (!socketIgnoreNext)
      socket.emit("view:changed", {
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
      });
  },
  { passive: false },
);

// ─── Pan via drag ───
let panState = null;

mapContainer.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (
    e.target.closest(".token") ||
    (e.target.closest(".grid-cell") &&
      e.target.closest(".grid-cell").querySelector(".token"))
  )
    return;
  if (state.measuring && e.target.closest(".grid-cell")) return;
  panState = {
    startX: e.clientX,
    startY: e.clientY,
    panX: state.panX,
    panY: state.panY,
  };
  mapContainer.classList.add("panning");
  e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  if (!panState) return;
  state.panX = panState.panX + (e.clientX - panState.startX);
  state.panY = panState.panY + (e.clientY - panState.startY);
  applyTransform();
});

document.addEventListener("mouseup", () => {
  if (!panState) return;
  panState = null;
  mapContainer.classList.remove("panning");
  if (!socketIgnoreNext)
    socket.emit("view:changed", {
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
    });
});

// ─── Map upload ───
$("#map-upload").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (state.mapImage && state.mapImage.startsWith("blob:"))
    URL.revokeObjectURL(state.mapImage);
  state.mapImage = url;
  mapBg.style.backgroundImage = `url(${url})`;

  const tempImg = new Image();
  tempImg.onload = () => {
    state.imageNaturalWidth = tempImg.naturalWidth;
    state.imageNaturalHeight = tempImg.naturalHeight;
    if (gridOverlay.classList.contains("has-grid")) updateGridLayout();
    else autoFitGrid(false);
    updateGridInfo();
  };
  tempImg.src = url;

  const reader = new FileReader();
  reader.onload = () => {
    saveMapDataURL = reader.result;
    if (!socketIgnoreNext)
      socket.emit("map:changed", { mapImage: reader.result });
  };
  reader.readAsDataURL(file);
});

function updateGridLayout() {
  if (!state.gridRows || !state.gridCols) return;
  if (!state.imageNaturalWidth || !state.imageNaturalHeight) {
    gridOverlay.style.left = "0";
    gridOverlay.style.top = "0";
    gridOverlay.style.width = "100%";
    gridOverlay.style.height = "100%";
    fogOverlay.style.left = "0";
    fogOverlay.style.top = "0";
    fogOverlay.style.width = "100%";
    fogOverlay.style.height = "100%";
    return;
  }
  const cw = mapWrapper.clientWidth;
  const ch = mapWrapper.clientHeight;
  if (!cw || !ch) return;
  const iw = state.imageNaturalWidth,
    ih = state.imageNaturalHeight;
  const scale = Math.min(cw / iw, ch / ih);
  const imgW = iw * scale,
    imgH = ih * scale;
  const imgL = (cw - imgW) / 2,
    imgT = (ch - imgH) / 2;
  const cell = Math.min(imgW / state.gridCols, imgH / state.gridRows);
  const gridW = cell * state.gridCols,
    gridH = cell * state.gridRows;
  const gridL = imgL + (imgW - gridW) / 2,
    gridT = imgT + (imgH - gridH) / 2;
  for (const el of [gridOverlay, fogOverlay]) {
    el.style.left = gridL + "px";
    el.style.top = gridT + "px";
    el.style.width = gridW + "px";
    el.style.height = gridH + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
  }
}

function updateGridInfo() {
  const info = document.getElementById("grid-info");
  if (!info) return;
  if (!state.imageNaturalWidth) {
    info.textContent = "";
    return;
  }
  const aspectImg = (
    state.imageNaturalWidth / state.imageNaturalHeight
  ).toFixed(2);
  const aspectGrid = (state.gridCols / state.gridRows).toFixed(2);
  const square =
    Math.abs(
      state.imageNaturalWidth / state.imageNaturalHeight -
        state.gridCols / state.gridRows,
    ) < 0.02;
  info.textContent = `Imagen ${state.imageNaturalWidth}×${state.imageNaturalHeight} · Celda ${square ? "cuadrada ✓" : "rectangular — pulsa Ajustar"}`;
}

function autoFitGrid(generate = true) {
  if (!state.imageNaturalWidth || !state.imageNaturalHeight) {
    alert("Carga un mapa primero");
    return;
  }
  const cols =
    parseInt(document.getElementById("grid-cols").value) || state.gridCols;
  const rows = Math.round(
    (cols * state.imageNaturalHeight) / state.imageNaturalWidth,
  );
  document.getElementById("grid-rows").value = rows;
  document.getElementById("grid-cols").value = cols;
  if (generate) {
    generateGrid(rows, cols);
    clearMeasurement();
    if (!socketIgnoreNext)
      socket.emit("grid:generated", {
        gridRows: state.gridRows,
        gridCols: state.gridCols,
        cellStates: state.cellStates,
        wallCells: state.wallCells,
        tokens: state.tokens,
        nextTokenId: state.nextTokenId,
      });
  }
  updateGridInfo();
}

window.addEventListener("resize", () => {
  if (gridOverlay.classList.contains("has-grid")) updateGridLayout();
});

// ─── Grid ───
function generateGrid(rows, cols) {
  state.gridRows = rows;
  state.gridCols = cols;

  // Init cell states
  state.cellStates = [];
  state.wallCells = [];
  for (let r = 0; r < rows; r++) {
    state.cellStates[r] = [];
    state.wallCells[r] = [];
    for (let c = 0; c < cols; c++) {
      state.cellStates[r][c] = "hidden";
      state.wallCells[r][c] = false;
    }
  }

  gridOverlay.innerHTML = "";
  gridOverlay.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridOverlay.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  gridOverlay.classList.add("has-grid");

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;

      cell.addEventListener("dragover", (e) => {
        e.preventDefault();
        cell.classList.add("drag-over");
      });
      cell.addEventListener("dragleave", () => {
        cell.classList.remove("drag-over");
      });
      cell.addEventListener("drop", (e) => {
        e.preventDefault();
        cell.classList.remove("drag-over");
        handleDrop(r, c, e);
      });
      cell.addEventListener("auxclick", (e) => {
        if (e.button === 1) {
          e.preventDefault();
          toggleReveal(r, c);
        }
      });
      cell.addEventListener("click", (e) => {
        if (state.editingWalls) {
          toggleWall(r, c);
          return;
        }
        if (e.shiftKey) {
          toggleReveal(r, c);
          return;
        }
        if (state.measuring) {
          e.stopPropagation();
          handleMeasureClick(r, c);
        }
      });

      gridOverlay.appendChild(cell);
    }
  }

  generateFog();
  renderTokens();
  calculateVision();
  requestAnimationFrame(() => {
    updateGridLayout();
    updateGridInfo();
  });
}

function generateFog() {
  fogOverlay.innerHTML = "";
  fogOverlay.style.gridTemplateColumns = `repeat(${state.gridCols}, 1fr)`;
  fogOverlay.style.gridTemplateRows = `repeat(${state.gridRows}, 1fr)`;
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      const cell = document.createElement("div");
      cell.className = "fog-cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      fogOverlay.appendChild(cell);
    }
  }
  applyFog();
}

function applyFog() {
  const cells = fogOverlay.children;
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      const idx = r * state.gridCols + c;
      const el = cells[idx];
      el.className = "fog-cell " + state.cellStates[r][c];
    }
  }
}

function calculateVision() {
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      if (state.cellStates[r][c] !== "revealed") {
        state.cellStates[r][c] = "hidden";
      }
    }
  }

  for (const token of state.tokens) {
    const char = state.characters.find((c) => c.id === token.characterId);
    if (!char || char.isEnemy) continue;
    const radius = char.visionRadius;
    for (
      let r = Math.max(0, token.row - radius);
      r <= Math.min(state.gridRows - 1, token.row + radius);
      r++
    ) {
      for (
        let c = Math.max(0, token.col - radius);
        c <= Math.min(state.gridCols - 1, token.col + radius);
        c++
      ) {
        const dist = Math.sqrt((r - token.row) ** 2 + (c - token.col) ** 2);
        if (dist > radius) continue;
        if (state.cellStates[r][c] === "revealed") continue;

        // Ray casting: check walls along line
        const line = getLineCells(token.row, token.col, r, c);
        let blocked = false;
        for (let i = 1; i < line.length - 1; i++) {
          if (state.wallCells[line[i].row]?.[line[i].col]) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          state.cellStates[r][c] = "visible";
        }
      }
    }
  }

  applyFog();
  if (!socketIgnoreNext)
    socket.emit("fog:updated", { cellStates: state.cellStates });
}

function toggleReveal(row, col) {
  if (state.cellStates[row][col] === "revealed") {
    state.cellStates[row][col] = "hidden";
  } else {
    state.cellStates[row][col] = "revealed";
  }
  calculateVision();
  if (!socketIgnoreNext) socket.emit("fog:revealed", { cells: [{ row, col }] });
}

// ─── Initiative ───
function editInitiative(char) {
  const newVal = prompt(
    `Iniciativa para ${char.name}:`,
    char.initiative != null ? char.initiative : "",
  );
  if (newVal === null) return;
  const trimmed = newVal.trim();
  char.initiative = trimmed ? parseInt(trimmed) : null;
  if (isNaN(char.initiative)) char.initiative = null;
  renderInitiativeBar();
  renderCharacters();
  if (!socketIgnoreNext)
    socket.emit("initiative:changed", {
      charId: char.id,
      initiative: char.initiative,
    });
}

function renderInitiativeBar() {
  const bar = $("#initiative-bar");
  if (!bar) return;
  bar.innerHTML = "";

  const entries = [];
  for (const token of state.tokens) {
    const char = state.characters.find((c) => c.id === token.characterId);
    if (char && char.initiative != null) {
      entries.push({ token, char });
    }
  }

  entries.sort((a, b) => b.char.initiative - a.char.initiative);

  for (const { char } of entries) {
    const isCurrent = state.currentTurnId === char.id;
    const item = document.createElement("div");
    item.className = "initiative-item" + (isCurrent ? " current-turn" : "");
    item.title = `${char.name} (Init: ${char.initiative})`;

    const img = document.createElement("div");
    img.className = "initiative-image";
    img.style.backgroundImage = `url(${char.imageUrl})`;

    const value = document.createElement("span");
    value.className = "initiative-value";
    value.textContent = char.initiative;
    value.addEventListener("click", (e) => {
      e.stopPropagation();
      editInitiative(char);
    });

    item.appendChild(img);
    item.appendChild(value);
    bar.appendChild(item);
  }
}

// ─── Walls ───
$("#toggle-walls").addEventListener("click", () => {
  state.editingWalls = !state.editingWalls;
  $("#toggle-walls").classList.toggle("active");
  fogOverlay.style.opacity = state.editingWalls ? "0" : "1";
  $$(".grid-cell", gridOverlay).forEach((el) =>
    el.classList.toggle("wall-edit", state.editingWalls),
  );
  if (state.editingWalls) {
    applyWallCells();
  } else {
    $$(".grid-cell.wall-cell", gridOverlay).forEach((el) =>
      el.classList.remove("wall-cell"),
    );
  }
});

$("#clear-walls").addEventListener("click", () => {
  if (!confirm("¿Limpiar todas las paredes?")) return;
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      state.wallCells[r][c] = false;
    }
  }
  $$(".grid-cell.wall-cell", gridOverlay).forEach((el) =>
    el.classList.remove("wall-cell"),
  );
  calculateVision();
  if (!socketIgnoreNext)
    socket.emit("walls:set", { wallCells: state.wallCells });
});

function toggleWall(row, col) {
  state.wallCells[row][col] = !state.wallCells[row][col];
  const cell = $(`[data-row="${row}"][data-col="${col}"]`, gridOverlay);
  if (cell) cell.classList.toggle("wall-cell", state.wallCells[row][col]);
  calculateVision();
  if (!socketIgnoreNext)
    socket.emit("walls:set", { wallCells: state.wallCells });
}

function applyWallCells() {
  if (!state.editingWalls) {
    $$(".grid-cell.wall-cell", gridOverlay).forEach((el) =>
      el.classList.remove("wall-cell"),
    );
    return;
  }
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      const cell = $(`[data-row="${r}"][data-col="${c}"]`, gridOverlay);
      if (cell) cell.classList.toggle("wall-cell", state.wallCells[r][c]);
    }
  }
}

// Bresenham line: returns all cells between (r0,c0) and (r1,c1) inclusive
function getLineCells(r0, c0, r1, c1) {
  const cells = [];
  let dr = Math.abs(r1 - r0);
  let dc = Math.abs(c1 - c0);
  let sr = r0 < r1 ? 1 : -1;
  let sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;
  let r = r0,
    c = c0;
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

// ─── Auto-adjust rows/cols to keep cells square ───
const gridRowsInput = $("#grid-rows");
const gridColsInput = $("#grid-cols");

gridRowsInput.addEventListener("change", () => {
  if (state.imageNaturalWidth && state.imageNaturalHeight) {
    const rows = parseInt(gridRowsInput.value) || 1;
    gridColsInput.value = Math.round(
      (rows * state.imageNaturalWidth) / state.imageNaturalHeight,
    );
  }
});

gridColsInput.addEventListener("change", () => {
  if (state.imageNaturalWidth && state.imageNaturalHeight) {
    const cols = parseInt(gridColsInput.value) || 1;
    gridRowsInput.value = Math.round(
      (cols * state.imageNaturalHeight) / state.imageNaturalWidth,
    );
  }
});

$("#grid-generate").addEventListener("click", () => {
  const rows = parseInt($("#grid-rows").value) || 15;
  const cols = parseInt($("#grid-cols").value) || 20;
  generateGrid(rows, cols);
  clearMeasurement();
  if (!socketIgnoreNext)
    socket.emit("grid:generated", {
      gridRows: state.gridRows,
      gridCols: state.gridCols,
      cellStates: state.cellStates,
      wallCells: state.wallCells,
      tokens: state.tokens,
      nextTokenId: state.nextTokenId,
    });
});

$("#grid-fit").addEventListener("click", () => autoFitGrid(true));

// ─── Measurement ───
$("#toggle-measure").addEventListener("click", () => {
  state.measuring = !state.measuring;
  $("#toggle-measure").classList.toggle("active");
  if (!state.measuring) {
    clearMeasurement();
  } else {
    state.measurePoints = [];
    $("#measure-info").textContent = "Haz clic en una celda para empezar";
  }
});

function handleMeasureClick(row, col) {
  if (state.measurePoints.length >= 2) {
    state.measurePoints = [];
  }
  state.measurePoints.push({ row, col });
  updateMeasurement();
}

function clearMeasurement() {
  state.measurePoints = [];
  measureMarkerA.style.display = "none";
  measureMarkerB.style.display = "none";
  measureLabel.style.display = "none";
  measureLine.style.display = "none";
  $$(".grid-cell.measure-a, .grid-cell.measure-b", gridOverlay).forEach(
    (el) => {
      el.classList.remove("measure-a", "measure-b");
    },
  );
  $("#measure-info").textContent = "";
}

function getCellCenter(row, col) {
  const cell = $(`[data-row="${row}"][data-col="${col}"]`, gridOverlay);
  if (!cell) return null;
  const wrapperRect = mapWrapper.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  return {
    x: cellRect.left + cellRect.width / 2 - wrapperRect.left,
    y: cellRect.top + cellRect.height / 2 - wrapperRect.top,
  };
}

function updateMeasurement() {
  const pts = state.measurePoints;
  $$(".grid-cell.measure-a, .grid-cell.measure-b", gridOverlay).forEach(
    (el) => {
      el.classList.remove("measure-a", "measure-b");
    },
  );

  if (pts.length >= 1) {
    const cellA = $(
      `[data-row="${pts[0].row}"][data-col="${pts[0].col}"]`,
      gridOverlay,
    );
    if (cellA) cellA.classList.add("measure-a");
    const posA = getCellCenter(pts[0].row, pts[0].col);
    if (posA) {
      measureMarkerA.style.left = posA.x + "px";
      measureMarkerA.style.top = posA.y + "px";
      measureMarkerA.style.display = "block";
    }
  }

  if (pts.length >= 2) {
    const cellB = $(
      `[data-row="${pts[1].row}"][data-col="${pts[1].col}"]`,
      gridOverlay,
    );
    if (cellB) cellB.classList.add("measure-b");
    const posA = getCellCenter(pts[0].row, pts[0].col);
    const posB = getCellCenter(pts[1].row, pts[1].col);
    if (posA && posB) {
      measureMarkerB.style.left = posB.x + "px";
      measureMarkerB.style.top = posB.y + "px";
      measureMarkerB.style.display = "block";

      // Draw line
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      measureLine.style.left = posA.x + "px";
      measureLine.style.top = posA.y + "px";
      measureLine.style.width = len + "px";
      measureLine.style.transform = `rotate(${angle}deg)`;
      measureLine.style.display = "block";

      // Label
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;
      const dr = Math.abs(pts[1].row - pts[0].row);
      const dc = Math.abs(pts[1].col - pts[0].col);
      const euclid = Math.sqrt(dr * dr + dc * dc);
      measureLabel.textContent = `${euclid.toFixed(1)} casillas`;
      measureLabel.style.left = midX + "px";
      measureLabel.style.top = midY - 24 + "px";
      measureLabel.style.display = "block";

      $("#measure-info").textContent = `${euclid.toFixed(1)} casillas`;
    }
  }

  if (pts.length === 0) {
    measureMarkerA.style.display = "none";
    measureMarkerB.style.display = "none";
    measureLabel.style.display = "none";
    measureLine.innerHTML = "";
  }

  if (pts.length === 1) {
    measureMarkerB.style.display = "none";
    measureLabel.style.display = "none";
    measureLine.style.display = "none";
    $("#measure-info").textContent = "Haz clic en otra celda";
  }
}

// ─── Turn tracker ───
function getInitiativeEntries() {
  const entries = [];
  for (const token of state.tokens) {
    const char = state.characters.find((c) => c.id === token.characterId);
    if (char && char.initiative != null) {
      entries.push({ token, char });
    }
  }
  entries.sort((a, b) => b.char.initiative - a.char.initiative);
  return entries;
}

function renderTurnTracker() {
  const display = $("#turn-display");
  const entries = getInitiativeEntries();

  if (entries.length === 0) {
    display.textContent = "—";
    state.currentTurnId = null;
    return;
  }

  if (state.currentTurnId) {
    const current = entries.find((e) => e.char.id === state.currentTurnId);
    if (!current) {
      // Current character no longer on board with initiative
      state.currentTurnId = entries[0].char.id;
    }
  } else {
    state.currentTurnId = entries[0].char.id;
  }

  const current = state.characters.find((c) => c.id === state.currentTurnId);
  if (current) {
    display.innerHTML = `<span style="color:#fff">${current.name}</span> — Init ${current.initiative}`;
  }

  renderInitiativeBar();
}

$("#turn-start").addEventListener("click", () => {
  const entries = getInitiativeEntries();
  if (entries.length === 0) {
    alert("No hay personajes con iniciativa en el tablero.");
    return;
  }
  state.currentTurnId = entries[0].char.id;
  renderTurnTracker();
  if (!socketIgnoreNext)
    socket.emit("turn:changed", { charId: state.currentTurnId });
});

$("#turn-next").addEventListener("click", () => {
  const entries = getInitiativeEntries();
  if (entries.length === 0) return;
  if (!state.currentTurnId) {
    state.currentTurnId = entries[0].char.id;
  } else {
    const idx = entries.findIndex((e) => e.char.id === state.currentTurnId);
    const nextIdx = (idx + 1) % entries.length;
    state.currentTurnId = entries[nextIdx].char.id;
  }
  renderTurnTracker();
  if (!socketIgnoreNext)
    socket.emit("turn:changed", { charId: state.currentTurnId });
});

// ─── Token Editor Modal ───
const editorModal = $("#token-editor");
const editorSource = $("#editor-source");
const editorCanvas = $("#editor-canvas");
const editorColor = $("#editor-color");
const editorClass = $("#editor-class");
const editorEnemy = $("#editor-enemy");
const editorVisionLabel = $("#editor-vision-label");

let editorPendingFile = null;
let editorPendingName = "";
let editorSourceImg = null;
let editorZoomLevel = 1;
let editorPanX = 0;
let editorPanY = 0;
let editorPanState = null;

function renderTokenPreview() {
  if (!editorSourceImg) return;
  const color = editorColor.value;
  const zoom = editorZoomLevel;
  createTokenImage(
    editorSourceImg,
    color,
    zoom,
    editorPanX,
    editorPanY,
    (dataUrl) => {
      const ctx = editorCanvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, 150, 150);
        ctx.drawImage(img, 0, 0, 150, 150);
      };
      img.src = dataUrl;
    },
  );
}

editorColor.addEventListener("input", () => {
  editorClass.value = "";
  renderTokenPreview();
});
editorClass.addEventListener("change", () => {
  if (editorClass.value) {
    editorColor.value = editorClass.value;
    renderTokenPreview();
  }
});
editorEnemy.addEventListener("change", () => {
  editorVisionLabel.style.display = editorEnemy.checked ? "none" : "";
});

// Zoom with wheel on canvas, pan with drag
editorCanvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const dir = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  editorZoomLevel = Math.min(3, Math.max(0.5, editorZoomLevel * dir));
  renderTokenPreview();
});

editorCanvas.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  editorPanState = {
    startX: e.clientX,
    startY: e.clientY,
    panX: editorPanX,
    panY: editorPanY,
  };
  editorCanvas.style.cursor = "grabbing";
  e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  if (!editorPanState) return;
  editorPanX = editorPanState.panX + (e.clientX - editorPanState.startX) * 2;
  editorPanY = editorPanState.panY + (e.clientY - editorPanState.startY) * 2;
  renderTokenPreview();
});

document.addEventListener("mouseup", () => {
  if (!editorPanState) return;
  editorPanState = null;
  editorCanvas.style.cursor = "grab";
});

$("#editor-cancel").addEventListener("click", () => {
  editorModal.classList.add("hidden");
  editorZoomLevel = 1;
  editorPanX = 0;
  editorPanY = 0;
  editorPendingFile = null;
  editorSourceImg = null;
  $("#editor-initiative").value = "";
});

$("#editor-confirm").addEventListener("click", () => {
  if (!editorSourceImg) return;
  const color = editorColor.value;
  const zoom = editorZoomLevel;

  createTokenImage(
    editorSourceImg,
    color,
    zoom,
    editorPanX,
    editorPanY,
    (dataUrl) => {
      const initVal = $("#editor-initiative").value.trim();
      const char = {
        id: state.nextCharId,
        name: editorPendingName,
        imageUrl: dataUrl,
        visionRadius: parseInt($("#editor-vision").value) || 5,
        isEnemy: $("#editor-enemy").checked,
        initiative: initVal ? parseInt(initVal) : null,
      };
      state.nextCharId++;
      state.characters.push(char);
      renderCharacters();
      editorModal.classList.add("hidden");
      $("#char-upload").value = "";
      $("#char-name").value = "";
      $("#editor-initiative").value = "";
      editorZoomLevel = 1;
      editorPanX = 0;
      editorPanY = 0;
      editorPendingFile = null;
      editorSourceImg = null;
      if (!socketIgnoreNext)
        socket.emit("character:added", {
          character: char,
          nextCharId: state.nextCharId,
        });
    },
  );
});

function createTokenImage(img, borderColor, zoom, panX, panY, callback) {
  const size = 300;
  const border = 10;
  const outerR = size / 2 - 2;
  const innerR = outerR - border;
  const cx = size / 2;
  const cy = size / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = img.naturalWidth || img.width;
  srcCanvas.height = img.naturalHeight || img.height;
  const srcCtx = srcCanvas.getContext("2d");
  srcCtx.drawImage(img, 0, 0);

  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.clip();

  const baseScale = Math.min(
    (innerR * 2) / srcCanvas.width,
    (innerR * 2) / srcCanvas.height,
  );
  const scale = baseScale * zoom;
  const w = srcCanvas.width * scale;
  const h = srcCanvas.height * scale;
  ctx.drawImage(srcCanvas, cx - w / 2 + panX, cy - h / 2 + panY, w, h);
  ctx.restore();

  callback(canvas.toDataURL("image/png"));
}

// ─── Character upload → open editor ───
$("#char-add").addEventListener("click", () => {
  const fileInput = $("#char-upload");
  const nameInput = $("#char-name");
  const file = fileInput.files[0];
  const name = nameInput.value.trim() || "Personaje";
  if (!file) return;

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    editorSource.src = url;
    editorPendingFile = file;
    editorPendingName = name;
    editorSourceImg = img;
    renderTokenPreview();
    editorModal.classList.remove("hidden");
  };
  img.src = url;
});

function renderCharacters() {
  charList.innerHTML = "";
  for (const char of state.characters) {
    const div = document.createElement("div");
    div.className = "char-item";
    div.draggable = true;
    div.dataset.charId = char.id;

    const img = document.createElement("img");
    img.src = char.imageUrl;
    img.alt = char.name;

    const span = document.createElement("span");
    span.textContent = (char.isEnemy ? "[E] " : "[A] ") + char.name;

    const initSpan = document.createElement("span");
    initSpan.className = "char-initiative";
    initSpan.textContent = char.initiative != null ? char.initiative : "—";
    if (char.initiative == null) initSpan.classList.add("none");
    initSpan.title = "Click para editar iniciativa";
    initSpan.addEventListener("click", (e) => {
      e.stopPropagation();
      editInitiative(char);
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-char";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeCharacter(char.id);
    });

    div.appendChild(img);
    div.appendChild(span);
    div.appendChild(initSpan);
    div.appendChild(removeBtn);

    div.addEventListener("dragstart", (e) => {
      state.dragSource = { type: "char", id: char.id };
      e.dataTransfer.setData("text/plain", `char:${char.id}`);
      div.classList.add("dragging");
    });
    div.addEventListener("dragend", () => {
      div.classList.remove("dragging");
      state.dragSource = null;
    });

    charList.appendChild(div);
  }
}

function removeCharacter(charId) {
  state.tokens = state.tokens.filter((t) => t.characterId !== charId);
  state.characters = state.characters.filter((c) => c.id !== charId);
  renderCharacters();
  renderTokens();
  calculateVision();
  renderInitiativeBar();
  if (!socketIgnoreNext) socket.emit("character:removed", { charId });
}

// ─── Tokens (place / move) ───
function handleDrop(row, col, e) {
  const data = e.dataTransfer.getData("text/plain");

  if (data.startsWith("char:")) {
    const charId = parseInt(data.split(":")[1]);
    const existing = state.tokens.find((t) => t.characterId === charId);
    if (existing) {
      existing.row = row;
      existing.col = col;
      renderTokens();
      calculateVision();
      if (!socketIgnoreNext)
        socket.emit("token:placed", {
          characterId: charId,
          row,
          col,
          token: existing,
          nextTokenId: state.nextTokenId,
        });
    } else {
      const token = { id: state.nextTokenId++, characterId: charId, row, col };
      state.tokens.push(token);
      renderTokens();
      calculateVision();
      if (!socketIgnoreNext)
        socket.emit("token:placed", {
          characterId: charId,
          row,
          col,
          token,
          nextTokenId: state.nextTokenId,
        });
    }
    return;
  }

  if (data.startsWith("token:")) {
    const tokenId = parseInt(data.split(":")[1]);
    const token = state.tokens.find((t) => t.id === tokenId);
    if (token) {
      token.row = row;
      token.col = col;
      renderTokens();
      calculateVision();
      if (!socketIgnoreNext)
        socket.emit("token:placed", {
          characterId: token.characterId,
          row,
          col,
          token,
          nextTokenId: state.nextTokenId,
        });
    }
  }
}

function renderTokens() {
  // Remove old token elements
  $$(".token", gridOverlay).forEach((el) => el.remove());

  for (const token of state.tokens) {
    const char = state.characters.find((c) => c.id === token.characterId);
    if (!char) continue;

    const cell = $(
      `[data-row="${token.row}"][data-col="${token.col}"]`,
      gridOverlay,
    );
    if (!cell) continue;

    const el = document.createElement("div");
    el.className = "token";
    el.dataset.tokenId = token.id;
    el.style.backgroundImage = `url(${char.imageUrl})`;
    el.draggable = true;
    el.title = char.name;

    el.addEventListener("auxclick", (e) => {
      if (e.button === 1) {
        e.stopPropagation();
        removeToken(token.id);
      }
    });

    el.addEventListener("mouseenter", () => {
      hoveredTokenId = token.id;
    });
    el.addEventListener("mouseleave", () => {
      if (hoveredTokenId === token.id) hoveredTokenId = null;
    });

    el.addEventListener("dragstart", (e) => {
      state.dragSource = { type: "token", id: token.id };
      e.dataTransfer.setData("text/plain", `token:${token.id}`);
      el.classList.add("dragging");
      e.stopPropagation();
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      state.dragSource = null;
    });

    cell.appendChild(el);
  }
  renderInitiativeBar();
  renderTurnTracker();
}

function removeToken(tokenId) {
  state.tokens = state.tokens.filter((t) => t.id !== tokenId);
  renderTokens();
  calculateVision();
  renderInitiativeBar();
  renderTurnTracker();
  if (!socketIgnoreNext) socket.emit("token:removed", { tokenId });
}

// ─── Save / Load ───
function saveState() {
  if (state.gridRows === 0 || state.gridCols === 0) {
    alert("No hay partida que guardar. Genera una cuadrícula primero.");
    return;
  }

  const data = {
    version: 1,
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    cellStates: state.cellStates,
    characters: state.characters.map((c) => ({
      id: c.id,
      name: c.name,
      imageUrl: c.imageUrl,
      visionRadius: c.visionRadius,
      isEnemy: c.isEnemy || false,
      initiative: c.initiative || null,
    })),
    tokens: state.tokens.map((t) => ({
      id: t.id,
      characterId: t.characterId,
      row: t.row,
      col: t.col,
    })),
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    mapImage: saveMapDataURL || null,
    wallCells: state.wallCells,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "partida.dndmap";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadState(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.version) throw new Error("Formato no válido");

      // Clear current state
      state.characters.forEach((c) => URL.revokeObjectURL(c.imageUrl));
      state.characters = [];
      state.tokens = [];
      if (state.mapImage) {
        URL.revokeObjectURL(state.mapImage);
        state.mapImage = null;
        saveMapDataURL = null;
        mapBg.style.backgroundImage = "";
      }

      // Restore map
      if (data.mapImage) {
        saveMapDataURL = data.mapImage;
        state.mapImage = data.mapImage;
        mapBg.style.backgroundImage = `url(${data.mapImage})`;
      }

      // Restore characters
      state.nextCharId = 1;
      for (const c of data.characters) {
        state.characters.push({
          id: c.id,
          name: c.name,
          imageUrl: c.imageUrl,
          visionRadius: c.visionRadius || 5,
          isEnemy: c.isEnemy || false,
          initiative: c.initiative || null,
        });
        if (c.id >= state.nextCharId) state.nextCharId = c.id + 1;
      }

      // Restore zoom/pan
      state.zoom = data.zoom || 1;
      state.panX = data.panX || 0;
      state.panY = data.panY || 0;

      // Generate grid and restore state
      generateGrid(data.gridRows, data.gridCols);
      state.cellStates = data.cellStates;
      // Restore walls (backwards-compatible: default to all false)
      if (data.wallCells) {
        for (let r = 0; r < state.gridRows && r < data.wallCells.length; r++) {
          for (
            let c = 0;
            c < state.gridCols && c < data.wallCells[r].length;
            c++
          ) {
            state.wallCells[r][c] = !!data.wallCells[r][c];
          }
        }
      }
      state.nextTokenId = 1;
      state.tokens = data.tokens.map((t) => {
        const token = { ...t };
        if (token.id >= state.nextTokenId) state.nextTokenId = token.id + 1;
        return token;
      });

      renderCharacters();
      renderTokens();
      calculateVision();
      applyTransform();
    } catch (err) {
      alert("Error al cargar la partida: " + err.message);
    }
  };
  reader.readAsText(file);
}

$("#save-state").addEventListener("click", saveState);

$("#load-state").addEventListener("click", () => {
  $("#load-input").click();
});

$("#load-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  loadState(file);
  e.target.value = "";
});

// ─── Export / Import characters ───
$("#export-chars").addEventListener("click", () => {
  if (state.characters.length === 0) {
    alert("No hay personajes para exportar.");
    return;
  }
  const data = state.characters.map((c) => ({
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    visionRadius: c.visionRadius,
    isEnemy: c.isEnemy || false,
    initiative: c.initiative || null,
  }));
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "personajes.dndchars";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

$("#import-chars").addEventListener("click", () => {
  $("#import-chars-input").click();
});

$("#import-chars-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const chars = JSON.parse(reader.result);
      if (!Array.isArray(chars)) throw new Error("Formato no válido");
      for (const c of chars) {
        state.characters.push({
          id: state.nextCharId++,
          name: c.name,
          imageUrl: c.imageUrl,
          visionRadius: c.visionRadius || 5,
          isEnemy: c.isEnemy || false,
          initiative: c.initiative || null,
        });
      }
      renderCharacters();
    } catch (err) {
      alert("Error al importar personajes: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

// ─── Clear all ───
$("#clear-all").addEventListener("click", () => {
  if (!confirm("¿Limpiar todo?")) return;
  socket.emit("state:cleared");
  state.characters.forEach((c) => {
    if (c.imageUrl.startsWith("blob:")) URL.revokeObjectURL(c.imageUrl);
  });
  state.characters = [];
  state.tokens = [];
  if (state.mapImage) {
    if (state.mapImage.startsWith("blob:")) URL.revokeObjectURL(state.mapImage);
    state.mapImage = null;
    saveMapDataURL = null;
    mapBg.style.backgroundImage = "";
  }
  gridOverlay.innerHTML = "";
  gridOverlay.classList.remove("has-grid");
  fogOverlay.innerHTML = "";
  state.cellStates = [];
  state.wallCells = [];
  state.imageNaturalWidth = 0;
  state.imageNaturalHeight = 0;
  state.measuring = false;
  clearMeasurement();
  state.currentTurnId = null;
  state.editingWalls = false;
  fogOverlay.style.opacity = "1";
  $("#toggle-measure").classList.remove("active");
  $("#toggle-walls").classList.remove("active");
  $("#turn-display").textContent = "—";
  renderCharacters();
});

// ─── Sidebar toggle ───
const sidebar = $("#sidebar");
const sidebarToggle = $("#sidebar-toggle");
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  sidebarToggle.classList.toggle("collapsed");
  sidebarToggle.textContent = sidebar.classList.contains("collapsed")
    ? "☰"
    : "◀";
});

// ─── Keyboard: D to delete hovered token ───
let hoveredTokenId = null;

document.addEventListener("keydown", (e) => {
  if ((e.key === "d" || e.key === "D") && hoveredTokenId != null) {
    removeToken(hoveredTokenId);
  }
});

// ─── Init ───
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => e.preventDefault());
document.addEventListener("auxclick", (e) => {
  if (e.button === 1) e.preventDefault();
});

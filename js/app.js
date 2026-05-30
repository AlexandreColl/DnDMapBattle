let saveMapDataURL = null;

// ─── State ───
const state = {
  mapImage: null,
  gridRows: 15,
  gridCols: 20,
  cellStates: [],        // 2D array: 'hidden' | 'visible' | 'revealed'
  characters: [],        // { id, name, imageUrl, visionRadius }
  tokens: [],            // { id, characterId, row, col }
  nextCharId: 1,
  nextTokenId: 1,
  dragSource: null,       // { type: 'char'|'token', id }
  zoom: 1,
  panX: 0,
  panY: 0,
};

// ─── DOM refs ───
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => p.querySelectorAll(s);

const mapBg = $('#map-bg');
const gridOverlay = $('#grid-overlay');
const fogOverlay = $('#fog-overlay');
const mapWrapper = $('#map-wrapper');
const charList = $('#char-list');
const mapContainer = $('#map-container');

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

mapContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  const dir = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  zoomAtPoint(state.zoom * dir, e.clientX, e.clientY);
}, { passive: false });

// ─── Pan via drag ───
let panState = null;

mapContainer.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (e.target.closest('.token') || e.target.closest('.remove-token') || e.target.closest('.grid-cell') && e.target.closest('.grid-cell').querySelector('.token')) return;
  panState = { startX: e.clientX, startY: e.clientY, panX: state.panX, panY: state.panY };
  mapContainer.classList.add('panning');
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!panState) return;
  state.panX = panState.panX + (e.clientX - panState.startX);
  state.panY = panState.panY + (e.clientY - panState.startY);
  applyTransform();
});

document.addEventListener('mouseup', () => {
  if (!panState) return;
  panState = null;
  mapContainer.classList.remove('panning');
});

// ─── Map upload ───
$('#map-upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (state.mapImage) URL.revokeObjectURL(state.mapImage);
  state.mapImage = url;
  mapBg.style.backgroundImage = `url(${url})`;
  // Capture data URL for save
  const reader = new FileReader();
  reader.onload = () => { saveMapDataURL = reader.result; };
  reader.readAsDataURL(file);
});

// ─── Grid ───
function generateGrid(rows, cols) {
  state.gridRows = rows;
  state.gridCols = cols;

  // Init cell states
  state.cellStates = [];
  for (let r = 0; r < rows; r++) {
    state.cellStates[r] = [];
    for (let c = 0; c < cols; c++) {
      state.cellStates[r][c] = 'hidden';
    }
  }

  gridOverlay.innerHTML = '';
  gridOverlay.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridOverlay.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  gridOverlay.classList.add('has-grid');

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.classList.add('drag-over');
      });
      cell.addEventListener('dragleave', () => {
        cell.classList.remove('drag-over');
      });
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        handleDrop(r, c, e);
      });
      cell.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
          e.preventDefault();
          toggleReveal(r, c);
        }
      });
      cell.addEventListener('click', (e) => {
        if (e.shiftKey) {
          toggleReveal(r, c);
        }
      });

      gridOverlay.appendChild(cell);
    }
  }

  generateFog();
  renderTokens();
  calculateVision();
}

function generateFog() {
  fogOverlay.innerHTML = '';
  fogOverlay.style.gridTemplateColumns = `repeat(${state.gridCols}, 1fr)`;
  fogOverlay.style.gridTemplateRows = `repeat(${state.gridRows}, 1fr)`;

  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      const cell = document.createElement('div');
      cell.className = 'fog-cell';
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
      el.className = 'fog-cell ' + state.cellStates[r][c];
    }
  }
}

function calculateVision() {
  for (let r = 0; r < state.gridRows; r++) {
    for (let c = 0; c < state.gridCols; c++) {
      if (state.cellStates[r][c] !== 'revealed') {
        state.cellStates[r][c] = 'hidden';
      }
    }
  }

  for (const token of state.tokens) {
    const char = state.characters.find(c => c.id === token.characterId);
    if (!char) continue;
    const radius = char.visionRadius;
    for (let r = Math.max(0, token.row - radius); r <= Math.min(state.gridRows - 1, token.row + radius); r++) {
      for (let c = Math.max(0, token.col - radius); c <= Math.min(state.gridCols - 1, token.col + radius); c++) {
        const dist = Math.sqrt((r - token.row) ** 2 + (c - token.col) ** 2);
        if (dist <= radius && state.cellStates[r][c] !== 'revealed') {
          state.cellStates[r][c] = 'visible';
        }
      }
    }
  }

  applyFog();
}

function toggleReveal(row, col) {
  if (state.cellStates[row][col] === 'revealed') {
    state.cellStates[row][col] = 'hidden';
  } else {
    state.cellStates[row][col] = 'revealed';
  }
  calculateVision();
}

$('#grid-generate').addEventListener('click', () => {
  const rows = parseInt($('#grid-rows').value) || 15;
  const cols = parseInt($('#grid-cols').value) || 20;
  generateGrid(rows, cols);
});

// ─── Token Editor Modal ───
const editorModal = $('#token-editor');
const editorSource = $('#editor-source');
const editorCanvas = $('#editor-canvas');
const editorColor = $('#editor-color');
const editorZoom = $('#editor-zoom');
const editorClass = $('#editor-class');

let editorPendingFile = null;
let editorPendingName = '';
let editorSourceImg = null;
let editorPanX = 0;
let editorPanY = 0;
let editorPanState = null;

function renderTokenPreview() {
  if (!editorSourceImg) return;
  const color = editorColor.value;
  const zoom = parseInt(editorZoom.value) / 100;
  createTokenImage(editorSourceImg, color, zoom, editorPanX, editorPanY, (dataUrl) => {
    const ctx = editorCanvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, 150, 150);
      ctx.drawImage(img, 0, 0, 150, 150);
    };
    img.src = dataUrl;
  });
}

editorColor.addEventListener('input', () => {
  editorClass.value = '';
  renderTokenPreview();
});
editorClass.addEventListener('change', () => {
  if (editorClass.value) {
    editorColor.value = editorClass.value;
    renderTokenPreview();
  }
});
editorZoom.addEventListener('input', renderTokenPreview);

// Pan image within the circle
editorCanvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  editorPanState = { startX: e.clientX, startY: e.clientY, panX: editorPanX, panY: editorPanY };
  editorCanvas.style.cursor = 'grabbing';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!editorPanState) return;
  editorPanX = editorPanState.panX + (e.clientX - editorPanState.startX) * 2;
  editorPanY = editorPanState.panY + (e.clientY - editorPanState.startY) * 2;
  renderTokenPreview();
});

document.addEventListener('mouseup', () => {
  if (!editorPanState) return;
  editorPanState = null;
  editorCanvas.style.cursor = 'grab';
});

$('#editor-cancel').addEventListener('click', () => {
  editorModal.classList.add('hidden');
  editorPanX = 0; editorPanY = 0;
  editorPendingFile = null;
  editorSourceImg = null;
});

$('#editor-confirm').addEventListener('click', () => {
  if (!editorSourceImg) return;
  const color = editorColor.value;
  const zoom = parseInt(editorZoom.value) / 100;

  createTokenImage(editorSourceImg, color, zoom, editorPanX, editorPanY, (dataUrl) => {
    const char = {
      id: state.nextCharId++,
      name: editorPendingName,
      imageUrl: dataUrl,
      visionRadius: parseInt($('#editor-vision').value) || 5,
    };
    state.characters.push(char);
    renderCharacters();
    editorModal.classList.add('hidden');
    $('#char-upload').value = '';
    $('#char-name').value = '';
    editorPanX = 0; editorPanY = 0;
    editorPendingFile = null;
    editorSourceImg = null;
  });
});

function createTokenImage(img, borderColor, zoom, panX, panY, callback) {
  const size = 300;
  const border = 10;
  const outerR = size / 2 - 2;
  const innerR = outerR - border;
  const cx = size / 2;
  const cy = size / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = img.naturalWidth || img.width;
  srcCanvas.height = img.naturalHeight || img.height;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(img, 0, 0);

  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.clip();

  const baseScale = Math.min(innerR * 2 / srcCanvas.width, innerR * 2 / srcCanvas.height);
  const scale = baseScale * zoom;
  const w = srcCanvas.width * scale;
  const h = srcCanvas.height * scale;
  ctx.drawImage(srcCanvas, cx - w / 2 + panX, cy - h / 2 + panY, w, h);
  ctx.restore();

  callback(canvas.toDataURL('image/png'));
}

// ─── Character upload → open editor ───
$('#char-add').addEventListener('click', () => {
  const fileInput = $('#char-upload');
  const nameInput = $('#char-name');
  const file = fileInput.files[0];
  const name = nameInput.value.trim() || 'Personaje';
  if (!file) return;

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    editorSource.src = url;
    editorPendingFile = file;
    editorPendingName = name;
    editorSourceImg = img;
    renderTokenPreview();
    editorModal.classList.remove('hidden');
  };
  img.src = url;
});

function renderCharacters() {
  charList.innerHTML = '';
  for (const char of state.characters) {
    const div = document.createElement('div');
    div.className = 'char-item';
    div.draggable = true;
    div.dataset.charId = char.id;

    const img = document.createElement('img');
    img.src = char.imageUrl;
    img.alt = char.name;

    const span = document.createElement('span');
    span.textContent = char.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-char';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeCharacter(char.id);
    });

    div.appendChild(img);
    div.appendChild(span);
    div.appendChild(removeBtn);

    div.addEventListener('dragstart', (e) => {
      state.dragSource = { type: 'char', id: char.id };
      e.dataTransfer.setData('text/plain', `char:${char.id}`);
      div.classList.add('dragging');
    });
    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
      state.dragSource = null;
    });

    charList.appendChild(div);
  }
}

function removeCharacter(charId) {
  state.tokens = state.tokens.filter(t => t.characterId !== charId);
  state.characters = state.characters.filter(c => c.id !== charId);
  renderCharacters();
  renderTokens();
  calculateVision();
}

// ─── Tokens (place / move) ───
function handleDrop(row, col, e) {
  const data = e.dataTransfer.getData('text/plain');

  if (data.startsWith('char:')) {
    const charId = parseInt(data.split(':')[1]);
    const existing = state.tokens.find(t => t.characterId === charId);
    if (existing) {
      existing.row = row;
      existing.col = col;
    } else {
      state.tokens.push({
        id: state.nextTokenId++,
        characterId: charId,
        row, col,
      });
    }
    renderTokens();
    calculateVision();
  }

  if (data.startsWith('token:')) {
    const tokenId = parseInt(data.split(':')[1]);
    const token = state.tokens.find(t => t.id === tokenId);
    if (token) {
      token.row = row;
      token.col = col;
    }
    renderTokens();
    calculateVision();
  }
}

function renderTokens() {
  // Remove old token elements
  $$('.token', gridOverlay).forEach(el => el.remove());

  for (const token of state.tokens) {
    const char = state.characters.find(c => c.id === token.characterId);
    if (!char) continue;

    const cell = $(`[data-row="${token.row}"][data-col="${token.col}"]`, gridOverlay);
    if (!cell) continue;

    const el = document.createElement('div');
    el.className = 'token';
    el.dataset.tokenId = token.id;
    el.style.backgroundImage = `url(${char.imageUrl})`;
    el.draggable = true;
    el.title = char.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-token';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToken(token.id);
    });
    el.appendChild(removeBtn);

    el.addEventListener('dragstart', (e) => {
      state.dragSource = { type: 'token', id: token.id };
      e.dataTransfer.setData('text/plain', `token:${token.id}`);
      el.classList.add('dragging');
      e.stopPropagation();
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      state.dragSource = null;
    });

    cell.appendChild(el);
  }
}

function removeToken(tokenId) {
  state.tokens = state.tokens.filter(t => t.id !== tokenId);
  renderTokens();
  calculateVision();
}

// ─── Save / Load ───
function saveState() {
  if (state.gridRows === 0 || state.gridCols === 0) {
    alert('No hay partida que guardar. Genera una cuadrícula primero.');
    return;
  }

  const data = {
    version: 1,
    gridRows: state.gridRows,
    gridCols: state.gridCols,
    cellStates: state.cellStates,
    characters: state.characters.map(c => ({
      id: c.id,
      name: c.name,
      imageUrl: c.imageUrl,
      visionRadius: c.visionRadius,
    })),
    tokens: state.tokens.map(t => ({
      id: t.id,
      characterId: t.characterId,
      row: t.row,
      col: t.col,
    })),
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    mapImage: saveMapDataURL || null,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'partida.dndmap';
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
      if (!data.version) throw new Error('Formato no válido');

      // Clear current state
      state.characters.forEach(c => URL.revokeObjectURL(c.imageUrl));
      state.characters = [];
      state.tokens = [];
      if (state.mapImage) {
        URL.revokeObjectURL(state.mapImage);
        state.mapImage = null;
        saveMapDataURL = null;
        mapBg.style.backgroundImage = '';
      }

      // Restore map
      if (data.mapImage) {
        saveMapDataURL = data.mapImage;
        const imgUrl = URL.createObjectURL(dataURLtoBlob(data.mapImage));
        state.mapImage = imgUrl;
        mapBg.style.backgroundImage = `url(${imgUrl})`;
      }

      // Restore characters
      state.nextCharId = 1;
      for (const c of data.characters) {
        const imgUrl = URL.createObjectURL(dataURLtoBlob(c.imageUrl));
        state.characters.push({
          id: c.id,
          name: c.name,
          imageUrl: imgUrl,
          visionRadius: c.visionRadius || 5,
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
      state.nextTokenId = 1;
      state.tokens = data.tokens.map(t => {
        const token = { ...t };
        if (token.id >= state.nextTokenId) state.nextTokenId = token.id + 1;
        return token;
      });

      renderCharacters();
      renderTokens();
      calculateVision();
      applyTransform();
    } catch (err) {
      alert('Error al cargar la partida: ' + err.message);
    }
  };
  reader.readAsText(file);
}

$('#save-state').addEventListener('click', saveState);

$('#load-state').addEventListener('click', () => {
  $('#load-input').click();
});

$('#load-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  loadState(file);
  e.target.value = '';
});

function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bytes = atob(parts[1]);
  const ab = new ArrayBuffer(bytes.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < bytes.length; i++) ia[i] = bytes.charCodeAt(i);
  return new Blob([ab], { type: mime });
}

// ─── Clear all ───
$('#clear-all').addEventListener('click', () => {
  if (!confirm('¿Limpiar todo?')) return;
  state.characters.forEach(c => URL.revokeObjectURL(c.imageUrl));
  state.characters = [];
  state.tokens = [];
  if (state.mapImage) {
    URL.revokeObjectURL(state.mapImage);
    state.mapImage = null;
    saveMapDataURL = null;
    mapBg.style.backgroundImage = '';
  }
  gridOverlay.innerHTML = '';
  gridOverlay.classList.remove('has-grid');
  fogOverlay.innerHTML = '';
  state.cellStates = [];
  renderCharacters();
});

// ─── Init ───
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());
document.addEventListener('auxclick', (e) => {
  if (e.button === 1) e.preventDefault();
});

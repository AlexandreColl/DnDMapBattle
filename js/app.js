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

// ─── Socket.IO sync ───
const socket = io();
let socketIgnoreNext = false;

function receiveFullState(data) {
  socketIgnoreNext = true;

  // Only apply if server has actual data
  if (data.gridRows > 0 || data.characters?.length > 0 || data.mapImage || data.tokens?.length > 0) {
    state.characters.forEach(c => { if (c.imageUrl.startsWith('blob:')) URL.revokeObjectURL(c.imageUrl); });
    state.characters = [];
    state.tokens = [];
    if (state.mapImage) {
      if (state.mapImage.startsWith('blob:')) URL.revokeObjectURL(state.mapImage);
      state.mapImage = null; saveMapDataURL = null;
      mapBg.style.backgroundImage = '';
    }

    if (data.mapImage) {
      saveMapDataURL = data.mapImage;
      state.mapImage = data.mapImage;
      mapBg.style.backgroundImage = `url(${data.mapImage})`;
    }

    state.nextCharId = 1;
    for (const c of data.characters) {
      state.characters.push({ id: c.id, name: c.name, imageUrl: c.imageUrl, visionRadius: c.visionRadius || 5, isEnemy: c.isEnemy || false, initiative: c.initiative || null });
      if (c.id >= state.nextCharId) state.nextCharId = c.id + 1;
    }

    state.zoom = data.zoom || 1;
    state.panX = data.panX || 0;
    state.panY = data.panY || 0;

    if (data.gridRows && data.gridCols) {
      generateGrid(data.gridRows, data.gridCols);
      state.cellStates = data.cellStates;
      state.nextTokenId = 1;
      state.tokens = data.tokens.map(t => {
        const token = { ...t };
        if (token.id >= state.nextTokenId) state.nextTokenId = token.id + 1;
        return token;
      });
      renderTokens();
      calculateVision();
      applyTransform();
    }

    renderCharacters();
  }
  socketIgnoreNext = false;
}

socket.on('connect', () => {});

socket.on('state:full', (data) => {
  if (socketIgnoreNext) return;
  receiveFullState(data);
});

socket.on('map:changed', (data) => {
  if (socketIgnoreNext) return;
  if (state.mapImage && state.mapImage.startsWith('blob:')) URL.revokeObjectURL(state.mapImage);
  state.mapImage = data.mapImage; saveMapDataURL = data.mapImage;
  mapBg.style.backgroundImage = `url(${data.mapImage})`;
});

socket.on('grid:generated', (data) => {
  if (socketIgnoreNext) return;
  generateGrid(data.gridRows, data.gridCols);
  state.cellStates = data.cellStates;
  state.tokens = data.tokens;
  state.nextTokenId = data.nextTokenId;
  renderTokens(); calculateVision();
});

socket.on('character:added', (data) => {
  if (socketIgnoreNext) return;
  state.characters.push(data.character);
  if (data.nextCharId > state.nextCharId) state.nextCharId = data.nextCharId;
  renderCharacters();
});

  socket.on('character:removed', (data) => {
    if (socketIgnoreNext) return;
    state.characters = state.characters.filter(c => c.id !== data.charId);
    state.tokens = state.tokens.filter(t => t.characterId !== data.charId);
    renderCharacters(); renderTokens(); calculateVision(); renderInitiativeBar();
  });

socket.on('token:placed', (data) => {
  if (socketIgnoreNext) return;
  const existing = state.tokens.find(t => t.characterId === data.characterId);
  if (existing) { existing.row = data.row; existing.col = data.col; }
  else { state.tokens.push(data.token); if (data.nextTokenId > state.nextTokenId) state.nextTokenId = data.nextTokenId; }
  renderTokens(); calculateVision();
});

socket.on('token:removed', (data) => {
  if (socketIgnoreNext) return;
  state.tokens = state.tokens.filter(t => t.id !== data.tokenId);
  renderTokens(); calculateVision();
});

socket.on('fog:revealed', (data) => {
  if (socketIgnoreNext) return;
  for (const { row, col } of data.cells) {
    if (state.cellStates[row] && state.cellStates[row][col] !== undefined) {
      state.cellStates[row][col] = 'revealed';
    }
  }
  calculateVision();
});

socket.on('fog:updated', (data) => {
  if (socketIgnoreNext) return;
  state.cellStates = data.cellStates;
  applyFog();
});

socket.on('view:changed', (data) => {
  if (socketIgnoreNext) return;
  state.zoom = data.zoom; state.panX = data.panX; state.panY = data.panY;
  applyTransform();
});

socket.on('initiative:changed', (data) => {
  if (socketIgnoreNext) return;
  const char = state.characters.find(c => c.id === data.charId);
  if (char) {
    char.initiative = data.initiative;
    renderCharacters();
    renderInitiativeBar();
  }
});

socket.on('state:cleared', () => {
  if (socketIgnoreNext) return;
  state.characters.forEach(c => { if (c.imageUrl.startsWith('blob:')) URL.revokeObjectURL(c.imageUrl); });
  state.characters = []; state.tokens = [];
  if (state.mapImage) { if (state.mapImage.startsWith('blob:')) URL.revokeObjectURL(state.mapImage); state.mapImage = null; saveMapDataURL = null; mapBg.style.backgroundImage = ''; }
  gridOverlay.innerHTML = ''; gridOverlay.classList.remove('has-grid');
  fogOverlay.innerHTML = ''; state.cellStates = [];
  state.zoom = 1; state.panX = 0; state.panY = 0; applyTransform();
  renderCharacters(); renderInitiativeBar();
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

mapContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  const dir = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  zoomAtPoint(state.zoom * dir, e.clientX, e.clientY);
  if (!socketIgnoreNext) socket.emit('view:changed', { zoom: state.zoom, panX: state.panX, panY: state.panY });
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
  if (!socketIgnoreNext) socket.emit('view:changed', { zoom: state.zoom, panX: state.panX, panY: state.panY });
});

// ─── Map upload ───
$('#map-upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (state.mapImage && state.mapImage.startsWith('blob:')) URL.revokeObjectURL(state.mapImage);
  state.mapImage = url;
  mapBg.style.backgroundImage = `url(${url})`;
  const reader = new FileReader();
  reader.onload = () => {
    saveMapDataURL = reader.result;
    if (!socketIgnoreNext) socket.emit('map:changed', { mapImage: reader.result });
  };
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
    if (!char || char.isEnemy) continue;
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
  if (!socketIgnoreNext) socket.emit('fog:updated', { cellStates: state.cellStates });
}

function toggleReveal(row, col) {
  if (state.cellStates[row][col] === 'revealed') {
    state.cellStates[row][col] = 'hidden';
  } else {
    state.cellStates[row][col] = 'revealed';
  }
  calculateVision();
  if (!socketIgnoreNext) socket.emit('fog:revealed', { cells: [{ row, col }] });
}

// ─── Initiative ───
function editInitiative(char) {
  const newVal = prompt(`Iniciativa para ${char.name}:`, char.initiative != null ? char.initiative : '');
  if (newVal === null) return;
  const trimmed = newVal.trim();
  char.initiative = trimmed ? parseInt(trimmed) : null;
  if (isNaN(char.initiative)) char.initiative = null;
  renderInitiativeBar();
  renderCharacters();
  if (!socketIgnoreNext) socket.emit('initiative:changed', { charId: char.id, initiative: char.initiative });
}

function renderInitiativeBar() {
  const bar = $('#initiative-bar');
  if (!bar) return;
  bar.innerHTML = '';

  const entries = [];
  for (const token of state.tokens) {
    const char = state.characters.find(c => c.id === token.characterId);
    if (char && char.initiative != null) {
      entries.push({ token, char });
    }
  }

  entries.sort((a, b) => b.char.initiative - a.char.initiative);

  for (const { char } of entries) {
    const item = document.createElement('div');
    item.className = 'initiative-item';
    item.title = `${char.name} (Init: ${char.initiative})`;

    const img = document.createElement('div');
    img.className = 'initiative-image';
    img.style.backgroundImage = `url(${char.imageUrl})`;

    const value = document.createElement('span');
    value.className = 'initiative-value';
    value.textContent = char.initiative;
    value.addEventListener('click', (e) => {
      e.stopPropagation();
      editInitiative(char);
    });

    item.appendChild(img);
    item.appendChild(value);
    bar.appendChild(item);
  }
}

$('#grid-generate').addEventListener('click', () => {
  const rows = parseInt($('#grid-rows').value) || 15;
  const cols = parseInt($('#grid-cols').value) || 20;
  generateGrid(rows, cols);
  if (!socketIgnoreNext) socket.emit('grid:generated', {
    gridRows: state.gridRows, gridCols: state.gridCols,
    cellStates: state.cellStates, tokens: state.tokens, nextTokenId: state.nextTokenId,
  });
});

// ─── Token Editor Modal ───
const editorModal = $('#token-editor');
const editorSource = $('#editor-source');
const editorCanvas = $('#editor-canvas');
const editorColor = $('#editor-color');
const editorClass = $('#editor-class');
const editorEnemy = $('#editor-enemy');
const editorVisionLabel = $('#editor-vision-label');

let editorPendingFile = null;
let editorPendingName = '';
let editorSourceImg = null;
let editorZoomLevel = 1;
let editorPanX = 0;
let editorPanY = 0;
let editorPanState = null;

function renderTokenPreview() {
  if (!editorSourceImg) return;
  const color = editorColor.value;
  const zoom = editorZoomLevel;
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
editorEnemy.addEventListener('change', () => {
  editorVisionLabel.style.display = editorEnemy.checked ? 'none' : '';
});

// Zoom with wheel on canvas, pan with drag
editorCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const dir = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  editorZoomLevel = Math.min(3, Math.max(0.5, editorZoomLevel * dir));
  renderTokenPreview();
});

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
  editorZoomLevel = 1; editorPanX = 0; editorPanY = 0;
  editorPendingFile = null;
  editorSourceImg = null;
  $('#editor-initiative').value = '';
});

$('#editor-confirm').addEventListener('click', () => {
  if (!editorSourceImg) return;
  const color = editorColor.value;
  const zoom = editorZoomLevel;

  createTokenImage(editorSourceImg, color, zoom, editorPanX, editorPanY, (dataUrl) => {
    const initVal = $('#editor-initiative').value.trim();
    const char = {
      id: state.nextCharId,
      name: editorPendingName,
      imageUrl: dataUrl,
      visionRadius: parseInt($('#editor-vision').value) || 5,
      isEnemy: $('#editor-enemy').checked,
      initiative: initVal ? parseInt(initVal) : null,
    };
    state.nextCharId++;
    state.characters.push(char);
    renderCharacters();
    editorModal.classList.add('hidden');
    $('#char-upload').value = '';
    $('#char-name').value = '';
    $('#editor-initiative').value = '';
    editorZoomLevel = 1; editorPanX = 0; editorPanY = 0;
    editorPendingFile = null;
    editorSourceImg = null;
    if (!socketIgnoreNext) socket.emit('character:added', { character: char, nextCharId: state.nextCharId });
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
    span.textContent = (char.isEnemy ? '[E] ' : '[A] ') + char.name;

    const initSpan = document.createElement('span');
    initSpan.className = 'char-initiative';
    initSpan.textContent = char.initiative != null ? char.initiative : '—';
    if (char.initiative == null) initSpan.classList.add('none');
    initSpan.title = 'Click para editar iniciativa';
    initSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      editInitiative(char);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-char';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeCharacter(char.id);
    });

    div.appendChild(img);
    div.appendChild(span);
    div.appendChild(initSpan);
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
  renderInitiativeBar();
  if (!socketIgnoreNext) socket.emit('character:removed', { charId });
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
      renderTokens();
      calculateVision();
      if (!socketIgnoreNext) socket.emit('token:placed', { characterId: charId, row, col, token: existing, nextTokenId: state.nextTokenId });
    } else {
      const token = { id: state.nextTokenId++, characterId: charId, row, col };
      state.tokens.push(token);
      renderTokens();
      calculateVision();
      if (!socketIgnoreNext) socket.emit('token:placed', { characterId: charId, row, col, token, nextTokenId: state.nextTokenId });
    }
    return;
  }

  if (data.startsWith('token:')) {
    const tokenId = parseInt(data.split(':')[1]);
    const token = state.tokens.find(t => t.id === tokenId);
    if (token) {
      token.row = row;
      token.col = col;
      renderTokens();
      calculateVision();
      if (!socketIgnoreNext) socket.emit('token:placed', { characterId: token.characterId, row, col, token, nextTokenId: state.nextTokenId });
    }
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
  renderInitiativeBar();
}

function removeToken(tokenId) {
  state.tokens = state.tokens.filter(t => t.id !== tokenId);
  renderTokens();
  calculateVision();
  renderInitiativeBar();
  if (!socketIgnoreNext) socket.emit('token:removed', { tokenId });
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
      isEnemy: c.isEnemy || false,
      initiative: c.initiative || null,
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

// ─── Export / Import characters ───
$('#export-chars').addEventListener('click', () => {
  if (state.characters.length === 0) {
    alert('No hay personajes para exportar.');
    return;
  }
  const data = state.characters.map(c => ({
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    visionRadius: c.visionRadius,
    isEnemy: c.isEnemy || false,
    initiative: c.initiative || null,
  }));
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'personajes.dndchars';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

$('#import-chars').addEventListener('click', () => {
  $('#import-chars-input').click();
});

$('#import-chars-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const chars = JSON.parse(reader.result);
      if (!Array.isArray(chars)) throw new Error('Formato no válido');
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
      alert('Error al importar personajes: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ─── Clear all ───
$('#clear-all').addEventListener('click', () => {
  if (!confirm('¿Limpiar todo?')) return;
  socket.emit('state:cleared');
  state.characters.forEach(c => {
    if (c.imageUrl.startsWith('blob:')) URL.revokeObjectURL(c.imageUrl);
  });
  state.characters = [];
  state.tokens = [];
  if (state.mapImage) {
    if (state.mapImage.startsWith('blob:')) URL.revokeObjectURL(state.mapImage);
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

// ─── Sidebar toggle ───
const sidebar = $('#sidebar');
const sidebarToggle = $('#sidebar-toggle');
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  sidebarToggle.classList.toggle('collapsed');
  sidebarToggle.textContent = sidebar.classList.contains('collapsed') ? '☰' : '◀';
});

// ─── Init ───
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());
document.addEventListener('auxclick', (e) => {
  if (e.button === 1) e.preventDefault();
});

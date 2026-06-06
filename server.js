const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 50 * 1024 * 1024,
  maxPayload: 50 * 1024 * 1024,
});

app.use(express.static(__dirname));

const gameState = {
  mapImage: null,
  gridRows: 0,
  gridCols: 0,
  cellStates: [],
  characters: [],
  tokens: [],
  nextCharId: 1,
  nextTokenId: 1,
  zoom: 1,
  panX: 0,
  panY: 0,
};

io.on('connection', (socket) => {
  socket.emit('state:full', gameState);

  socket.on('state:full', (data) => {
    Object.assign(gameState, data);
    socket.broadcast.emit('state:full', data);
  });

  socket.on('map:changed', (data) => {
    gameState.mapImage = data.mapImage;
    socket.broadcast.emit('map:changed', data);
  });

  socket.on('grid:generated', (data) => {
    gameState.gridRows = data.gridRows;
    gameState.gridCols = data.gridCols;
    gameState.cellStates = data.cellStates;
    gameState.tokens = data.tokens;
    gameState.nextTokenId = data.nextTokenId;
    socket.broadcast.emit('grid:generated', data);
  });

  socket.on('character:added', (data) => {
    gameState.characters.push(data.character);
    gameState.nextCharId = data.nextCharId;
    socket.broadcast.emit('character:added', data);
  });

  socket.on('character:removed', (data) => {
    gameState.characters = gameState.characters.filter(c => c.id !== data.charId);
    gameState.tokens = gameState.tokens.filter(t => t.characterId !== data.charId);
    socket.broadcast.emit('character:removed', data);
  });

  socket.on('token:placed', (data) => {
    const existing = gameState.tokens.find(t => t.characterId === data.characterId);
    if (existing) {
      existing.row = data.row;
      existing.col = data.col;
    } else {
      gameState.tokens.push(data.token);
      gameState.nextTokenId = data.nextTokenId;
    }
    socket.broadcast.emit('token:placed', data);
  });

  socket.on('token:removed', (data) => {
    gameState.tokens = gameState.tokens.filter(t => t.id !== data.tokenId);
    socket.broadcast.emit('token:removed', data);
  });

  socket.on('fog:revealed', (data) => {
    for (const { row, col } of data.cells) {
      gameState.cellStates[row][col] = 'revealed';
    }
    socket.broadcast.emit('fog:revealed', data);
  });

  socket.on('fog:updated', (data) => {
    gameState.cellStates = data.cellStates;
    socket.broadcast.emit('fog:updated', data);
  });

  socket.on('view:changed', (data) => {
    gameState.zoom = data.zoom;
    gameState.panX = data.panX;
    gameState.panY = data.panY;
    socket.broadcast.emit('view:changed', data);
  });

  socket.on('initiative:changed', (data) => {
    const char = gameState.characters.find(c => c.id === data.charId);
    if (char) {
      char.initiative = data.initiative;
    }
    socket.broadcast.emit('initiative:changed', data);
  });

  socket.on('state:cleared', () => {
    gameState.mapImage = null;
    gameState.gridRows = 0;
    gameState.gridCols = 0;
    gameState.cellStates = [];
    gameState.characters = [];
    gameState.tokens = [];
    gameState.nextCharId = 1;
    gameState.nextTokenId = 1;
    gameState.zoom = 1;
    gameState.panX = 0;
    gameState.panY = 0;
    socket.broadcast.emit('state:cleared');
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado en http://0.0.0.0:${PORT}`);
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  Red local: http://${net.address}:${PORT}`);
      }
    }
  }
});

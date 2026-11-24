// Screenshots for the README: `pnpm screenshots` writes them to docs/screenshots.
// The map and the token portraits are drawn here, so the repository needs no
// third-party art. Not part of the E2E suite (its name is not *.spec.js).
/* global document */
import path from "node:path";
import { expect, test } from "./fixtures.js";

const OUT = path.join(import.meta.dirname, "../docs/screenshots");
const ROWS = 16;
const COLS = 24;
const CELL = 64;

// Floor areas as [top, left, bottom, right], in cells. Everything else is rock.
const ROOMS = [
  [1, 1, 5, 7], // shrine with a pool
  [6, 3, 8, 4], // corridor down to the entrance
  [9, 1, 14, 7], // entrance hall
  [11, 8, 12, 10], // corridor to the lair
  [2, 11, 13, 19], // the dragon's lair
  [11, 20, 11, 20], // door to the crypt
  [9, 21, 14, 23], // crypt
];
const PILLARS = [
  [4, 13],
  [4, 17],
  [10, 13],
  [10, 17],
];

function isFloor(row, col) {
  if (PILLARS.some(([r, c]) => r === row && c === col)) return false;
  return ROOMS.some(
    ([t, l, b, r]) => row >= t && row <= b && col >= l && col <= r,
  );
}

const WALLS = Array.from({ length: ROWS }, (_, row) =>
  Array.from({ length: COLS }, (_, col) => !isFloor(row, col)),
);

// The party already explored the shrine and the entrance hall.
const EXPLORED = Array.from({ length: ROWS }, (_, row) =>
  Array.from({ length: COLS }, (_, col) =>
    isFloor(row, col) && col <= 10 ? "revealed" : "hidden",
  ),
);

const CHARACTERS = [
  {
    name: "Aria",
    emoji: "🧝‍♀️",
    color: "#AAD372",
    vision: 8,
    initiative: 18,
    hp: 27,
    maxHp: 34,
  },
  {
    name: "Borin",
    emoji: "🛡️",
    color: "#F48CBA",
    vision: 5,
    initiative: 10,
    hp: 14,
    maxHp: 45,
    conditions: ["poisoned"],
  },
  {
    name: "Lyra",
    emoji: "🧙‍♀️",
    color: "#3FC7EB",
    vision: 6,
    initiative: 8,
    hp: 22,
    maxHp: 22,
    conditions: ["concentrating"],
  },
  {
    name: "Kael",
    emoji: "🗡️",
    color: "#FFF468",
    vision: 6,
    initiative: 15,
    hp: 29,
    maxHp: 31,
    conditions: ["invisible"],
  },
  {
    name: "Dragón rojo",
    emoji: "🐉",
    color: "#C41E3A",
    enemy: true,
    size: 2,
    vision: 10,
    initiative: 17,
    hp: 121,
    maxHp: 178,
  },
  {
    name: "Goblin",
    emoji: "👺",
    color: "#FF7C0A",
    enemy: true,
    initiative: 12,
    hp: 0,
    maxHp: 7,
  },
  {
    name: "Goblin arquero",
    emoji: "👺",
    color: "#FF7C0A",
    enemy: true,
    initiative: 11,
    hp: 7,
    maxHp: 7,
    conditions: ["frightened"],
  },
  {
    name: "Esqueleto",
    emoji: "💀",
    color: "#FFFFFF",
    enemy: true,
    initiative: 5,
    hp: 13,
    maxHp: 13,
  },
];

// Where each character stands, by name: [row, col] of its top-left cell.
const POSITIONS = {
  Aria: [12, 9],
  Borin: [11, 10],
  Lyra: [10, 6],
  Kael: [8, 12],
  "Dragón rojo": [6, 15],
  Goblin: [11, 12],
  "Goblin arquero": [9, 14],
  Esqueleto: [12, 22],
};

/** Draws the dungeon in the page and returns it as a data URL. */
function drawMap({ rows, cols, cell, walls, pillars }) {
  const canvas = document.createElement("canvas");
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const g = canvas.getContext("2d");
  // Same picture on every run.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const floor = (r, c) =>
    r >= 0 && c >= 0 && r < rows && c < cols && !walls[r][c];

  g.fillStyle = "#141317";
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(255,255,255,${rand() * 0.05})`;
    g.fillRect(rand() * canvas.width, rand() * canvas.height, 2, 2);
  }

  // Flagstones, two by two in each cell, in slightly different tones.
  const half = cell / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!floor(r, c) && !pillars.some(([pr, pc]) => pr === r && pc === c))
        continue;
      for (let i = 0; i < 4; i++) {
        const x = c * cell + (i % 2) * half;
        const y = r * cell + Math.floor(i / 2) * half;
        const tone = 74 + rand() * 22;
        g.fillStyle = `rgb(${tone + 6},${tone},${tone - 10})`;
        g.fillRect(x + 1, y + 1, half - 2, half - 2);
        if (rand() < 0.18) {
          g.strokeStyle = "rgba(20,18,16,0.6)";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x + rand() * half, y + 2);
          g.lineTo(x + rand() * half, y + half - 2);
          g.stroke();
        }
      }
    }
  }

  // Shadow along the walls.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!floor(r, c)) continue;
      const x = c * cell;
      const y = r * cell;
      const sides = [
        [!floor(r - 1, c), x, y, x, y + 18, x, y, cell, 18],
        [
          !floor(r + 1, c),
          x,
          y + cell,
          x,
          y + cell - 18,
          x,
          y + cell - 18,
          cell,
          18,
        ],
        [!floor(r, c - 1), x, y, x + 18, y, x, y, 18, cell],
        [
          !floor(r, c + 1),
          x + cell,
          y,
          x + cell - 18,
          y,
          x + cell - 18,
          y,
          18,
          cell,
        ],
      ];
      for (const [wall, x0, y0, x1, y1, rx, ry, rw, rh] of sides) {
        if (!wall) continue;
        const shade = g.createLinearGradient(x0, y0, x1, y1);
        shade.addColorStop(0, "rgba(0,0,0,0.55)");
        shade.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = shade;
        g.fillRect(rx, ry, rw, rh);
      }
    }
  }

  // Wall edges.
  g.strokeStyle = "#2b2620";
  g.lineWidth = 6;
  g.lineCap = "square";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!floor(r, c)) continue;
      const x = c * cell;
      const y = r * cell;
      const edges = [
        [!floor(r - 1, c), x, y, x + cell, y],
        [!floor(r + 1, c), x, y + cell, x + cell, y + cell],
        [!floor(r, c - 1), x, y, x, y + cell],
        [!floor(r, c + 1), x + cell, y, x + cell, y + cell],
      ];
      for (const [wall, x0, y0, x1, y1] of edges) {
        if (!wall) continue;
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.stroke();
      }
    }
  }

  // Pillars.
  for (const [r, c] of pillars) {
    const cx = (c + 0.5) * cell;
    const cy = (r + 0.5) * cell;
    const stone = g.createRadialGradient(
      cx - 8,
      cy - 8,
      4,
      cx,
      cy,
      cell * 0.45,
    );
    stone.addColorStop(0, "#9a9186");
    stone.addColorStop(1, "#3c3730");
    g.fillStyle = "rgba(0,0,0,0.5)";
    g.beginPath();
    g.arc(cx + 5, cy + 6, cell * 0.42, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = stone;
    g.beginPath();
    g.arc(cx, cy, cell * 0.4, 0, Math.PI * 2);
    g.fill();
  }

  // A long rug in the lair, with a golden border.
  const rug = [3 * cell + 8, 15 * cell + 8, 2 * cell - 16, 10 * cell - 16];
  g.fillStyle = "#6e1620";
  g.fillRect(rug[1], rug[0], rug[2], rug[3]);
  g.strokeStyle = "#c9a227";
  g.lineWidth = 4;
  g.strokeRect(rug[1] + 6, rug[0] + 6, rug[2] - 12, rug[3] - 12);

  // The hoard, in a corner of the lair.
  for (let i = 0; i < 260; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * cell * 1.1;
    g.fillStyle =
      rand() < 0.15 ? "#f6e27a" : rand() < 0.5 ? "#d4a72c" : "#a87b1c";
    g.beginPath();
    g.arc(
      19 * cell + 20 + Math.cos(a) * d,
      2 * cell + 20 + Math.sin(a) * d * 0.8,
      3 + rand() * 3,
      0,
      Math.PI * 2,
    );
    g.fill();
  }

  // The pool in the shrine.
  const pool = g.createRadialGradient(
    5 * cell,
    3 * cell,
    10,
    5 * cell,
    3 * cell,
    cell * 1.6,
  );
  pool.addColorStop(0, "#3f8fb3");
  pool.addColorStop(1, "#173a4f");
  g.fillStyle = pool;
  g.beginPath();
  g.ellipse(5 * cell, 3 * cell, cell * 1.5, cell * 1.1, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#6f665a";
  g.lineWidth = 5;
  g.stroke();

  // Sarcophagi in the crypt.
  for (const c of [21.2, 22.6]) {
    g.fillStyle = "#4a443c";
    g.fillRect(c * cell, 9.4 * cell, cell * 0.9, cell * 1.8);
    g.strokeStyle = "#7d7366";
    g.lineWidth = 3;
    g.strokeRect(
      c * cell + 6,
      9.4 * cell + 6,
      cell * 0.9 - 12,
      cell * 1.8 - 12,
    );
  }

  // Rubble.
  for (let i = 0; i < 700; i++) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    if (!floor(Math.floor(y / cell), Math.floor(x / cell))) continue;
    g.fillStyle = `rgba(${40 + rand() * 40},${36 + rand() * 30},${30 + rand() * 20},0.8)`;
    g.beginPath();
    g.arc(x, y, 1 + rand() * 2.5, 0, Math.PI * 2);
    g.fill();
  }

  // Torchlight.
  for (const [r, c] of [
    [9, 4],
    [2, 11],
    [2, 19],
    [13, 11],
    [9, 22],
  ]) {
    const cx = (c + 0.5) * cell;
    const cy = (r + 0.5) * cell;
    const glow = g.createRadialGradient(cx, cy, 2, cx, cy, cell * 2.2);
    glow.addColorStop(0, "rgba(255,170,70,0.45)");
    glow.addColorStop(1, "rgba(255,140,40,0)");
    g.fillStyle = glow;
    g.fillRect(cx - cell * 2.2, cy - cell * 2.2, cell * 4.4, cell * 4.4);
    g.fillStyle = "#ffd27a";
    g.beginPath();
    g.arc(cx, cy, 5, 0, Math.PI * 2);
    g.fill();
  }

  return canvas.toDataURL("image/jpeg", 0.88);
}

/** A round portrait: the emoji on a dark disc with a ring in its colour. */
function drawPortrait({ emoji, color }) {
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  const back = g.createRadialGradient(
    size / 2,
    size / 2.4,
    10,
    size / 2,
    size / 2,
    size / 2,
  );
  back.addColorStop(0, "#4a4038");
  back.addColorStop(1, "#1b1714");
  g.fillStyle = back;
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  g.fill();
  g.font = `${size * 0.56}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(emoji, size / 2, size / 2 + 6);
  g.strokeStyle = color;
  g.lineWidth = 12;
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  g.stroke();
  return canvas.toDataURL("image/png");
}

test.use({ viewport: { width: 1440, height: 900 } });

test("README screenshots", async ({ openDm, openPlayer }) => {
  const dm = await openDm({ viewport: { width: 1440, height: 900 } });

  const mapImage = await dm.evaluate(drawMap, {
    rows: ROWS,
    cols: COLS,
    cell: CELL,
    walls: WALLS,
    pillars: PILLARS,
  });
  const characters = [];
  for (const [i, c] of CHARACTERS.entries()) {
    characters.push({
      id: i + 1,
      name: c.name,
      imageUrl: await dm.evaluate(drawPortrait, c),
      visionRadius: c.vision ?? 5,
      isEnemy: c.enemy === true,
      initiative: c.initiative,
      hp: c.hp,
      maxHp: c.maxHp,
      conditions: c.conditions ?? [],
      size: c.size ?? 1,
    });
  }
  const save = {
    version: 1,
    gridRows: ROWS,
    gridCols: COLS,
    cellStates: EXPLORED,
    characters,
    tokens: characters.map((c) => ({
      id: c.id,
      characterId: c.id,
      row: POSITIONS[c.name][0],
      col: POSITIONS[c.name][1],
    })),
    zoom: 1,
    panX: 0,
    panY: 0,
    mapImage,
    wallCells: WALLS,
  };

  await dm.locator('[data-panel="setup"]').click();
  await dm.locator("#load-input").setInputFiles({
    name: "cripta.dndmap",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(save)),
  });
  await expect(dm.locator(".token")).toHaveCount(CHARACTERS.length);
  await dm.locator('[data-panel="play"]').click();
  await dm.locator("#turn-start").click();
  await expect(dm.locator("#turn-display")).toHaveText("Aria");

  const player = await openPlayer({ viewport: { width: 1440, height: 900 } });
  await expect(player.locator(".token").first()).toBeVisible();

  // Wait for the notices to go and the fog and tokens to settle.
  for (const page of [dm, player]) {
    await expect(page.locator(".toast")).toHaveCount(0, { timeout: 10_000 });
  }
  await dm.waitForTimeout(500);
  const shot = { type: /** @type {const} */ ("jpeg"), quality: 85 };
  await dm.screenshot({ ...shot, path: `${OUT}/master.jpg` });
  await player.screenshot({ ...shot, path: `${OUT}/jugador.jpg` });

  // Borin's menu, with the token beside it.
  await dm.locator('.token[data-char-id="2"]').click();
  const menu = dm.locator("#token-menu");
  await expect(menu).toBeVisible();
  await dm.waitForTimeout(400);
  const box = await menu.boundingBox();
  const x = Math.max(0, box.x - 280);
  const y = Math.max(0, box.y - 60);
  await dm.screenshot({
    ...shot,
    path: `${OUT}/menu-ficha.jpg`,
    clip: {
      x,
      y,
      width: box.x + box.width + 30 - x,
      height: box.y + box.height + 30 - y,
    },
  });
});

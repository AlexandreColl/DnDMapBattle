// Token editor dialog: turns a picture into a round token with a colored rim.
import { $, $$ } from "./dom.js";
import { addCharacter, sizeOptions } from "./characters.js";
import { t } from "./i18n.js";
import { clamp } from "./lib/geometry.js";
import { normalizeHealth } from "./lib/health.js";
import {
  cleanName,
  parseInitiative,
  parseVisionRadius,
} from "./lib/sanitize.js";
import { state } from "./state.js";
import { toast } from "./ui.js";

const TOKEN_SIZE = 300;
const TOKEN_BORDER = 10;

// Border colors by class (World of Warcraft palette, familiar to many players).
const CLASS_COLORS = [
  ["#C41E3A", "class.deathKnight"],
  ["#A330C9", "class.demonHunter"],
  ["#FF7C0A", "class.druid"],
  ["#AAD372", "class.hunter"],
  ["#3FC7EB", "class.mage"],
  ["#00FF98", "class.monk"],
  ["#F48CBA", "class.paladin"],
  ["#FFFFFF", "class.priest"],
  ["#FFF468", "class.rogue"],
  ["#0070DD", "class.shaman"],
  ["#8788EE", "class.warlock"],
  ["#C69B6D", "class.warrior"],
];

const dialog = $("#token-editor");
const form = $("#editor-form");
const drop = $("#editor-drop");
const canvas = $("#editor-canvas");
const fileInput = $("#char-upload");
const nameInput = $("#char-name");
const colorInput = $("#editor-color");
const swatches = $("#editor-swatches");
const visionLabel = $("#editor-vision-label");
const visionInput = $("#editor-vision");
const initiativeInput = $("#editor-initiative");
const maxHpInput = $("#editor-max-hp");
const sizeSelect = $("#editor-size");

const editor = {
  image: null,
  objectUrl: null,
  isEnemy: false,
  zoom: 1,
  panX: 0,
  panY: 0,
  drag: null,
};

/** Draws `img` clipped to a circle with a colored rim onto `ctx`. */
function drawToken(ctx, img, borderColor, zoom, panX, panY) {
  const outerR = TOKEN_SIZE / 2 - 2;
  const innerR = outerR - TOKEN_BORDER;
  const center = TOKEN_SIZE / 2;

  ctx.clearRect(0, 0, TOKEN_SIZE, TOKEN_SIZE);
  ctx.beginPath();
  ctx.arc(center, center, outerR, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, innerR, 0, Math.PI * 2);
  ctx.clip();
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const scale = Math.min((innerR * 2) / srcW, (innerR * 2) / srcH) * zoom;
  const w = srcW * scale;
  const h = srcH * scale;
  ctx.drawImage(img, center - w / 2 + panX, center - h / 2 + panY, w, h);
  ctx.restore();
}

/** PNG data URL of the token as currently framed. */
export function createTokenImage(img, borderColor, zoom, panX, panY) {
  const out = document.createElement("canvas");
  out.width = TOKEN_SIZE;
  out.height = TOKEN_SIZE;
  drawToken(out.getContext("2d"), img, borderColor, zoom, panX, panY);
  return out.toDataURL("image/png");
}

function renderPreview() {
  const ctx = canvas.getContext("2d");
  if (!editor.image) {
    ctx.clearRect(0, 0, TOKEN_SIZE, TOKEN_SIZE);
    return;
  }
  drawToken(
    ctx,
    editor.image,
    colorInput.value,
    editor.zoom,
    editor.panX,
    editor.panY,
  );
}

function setColor(color) {
  colorInput.value = color;
  $$(".swatch", swatches).forEach((s) =>
    s.setAttribute(
      "aria-pressed",
      String(s.dataset.color.toLowerCase() === color.toLowerCase()),
    ),
  );
  renderPreview();
}

function setSide(isEnemy) {
  editor.isEnemy = isEnemy;
  $$("#editor-side button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.enemy === String(isEnemy))),
  );
  visionLabel.hidden = isEnemy;
}

function releaseImage() {
  if (editor.objectUrl) URL.revokeObjectURL(editor.objectUrl);
  Object.assign(editor, { image: null, objectUrl: null, drag: null });
  drop.classList.remove("has-image");
}

function reset() {
  releaseImage();
  Object.assign(editor, { zoom: 1, panX: 0, panY: 0 });
  form.reset();
  setSide(false);
  setColor(CLASS_COLORS[0][0]);
}

function loadImage(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    releaseImage();
    Object.assign(editor, {
      image: img,
      objectUrl: url,
      zoom: 1,
      panX: 0,
      panY: 0,
    });
    drop.classList.add("has-image");
    renderPreview();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    toast(t("editor.imageFailed"), { kind: "error" });
  };
  img.src = url;
}

function openEditor() {
  reset();
  dialog.showModal();
  nameInput.focus();
}

function confirmToken(e) {
  e.preventDefault();
  if (!editor.image) {
    toast(t("editor.noImage"), { kind: "error" });
    return;
  }
  const name = cleanName(nameInput.value, t("editor.defaultName"));
  addCharacter({
    id: state.nextCharId,
    name,
    imageUrl: createTokenImage(
      editor.image,
      colorInput.value,
      editor.zoom,
      editor.panX,
      editor.panY,
    ),
    visionRadius: parseVisionRadius(visionInput.value),
    isEnemy: editor.isEnemy,
    initiative: parseInitiative(initiativeInput.value.trim()),
    ...normalizeHealth(null, maxHpInput.value),
    conditions: [],
    size: Number(sizeSelect.value),
  });
  dialog.close();
  toast(t("editor.joined", { name }), { kind: "success" });
}

export function initEditor() {
  sizeSelect.replaceChildren(...sizeOptions());
  swatches.prepend(
    ...CLASS_COLORS.map(([color, classKey]) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "swatch";
      swatch.title = t(classKey);
      swatch.dataset.color = color;
      swatch.style.background = color;
      swatch.addEventListener("click", () => setColor(color));
      return swatch;
    }),
  );

  $("#char-add").addEventListener("click", openEditor);
  $("#editor-cancel").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", releaseImage);
  form.addEventListener("submit", confirmToken);

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) loadImage(file);
  });
  colorInput.addEventListener("input", () => setColor(colorInput.value));
  $$("#editor-side button").forEach((b) =>
    b.addEventListener("click", () => setSide(b.dataset.enemy === "true")),
  );

  // Once there is an image, the circle frames it: wheel zooms, drag pans.
  drop.addEventListener("click", (e) => {
    if (editor.image) e.preventDefault();
  });
  drop.addEventListener("wheel", (e) => {
    if (!editor.image) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    editor.zoom = clamp(editor.zoom * factor, 0.5, 3);
    renderPreview();
  });
  drop.addEventListener("pointerdown", (e) => {
    if (!editor.image || e.button !== 0) return;
    editor.drag = {
      x: e.clientX,
      y: e.clientY,
      panX: editor.panX,
      panY: editor.panY,
    };
    drop.setPointerCapture(e.pointerId);
  });
  drop.addEventListener("pointermove", (e) => {
    if (!editor.drag) return;
    // The preview is drawn at half the token size, so moves count double.
    editor.panX = editor.drag.panX + (e.clientX - editor.drag.x) * 2;
    editor.panY = editor.drag.panY + (e.clientY - editor.drag.y) * 2;
    renderPreview();
  });
  drop.addEventListener("pointerup", () => {
    editor.drag = null;
  });
  // Double click picks another picture.
  drop.addEventListener("dblclick", () => fileInput.click());
}

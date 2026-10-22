// Token editor modal: turns an uploaded picture into a round token.
import { $ } from "./dom.js";
import { addCharacter } from "./characters.js";
import { clamp } from "./lib/geometry.js";
import {
  cleanName,
  parseInitiative,
  parseVisionRadius,
} from "./lib/sanitize.js";
import { state } from "./state.js";

const TOKEN_SIZE = 300;
const TOKEN_BORDER = 10;
const PREVIEW_SIZE = 150;

const modal = $("#token-editor");
const sourcePreview = $("#editor-source");
const canvas = $("#editor-canvas");
const colorInput = $("#editor-color");
const classSelect = $("#editor-class");
const enemyCheckbox = $("#editor-enemy");
const visionLabel = $("#editor-vision-label");
const visionInput = $("#editor-vision");
const initiativeInput = $("#editor-initiative");
const charUpload = $("#char-upload");
const charName = $("#char-name");

const editor = {
  name: "",
  image: null,
  objectUrl: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  drag: null,
};

/** Draws `img` clipped to a circle with a colored border; returns a PNG data URL. */
export function createTokenImage(img, borderColor, zoom, panX, panY) {
  const outerR = TOKEN_SIZE / 2 - 2;
  const innerR = outerR - TOKEN_BORDER;
  const center = TOKEN_SIZE / 2;

  const out = document.createElement("canvas");
  out.width = TOKEN_SIZE;
  out.height = TOKEN_SIZE;
  const ctx = out.getContext("2d");

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

  return out.toDataURL("image/png");
}

function currentTokenImage() {
  return createTokenImage(
    editor.image,
    colorInput.value,
    editor.zoom,
    editor.panX,
    editor.panY,
  );
}

function renderPreview() {
  if (!editor.image) return;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    ctx.drawImage(img, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  };
  img.src = currentTokenImage();
}

function open(image, objectUrl, name) {
  Object.assign(editor, { image, objectUrl, name, zoom: 1, panX: 0, panY: 0 });
  sourcePreview.src = objectUrl;
  renderPreview();
  modal.classList.remove("hidden");
}

function close() {
  modal.classList.add("hidden");
  if (editor.objectUrl) URL.revokeObjectURL(editor.objectUrl);
  Object.assign(editor, { image: null, objectUrl: null, drag: null });
  sourcePreview.removeAttribute("src");
  initiativeInput.value = "";
}

function confirm() {
  if (!editor.image) return;
  addCharacter({
    id: state.nextCharId,
    name: editor.name,
    imageUrl: currentTokenImage(),
    visionRadius: parseVisionRadius(visionInput.value),
    isEnemy: enemyCheckbox.checked,
    initiative: parseInitiative(initiativeInput.value.trim()),
  });
  charUpload.value = "";
  charName.value = "";
  close();
}

export function initEditor() {
  $("#char-add").addEventListener("click", () => {
    const file = charUpload.files[0];
    if (!file) return;
    const name = cleanName(charName.value);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => open(img, url, name);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert("No se pudo leer la imagen.");
    };
    img.src = url;
  });

  colorInput.addEventListener("input", () => {
    classSelect.value = "";
    renderPreview();
  });
  classSelect.addEventListener("change", () => {
    if (!classSelect.value) return;
    colorInput.value = classSelect.value;
    renderPreview();
  });
  enemyCheckbox.addEventListener("change", () => {
    visionLabel.style.display = enemyCheckbox.checked ? "none" : "";
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    editor.zoom = clamp(editor.zoom * factor, 0.5, 3);
    renderPreview();
  });
  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    editor.drag = {
      x: e.clientX,
      y: e.clientY,
      panX: editor.panX,
      panY: editor.panY,
    };
    canvas.style.cursor = "grabbing";
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!editor.drag) return;
    // The preview is drawn at half the token size, so mouse moves count double.
    editor.panX = editor.drag.panX + (e.clientX - editor.drag.x) * 2;
    editor.panY = editor.drag.panY + (e.clientY - editor.drag.y) * 2;
    renderPreview();
  });
  document.addEventListener("mouseup", () => {
    if (!editor.drag) return;
    editor.drag = null;
    canvas.style.cursor = "grab";
  });

  $("#editor-cancel").addEventListener("click", close);
  $("#editor-confirm").addEventListener("click", confirm);
}

// Small UI primitives: icons, toasts and a confirmation dialog that replace
// the browser's alert() and confirm().
import { $ } from "./dom.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/** An icon from the sprite in icons.svg. */
export function icon(name) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `icons.svg#i-${name}`);
  svg.appendChild(use);
  return svg;
}

const toasts = $("#toasts");

/** Shows a short message in the corner of the map. */
export function toast(message, { kind = "info", duration = 3500 } = {}) {
  const el = document.createElement("div");
  el.className = `toast pill ${kind}`;
  const iconName = {
    error: "alert-triangle",
    success: "check",
    turn: "sword",
  }[kind];
  el.append(icon(iconName ?? "info-circle"), message);
  toasts.appendChild(el);
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 300);
  }, duration);
}

const confirmDialogEl = $("#confirm-dialog");

/** Asks the user to confirm a destructive action. Resolves to a boolean. */
export function confirmDialog({
  title,
  message = "",
  confirmLabel = "Confirmar",
}) {
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-ok").textContent = confirmLabel;
  confirmDialogEl.returnValue = "";
  confirmDialogEl.showModal();
  return new Promise((resolve) => {
    confirmDialogEl.addEventListener(
      "close",
      () => resolve(confirmDialogEl.returnValue === "ok"),
      { once: true },
    );
  });
}

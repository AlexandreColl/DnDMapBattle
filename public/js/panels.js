// Sidebar: "Preparar" / "Partida" panels and collapsing.
import { $, $$ } from "./dom.js";

const sidebar = $("#sidebar");
const toggle = $("#sidebar-toggle");
const PANELS = { setup: $("#panel-setup"), play: $("#panel-play") };

export function showPanel(name) {
  for (const [key, panel] of Object.entries(PANELS)) {
    panel.hidden = key !== name;
  }
  $$("#sidebar [role=tab]").forEach((tab) =>
    tab.setAttribute("aria-selected", String(tab.dataset.panel === name)),
  );
}

function setCollapsed(collapsed) {
  sidebar.classList.toggle("collapsed", collapsed);
  toggle
    .querySelector("use")
    .setAttribute(
      "href",
      `icons.svg#i-layout-sidebar-left-${collapsed ? "expand" : "collapse"}`,
    );
}

export function initPanels() {
  $$("#sidebar [role=tab]").forEach((tab) =>
    tab.addEventListener("click", () => showPanel(tab.dataset.panel)),
  );
  $("#start-play").addEventListener("click", () => showPanel("play"));
  toggle.addEventListener("click", () =>
    setCollapsed(!sidebar.classList.contains("collapsed")),
  );
  // On small screens the sidebar covers the map: start hidden.
  setCollapsed(window.matchMedia("(max-width: 820px)").matches);
  showPanel("setup");
}

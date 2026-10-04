// app.js — Shell: Tab-Leiste, Routing, Laden der Module.
// Es ist immer genau EIN Modul gemountet. Das verhindert ID-/State-Kollisionen zwischen den
// Modulen (die alten Einzel-Apps benutzen teils dieselben Element-IDs) und stellt sicher,
// dass beim Wechsel frische Daten geladen werden.
import * as core from "./core.js";

const MODULES = [
  { id: "work", label: "Work", icon: "work", ready: true },
  { id: "health", label: "Health", icon: "monitor_heart", ready: true },
  { id: "food", label: "Food", icon: "restaurant", ready: true },
  { id: "habits", label: "Habits", icon: "task_alt", ready: true },
  { id: "sport", label: "Sport", icon: "fitness_center", ready: false },
];
const DEFAULT_MODULE = "health";
const STORE_KEY = "bensn.lastModule";

const view = document.getElementById("view");
const tabbar = document.getElementById("tabbar");
let current = null; // { id, mod }
let navToken = 0;

function remember(id) { try { localStorage.setItem(STORE_KEY, id); } catch (_) { /* privat/geblockt */ } }
function recall() { try { return localStorage.getItem(STORE_KEY); } catch (_) { return null; } }

function renderTabbar() {
  tabbar.innerHTML = MODULES.map(
    (m) => `<button data-id="${m.id}" aria-label="${m.label}">
      <span class="material-symbols-outlined">${m.icon}</span><span>${m.label}</span></button>`
  ).join("");
  tabbar.onclick = (e) => {
    const btn = e.target.closest("button[data-id]");
    if (btn) location.hash = "#/" + btn.dataset.id;
  };
}
function markActive(id) {
  tabbar.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
}

async function navigate(id) {
  if (!MODULES.some((m) => m.id === id)) id = DEFAULT_MODULE;
  if (current && current.id === id) return;
  const token = ++navToken;

  if (current) {
    try { await current.mod.unmount?.(); } catch (e) { console.error("unmount", e); }
    current = null;
  }
  view.innerHTML = "";
  core.clearError();
  markActive(id);
  remember(id);
  window.scrollTo(0, 0);

  const def = MODULES.find((m) => m.id === id);
  if (!def.ready) {
    view.innerHTML = `<div class="module-placeholder"><span class="material-symbols-outlined">${def.icon}</span>${def.label}<br>kommt als Nächstes</div>`;
    return;
  }
  try {
    const mod = (await import(`./modules/${id}.js`)).default;
    if (token !== navToken) return; // zwischenzeitlich weitergewechselt
    const root = document.createElement("section");
    root.className = `module m-${id}`;
    view.append(root);
    await mod.mount(root, core);
    current = { id, mod };
  } catch (e) {
    console.error("Modul laden fehlgeschlagen", e);
    core.showError(`Modul "${def.label}" konnte nicht geladen werden: ${e.message}`);
  }
}

function routeFromHash() {
  const id = location.hash.replace(/^#\//, "").split("/")[0];
  return id || recall() || DEFAULT_MODULE;
}

/* ── Wischen zwischen den Sub-Tabs (Heute / Verlauf / …) des gemounteten Moduls ──
   Nach links = nächster Tab, nach rechts = voriger. Ausgenommen: Eingabefelder, Sheets/Overlays, horizontal
   scrollbare Bereiche (z.B. die Tab-Leiste selbst) und alles mit data-noswipe (Kalender: dort wischt man Monate). */
const SWIPE_SKIP = 'input, textarea, select, [contenteditable], [data-noswipe], [class*="overlay"], [id*="overlay"]';
function scrollsHorizontally(el) {
  for (let n = el; n && n !== view; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) return true;
  }
  return false;
}
let swipe = null;
view.addEventListener("touchstart", (e) => {
  swipe = null;
  if (e.touches.length !== 1 || e.target.closest(SWIPE_SKIP) || scrollsHorizontally(e.target)) return;
  swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
view.addEventListener("touchend", (e) => {
  if (!swipe) return;
  const c = e.changedTouches[0], dx = c.clientX - swipe.x, dy = c.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  const tabs = [...view.querySelectorAll(".subnav .tabs .tab")];
  const next = tabs[tabs.findIndex((t) => t.classList.contains("active")) + (dx < 0 ? 1 : -1)];
  if (next) {
    next.click();
    next.scrollIntoView({ inline: "center", block: "nearest" });
  }
}, { passive: true });

renderTabbar();
window.addEventListener("hashchange", () => navigate(routeFromHash()));
navigate(routeFromHash());

// Service Worker: nur für Installierbarkeit (kein Offline-Cache der App — Module kommen immer frisch).
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

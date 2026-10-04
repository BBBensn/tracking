// food.js — Modul "Food": Katalog, Vorlagen, Mahlzeiten mit Nährwerten, Tagessummen.
// Backend: health-api (/hapi/…), siehe health/schema_food.sql. Neu geschrieben (keine
// Übernahme einer Alt-App): Events laufen per Delegation über data-act, kein window-Namespace.
//
// Datenmodell in Kürze: Katalog (health_foods, Werte pro Portion ODER pro 100 g/ml — `basis`) → Mahlzeit (health_meals)
// besteht aus Zeilen (health_meal_items) mit Snapshot der Nährwerte. Vorlagen (Bundles) klappen
// beim Antippen in einzeln anpassbare Zeilen auf (z.B. Salat = 150 g Salat + 4 Falafel + 2 Kornspitz).
// Lebensmittel mit Basis g/ml werden in Gramm/Milliliter erfasst (z.B. 200 g von einer 250-g-Packung).
// Verlauf: gemeinsame Komponente js/history.js (Monate einklappbar, Liste/Kalender).

import { createHistory } from "../history.js";

// Richtwerte für gesunde Erwachsene — Quellen stehen in `note` und werden in der App angezeigt.
const LIMITS = {
  sugar_g: { label: "Zucker", unit: "g", max: 50, strict: 25,
    note: "WHO: freie Zucker unter 10 % der Energie, besser unter 5 % (≈ 50 g bzw. 25 g bei 2000 kcal)" },
  caffeine_mg: { label: "Koffein", unit: "mg", max: 400,
    note: "EFSA: bis 400 mg/Tag für gesunde Erwachsene, höchstens 200 mg auf einmal" },
};
const MEAL_LABELS = ["Frühstück", "Mittag", "Abend", "Snack"];
const SOURCES = [["geschätzt", "geschätzt"], ["packung", "Packung"], ["manuell", "manuell"]];

const CSS = `.m-food {
  .fd-section { display: none; }
  .fd-section.visible { display: block; }
  .fd-sub { font-family: "DM Mono", monospace; font-size: 10px; color: var(--muted); }

  /* Tagessumme */
  .fd-sum { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; }
  .fd-sum-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; margin-bottom: 0.9rem; }
  .fd-kcal { font-family: "Syne", sans-serif; font-weight: 800; font-size: 2.1rem; line-height: 1; letter-spacing: -0.02em; }
  .fd-kcal small { font-family: "DM Mono", monospace; font-weight: 400; font-size: 11px; color: var(--muted); letter-spacing: 0; }
  .fd-macros { display: flex; flex-direction: column; gap: 2px; text-align: right; font-family: "DM Mono", monospace; font-size: 10px; color: var(--muted); }
  .fd-macros b { color: var(--text); font-weight: 500; }
  .fd-meter { margin-top: 0.7rem; }
  .fd-meter-head { display: flex; justify-content: space-between; font-family: "DM Mono", monospace; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; }
  .fd-meter-head b { color: var(--text); font-weight: 500; }
  .fd-bar { position: relative; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
  .fd-bar > i { position: absolute; inset: 0 auto 0 0; border-radius: 3px; background: var(--green); transition: width 0.4s ease; }
  .fd-meter.warn .fd-bar > i { background: var(--orange); }
  .fd-meter.over .fd-bar > i { background: var(--accent-red); }
  .fd-bar .tick { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(255, 255, 255, 0.35); }
  .fd-meter-note { font-family: "DM Mono", monospace; font-size: 9.5px; color: var(--muted); margin-top: 4px; line-height: 1.4; }
  .fd-hint { font-family: "DM Mono", monospace; font-size: 10px; color: var(--muted); margin-top: 0.8rem; line-height: 1.5; }

  /* Kacheln */
  .fd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .fd-tile { position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 0.8rem 0.85rem; cursor: pointer; transition: border-color 0.15s, background 0.15s; -webkit-tap-highlight-color: transparent; user-select: none; min-width: 0; }
  .fd-tile:active { background: rgba(255, 255, 255, 0.04); }
  .fd-tile.in-cart { border-color: var(--accent-blue); background: rgba(0, 166, 251, 0.07); }
  .fd-tile-name { font-family: "Syne", sans-serif; font-weight: 700; font-size: 0.9rem; overflow-wrap: break-word; hyphens: auto; }
  .fd-tile-kcal { font-family: "DM Mono", monospace; font-size: 10px; color: var(--text); margin-top: 6px; opacity: 0.85; }
  .fd-ctl { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
  .fd-badge { min-width: 22px; height: 22px; padding: 0 7px; border-radius: 11px; background: var(--accent-blue); color: #04121c; font-family: "DM Mono", monospace; font-size: 11px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; }
  .fd-minus { width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--border-hover); background: rgba(0, 0, 0, 0.35); color: var(--text); font-size: 16px; line-height: 1; cursor: pointer; padding: 0; }
  .fd-badge[data-act] { cursor: pointer; border: 0; }
  .fd-amt { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .fd-amt .input-row { width: 7.5rem; margin-bottom: 0; padding: 0.3rem 0.6rem; }
  .fd-amt .input-row input { font-size: 1rem; min-width: 0; width: 100%; text-align: right; }
  .fd-chips { display: flex; gap: 4px; }
  .fd-chips button { font-family: "DM Mono", monospace; font-size: 10.5px; padding: 2px 7px; border-radius: 6px; border: 1px solid var(--border); background: none; color: var(--muted); cursor: pointer; }
  .fd-bundle { display: flex; align-items: center; gap: 0.75rem; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 0.8rem 0.9rem; margin-bottom: 0.5rem; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .fd-bundle:active { background: rgba(255, 255, 255, 0.04); }
  .fd-bundle .material-symbols-outlined { color: var(--accent-blue); font-size: 22px; }
  .fd-bundle-main { flex: 1; min-width: 0; }

  /* Warenkorb-Leiste (über der unteren Tab-Leiste) */
  .fd-cartbar { position: sticky; bottom: calc(var(--nav-clear) + 0.5rem); display: none; align-items: center; gap: 0.5rem; background: #161616; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 0.6rem 0.75rem; margin-top: 0.8rem; z-index: 10; }
  .fd-cartbar.visible { display: flex; }
  .fd-cart-sum { flex: 1; min-width: 0; font-family: "DM Mono", monospace; font-size: 11px; color: var(--muted); }
  .fd-cart-sum b { color: var(--text); font-weight: 500; }

  /* Mahlzeit-Karten */
  .fd-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 0.7rem 0.8rem; margin-bottom: 0.5rem; }
  .fd-card-head { display: flex; align-items: center; gap: 0.5rem; }
  .fd-time { font-family: "DM Mono", monospace; font-size: 11px; color: var(--text); }
  .fd-card-kcal { margin-left: auto; font-family: "DM Mono", monospace; font-size: 11px; color: var(--muted); }
  .fd-line { display: flex; justify-content: space-between; gap: 0.75rem; font-family: "Syne", sans-serif; font-weight: 700; font-size: 0.88rem; margin-top: 6px; }
  .fd-line > span:first-child { min-width: 0; overflow-wrap: anywhere; }
  .fd-line .fd-sub { font-weight: 400; flex-shrink: 0; align-self: center; }
  .fd-legacy { margin-top: 6px; font-family: "DM Mono", monospace; font-size: 11px; color: var(--muted); }
  .fd-note { margin-top: 6px; padding-left: 0.6rem; border-left: 2px solid var(--border); font-family: "DM Mono", monospace; font-size: 10.5px; color: var(--muted); }
  .fd-toolbar { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.25rem; }
  .fd-row { display: flex; align-items: center; gap: 0.6rem; }
  .fd-row-main { flex: 1; min-width: 0; }
  .fd-row-name { font-family: "Syne", sans-serif; font-weight: 700; font-size: 0.9rem; overflow-wrap: anywhere; }

  /* Sheets */
  /* minmax(0, 1fr): sonst darf eine Spalte nicht unter die natürliche Breite des Eingabefelds schrumpfen
     und das Sheet läuft seitlich über */
  .fd-grid2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 0.6rem; }
  .fd-grid2 > div { min-width: 0; }
  .fd-grid2 .input-row { min-width: 0; }
  .fd-fl { font-family: "DM Mono", monospace; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0 0 0.3rem 0.15rem; }
  .fd-grid2 .input-row input { font-size: 1rem; width: 100%; min-width: 0; }
  .fd-eline { display: flex; align-items: center; gap: 0.5rem; padding: 6px 0; border-bottom: 1px solid var(--border); }
  .fd-eline-name { flex: 1; min-width: 0; font-family: "Syne", sans-serif; font-weight: 700; font-size: 0.88rem; overflow-wrap: anywhere; }
  .fd-step { display: flex; align-items: center; gap: 0.4rem; font-family: "DM Mono", monospace; font-size: 13px; }
  .fd-step button { width: 26px; height: 26px; padding: 0; }
  .fd-step span { min-width: 1.6em; text-align: center; }
  .fd-addrow { display: flex; gap: 0.5rem; align-items: center; margin: 0.6rem 0 1rem; }
  .fd-addrow .input-row { flex: 1; min-width: 0; margin-bottom: 0; }
  .fd-addrow select { font-size: 0.95rem; width: 100%; min-width: 0; max-width: 100%; text-overflow: ellipsis; }
  .fd-addrow .btn-pill { flex-shrink: 0; }
}
`;

const TEMPLATE = `
<div class="subnav"><div class="tabs" id="fdTabs">
  <button class="tab active" data-tab="heute">Heute</button>
  <button class="tab" data-tab="verlauf">Verlauf</button>
  <button class="tab" data-tab="katalog">Katalog</button>
</div></div>
<div class="fd-section visible" id="fd-heute"></div>
<div class="fd-section" id="fd-verlauf"></div>
<div class="fd-section" id="fd-katalog"></div>
<div class="fd-cartbar" id="fdCartBar"></div>
<div id="fdSheets"></div>
`;

function build(core, root) {
  const { esc } = core;
  const api = core.apiHealth;
  const $ = (id) => root.querySelector("#" + id);

  const st = {
    tab: "heute", kind: "all",
    foods: [], bundles: [], meals: [], summary: [],
    cart: new Map(), extra: [],      // Warenkorb: food_id -> qty, plus freie Posten
    draft: null,                     // Eingaben im offenen Sheet (Zeit/Label/Notiz/…)
    loaded: false,                   // erst nach dem ersten erfolgreichen Laden "leer"-Hinweise zeigen
    busy: false,
  };

  /* ── Formatierung ── */
  const num = (v) => { const x = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(x) ? x : null; };
  const n0 = (v) => Math.round(Number(v) || 0);
  const n1 = (v) => { const x = Math.round((Number(v) || 0) * 10) / 10; return Number.isInteger(x) ? String(x) : x.toFixed(1).replace(".", ","); };
  // Schritte: 0,5 → 1 → 2 → 3 … (halbe Portionen sind erlaubt, darunter wird entfernt)
  const stepQty = (q, d) => (d > 0 ? q + (q < 1 ? 0.5 : 1) : q - (q > 1 ? 1 : 0.5));
  const foodMap = () => new Map(st.foods.map((f) => [f.id, f]));
  // Lebensmittel mit Basis g/ml: Menge in g/ml, Nährwerte pro 100. Sonst: Anzahl Portionen.
  const isG = (f) => !!f && !!f.basis && f.basis !== "portion";
  const unitOf = (f) => (f.basis === "ml" ? "ml" : "g");
  const factor = (f, n) => (isG(f) ? n / 100 : n);                       // Multiplikator auf die Katalogwerte
  const defAmount = (f) => (isG(f) ? Number(f.portion_g) || 100 : 1);    // Menge beim ersten Antippen
  const stepFood = (f, n, d) => (isG(f) ? n + d * 25 : stepQty(n, d));   // ±25 g bzw. halbe/ganze Portionen
  const fmtAmount = (f, n) => (isG(f) ? `${n1(n)} ${unitOf(f)}` : `${n1(n)}×`);
  const sumKcal = (items) => items.reduce((a, i) => a + (Number(i.kcal) || 0), 0);

  /* ── Laden ── */
  async function loadAll() {
    const [foods, bundles, meals, summary] = await Promise.all([
      api("/api/foods"), api("/api/food-bundles"), api("/api/meal-logs?limit=300"), api("/api/food-summary?days=90"),
    ]);
    Object.assign(st, { foods, bundles, meals, summary, loaded: true });
  }
  async function refresh() {
    try { await loadAll(); } catch (e) { return; }  // core.api zeigt den Fehler im Banner
    renderAll();
  }

  /* ── Render: Heute ── */
  function meter(key, value) {
    const L = LIMITS[key];
    const pct = Math.min((value / L.max) * 100, 100);
    const cls = value > L.max ? "over" : value >= L.max * 0.75 ? "warn" : "";
    const tick = L.strict ? `<span class="tick" style="left:${(L.strict / L.max) * 100}%"></span>` : "";
    return `<div class="fd-meter ${cls}">
      <div class="fd-meter-head"><span>${L.label}</span><span><b>${n0(value)}</b> / ${L.max} ${L.unit}</span></div>
      <div class="fd-bar"><i style="width:${pct}%"></i>${tick}</div>
      <div class="fd-meter-note">${esc(L.note)}</div></div>`;
  }

  // "150 g Eisbergsalat · 4× Falafel · ca. 420 kcal" — qty ist für alle Basen der Multiplikator auf die Katalogwerte
  function bundleText(b) {
    const kcal = b.items.reduce((a, i) => a + (Number(i.kcal) || 0) * Number(i.qty), 0);
    const parts = b.items.map((i) => (i.basis && i.basis !== "portion" && i.amount != null ? `${n1(i.amount)} ${i.basis} ` : Number(i.qty) !== 1 ? n1(i.qty) + "× " : "") + esc(i.name));
    return parts.join(" · ") + (kcal ? ` · ca. ${n0(kcal)} kcal` : "");
  }

  function cartLines() {
    const fm = foodMap();
    return [...st.cart].map(([id, qty]) => ({ food: fm.get(id), qty })).filter((l) => l.food);
  }
  function cartKcal() {
    return cartLines().reduce((a, l) => a + (Number(l.food.kcal) || 0) * factor(l.food, l.qty), 0) + st.extra.reduce((a, x) => a + (x.kcal || 0), 0);
  }

  function tile(f) {
    const q = st.cart.get(f.id) || 0;
    const facts = [isG(f) ? `${n0(f.kcal)} kcal / 100 ${unitOf(f)}` : `${n0(f.kcal)} kcal`, f.sugar_g ? `${n1(f.sugar_g)} g Zucker` : "", f.caffeine_mg ? `${n0(f.caffeine_mg)} mg Koffein` : ""].filter(Boolean).join(" · ");
    return `<div class="fd-tile ${q ? "in-cart" : ""}" role="button" tabindex="0" data-act="add" data-id="${f.id}">
      <div class="fd-tile-name">${esc(f.name)}</div>
      <div class="fd-sub">${isG(f) && f.portion_g ? `${esc(f.serving_label)} · ${n0(f.portion_g)} ${unitOf(f)}` : isG(f) ? `pro 100 ${unitOf(f)}` : esc(f.serving_label)}</div>
      <div class="fd-tile-kcal">${facts}</div>
      ${q ? `<div class="fd-ctl"><span class="fd-badge" ${isG(f) ? 'data-act="cartSheet" title="Menge ändern"' : ""}>${fmtAmount(f, q)}</span><button class="fd-minus" data-act="minus" data-id="${f.id}" aria-label="Eine weniger">−</button></div>` : ""}</div>`;
  }

  function mealCard(m) {
    const items = m.items || [];
    const total = sumKcal(items);
    const lines = items.length
      ? items.map((i) => `<div class="fd-line"><span>${i.amount_unit ? `${n1(i.amount)} ${i.amount_unit} ` : Number(i.qty) !== 1 ? n1(i.qty) + "× " : ""}${esc(i.name)}</span><span class="fd-sub">${i.kcal != null ? n0(i.kcal) + " kcal" : "–"}</span></div>`).join("")
      : `<div class="fd-legacy">${esc(m.description || "")} · ohne Nährwerte</div>`;
    return `<div class="fd-card">
      <div class="fd-card-head"><span class="fd-time">${core.fmtClock(m.eaten_at)}</span>
        ${m.label ? `<span class="tag-pill">${esc(m.label)}</span>` : ""}
        <span class="fd-card-kcal">${items.length ? n0(total) + " kcal" : ""}</span>
        <button class="btn-icon" data-act="editMeal" data-id="${m.id}" aria-label="Bearbeiten"><span class="material-symbols-outlined">edit</span></button></div>
      ${lines}${m.note ? `<div class="fd-note">${esc(m.note)}</div>` : ""}</div>`;
  }

  function renderHeute() {
    const today = core.todayKey();
    const day = st.summary.find((d) => d.day === today) || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugar_g: 0, caffeine_mg: 0 };
    const favs = st.foods.filter((f) => st.kind === "all" || f.kind === st.kind);
    const todays = st.meals.filter((m) => core.dayKey(m.eaten_at) === today);
    $("fd-heute").innerHTML = `
      <div class="fd-sum">
        <div class="fd-sum-top">
          <div><div class="fd-kcal">${n0(day.kcal)}<small> kcal</small></div><div class="fd-sub">heute</div></div>
          <div class="fd-macros"><span><b>${n0(day.protein_g)}</b> g Eiweiß</span><span><b>${n0(day.carbs_g)}</b> g Kohlenhydrate</span><span><b>${n0(day.fat_g)}</b> g Fett</span></div>
        </div>
        ${meter("sugar_g", Number(day.sugar_g) || 0)}${meter("caffeine_mg", Number(day.caffeine_mg) || 0)}
      </div>
      ${st.bundles.length ? `<div class="section-label">Gerichte</div>${st.bundles.map((b) => `
        <div class="fd-bundle" role="button" tabindex="0" data-act="addBundle" data-id="${b.id}">
          <span class="material-symbols-outlined">playlist_add</span>
          <div class="fd-bundle-main"><div class="fd-row-name">${esc(b.name)}</div>
            <div class="fd-sub">${bundleText(b)}</div></div>
        </div>`).join("")}` : ""}
      <div class="section-label">Favoriten</div>
      <div class="tag-picker">${[["all", "Alle"], ["food", "Essen"], ["drink", "Getränke"]].map(([k, l]) => `<button class="tag-btn ${st.kind === k ? "active" : ""}" data-act="kind" data-kind="${k}">${l}</button>`).join("")}
        <button class="tag-btn" data-act="cartSheetFree">+ Eigener Posten</button></div>
      ${favs.length ? `<div class="fd-grid">${favs.map(tile).join("")}</div>` : `<div class="empty-state">${st.loaded ? "Noch nichts im Katalog." : "Lädt…"}</div>`}
      <div class="section-label">Heute gegessen</div>
      ${todays.length ? todays.map(mealCard).join("") : `<div class="empty-state">${st.loaded ? "Heute noch nichts eingetragen." : "Lädt…"}</div>`}`;
    renderCartBar();
  }

  function renderCartBar() {
    const bar = $("fdCartBar");
    const count = st.cart.size + st.extra.length;
    bar.classList.toggle("visible", count > 0);
    if (!count) { bar.innerHTML = ""; return; }
    bar.innerHTML = `<span class="fd-cart-sum"><b>${count}</b> Posten · <b>${n0(cartKcal())}</b> kcal</span>
      <button class="btn-icon" data-act="cartClear" aria-label="Leeren"><span class="material-symbols-outlined">close</span></button>
      <button class="btn-icon" data-act="cartSheet" aria-label="Zeit, Label, Notiz"><span class="material-symbols-outlined">tune</span></button>
      <button class="btn-pill green" data-act="cartLog">Eintragen</button>`;
  }

  /* ── Render: Verlauf ── */
  let hx = null, byDay = new Map();
  function renderVerlauf() {
    byDay = new Map();
    st.meals.forEach((m) => { const k = core.dayKey(m.eaten_at); (byDay.get(k) || byDay.set(k, []).get(k)).push(m); });
    st.summary.forEach((d) => { if (!byDay.has(d.day)) byDay.set(d.day, []); });   // Tage nur mit Getränken aus dem Tracking
    if (!hx) hx = createHistory($("fd-verlauf"), {
      key: "food",
      renderDay: (k) => {
        const s = st.summary.find((d) => d.day === k);
        const meals = byDay.get(k) || [];
        return {
          extra: s ? `<div class="fd-hint" style="margin:0">${n0(s.kcal)} kcal · ${n1(s.sugar_g)} g Zucker · ${n0(s.caffeine_mg)} mg Koffein</div>` : "",
          body: meals.length ? meals.map(mealCard).join("") : `<div class="fd-hint" style="margin:0 0 .5rem">Nur Getränke aus dem Tracking.</div>`,
        };
      },
    });
    const days = new Map();
    byDay.forEach((meals, k) => days.set(k, { count: meals.length, marks: meals.length ? ["var(--green)"] : ["var(--accent-blue)"] }));
    hx.setData(days);
  }

  /* ── Render: Katalog ── */
  function renderKatalog() {
    const row = (name, sub, right, act, id) => `<div class="fd-card"><div class="fd-row">
      <div class="fd-row-main"><div class="fd-row-name">${esc(name)}</div><div class="fd-sub">${sub}</div></div>
      ${right}<button class="btn-icon" data-act="${act}" data-id="${id}" aria-label="Bearbeiten"><span class="material-symbols-outlined">edit</span></button></div></div>`;
    const foodRow = (f) => row(f.name,
      `${isG(f) ? `${n0(f.kcal)} kcal / 100 ${unitOf(f)}${f.portion_g ? ` · ${esc(f.serving_label)} ${n0(f.portion_g)} ${unitOf(f)}` : ""}` : `${esc(f.serving_label)} · ${n0(f.kcal)} kcal`}${f.sugar_g ? ` · ${n1(f.sugar_g)} g Z` : ""}${f.caffeine_mg ? ` · ${n0(f.caffeine_mg)} mg K` : ""}`,
      f.source === "geschätzt" ? `<span class="tag-pill" title="Geschätzter Wert">~</span>` : "", "editFood", f.id);
    const group = (kind) => st.foods.filter((f) => f.kind === kind).sort((a, b) => a.name.localeCompare(b.name, "de")).map(foodRow).join("") || `<div class="empty-state">Leer.</div>`;
    $("fd-katalog").innerHTML = `
      <div class="fd-toolbar"><button class="btn-pill green" data-act="newFood">+ Neu</button><button class="btn-pill" data-act="newBundle">+ Gericht</button></div>
      <div class="section-label">Essen</div>${group("food")}
      <div class="section-label">Getränke</div>${group("drink")}
      <div class="section-label">Gerichte</div>
      ${st.bundles.map((b) => row(b.name, bundleText(b), "", "editBundle", b.id)).join("") || `<div class="empty-state">Noch keine Gerichte.</div>`}`;
  }

  function renderAll() { renderHeute(); renderVerlauf(); renderKatalog(); }

  /* ── Sheets ── */
  function openSheet(html) {
    $("fdSheets").innerHTML = `<div class="overlay visible" data-act="backdrop"><div class="overlay-sheet">${html}</div></div>`;
  }
  function closeSheet() { $("fdSheets").innerHTML = ""; st.draft = null; }
  const val = (id) => { const el = $(id); return el ? el.value : ""; };
  const stepper = (act, id, qty) => `<span class="fd-step"><button class="btn-pill" data-act="${act}" data-id="${id}" data-d="-1">−</button><span>${n1(qty)}</span><button class="btn-pill" data-act="${act}" data-id="${id}" data-d="1">+</button></span>`;
  // Mengenfeld je Zeile: g/ml-Lebensmittel bekommen ein Eingabefeld (+ Schnellwahl ¼ ½ ¾ 1 einer Packung), sonst Stepper.
  // ctx: cart | edit | bundle, key: food_id bzw. Zeilenindex
  function qtyControl(ctx, key, f, n, stepAct) {
    if (!isG(f)) return stepper(stepAct, key, n);
    const chips = f.portion_g ? `<span class="fd-chips">${[["¼", 0.25], ["½", 0.5], ["¾", 0.75], ["1", 1]].map(([l, x]) =>
      `<button data-act="amtFrac" data-ctx="${ctx}" data-key="${key}" data-f="${x}">${l}</button>`).join("")}</span>` : "";
    return `<div class="fd-amt"><div class="input-row"><input data-amt="${ctx}" data-key="${key}" inputmode="decimal" value="${esc(String(Math.round(n * 10) / 10).replace(".", ","))}"><span class="input-unit">${unitOf(f)}</span></div>${chips}</div>`;
  }
  const labelPicker = (current) => `<div class="tag-picker">${MEAL_LABELS.map((l) => `<button class="tag-btn ${current === l ? "active" : ""}" data-act="pickLabel" data-label="${l}">${l}</button>`).join("")}</div>`;
  const foodOptions = () => st.foods.sort((a, b) => a.name.localeCompare(b.name, "de")).map((f) => `<option value="${f.id}">${esc(f.name)} (${isG(f) ? "pro 100 " + unitOf(f) : esc(f.serving_label)})</option>`).join("");

  // Eingaben des offenen Sheets sichern, bevor es neu gerendert wird (Stepper, Posten entfernen …)
  function captureDraft() {
    if (!st.draft) return;
    if ($("fdTime")) st.draft.time = val("fdTime");
    if ($("fdNote")) st.draft.note = val("fdNote");
  }

  /* — Warenkorb-Sheet (Zeit, Label, Notiz, Posten) — */
  function openCartSheet(focusFree) {
    if (!st.draft || st.draft.type !== "cart") st.draft = { type: "cart", time: core.nowForDatetimeLocal(), label: "", note: "" };
    const d = st.draft;
    const lines = cartLines().map((l) => `<div class="fd-eline"><div class="fd-eline-name">${esc(l.food.name)}<div class="fd-sub">${n0(l.food.kcal * factor(l.food, l.qty))} kcal</div></div>
        ${qtyControl("cart", l.food.id, l.food, l.qty, "cStep")}<button class="btn-icon" data-act="cDel" data-id="${l.food.id}" aria-label="Entfernen"><span class="material-symbols-outlined">delete</span></button></div>`).join("")
      + st.extra.map((x, i) => `<div class="fd-eline"><div class="fd-eline-name">${esc(x.name)}<div class="fd-sub">${n0(x.kcal)} kcal${x.fat_g ? ` · ${n1(x.fat_g)} g Fett` : ""}${x.sugar_g ? ` · ${n1(x.sugar_g)} g Z` : ""}${x.caffeine_mg ? ` · ${n0(x.caffeine_mg)} mg K` : ""}</div></div>
        <button class="btn-icon" data-act="cDelExtra" data-i="${i}" aria-label="Entfernen"><span class="material-symbols-outlined">delete</span></button></div>`).join("");
    openSheet(`<div class="sheet-title">Mahlzeit eintragen</div>
      <div class="sheet-label">Zeitpunkt</div><div class="input-row"><input type="datetime-local" id="fdTime" value="${esc(d.time)}"></div>
      <div class="sheet-label">Label (optional)</div>${labelPicker(d.label)}
      <div class="sheet-label">Posten</div>${lines || `<div class="fd-sub" style="padding:.4rem 0">Noch nichts ausgewählt.</div>`}
      <div class="sheet-label" style="margin-top:.9rem">Eigener Posten (nicht im Katalog)</div>
      <div class="input-row"><input id="fxName" placeholder="Name, z.B. Restaurant-Pizza"></div>
      <div class="fd-grid2">
        <div><div class="fd-fl">Kalorien</div><div class="input-row"><input id="fxKcal" inputmode="decimal" placeholder="0"><span class="input-unit">kcal</span></div></div>
        <div><div class="fd-fl">Eiweiß</div><div class="input-row"><input id="fxProt" inputmode="decimal" placeholder="0"><span class="input-unit">g</span></div></div>
        <div><div class="fd-fl">Kohlenhydrate</div><div class="input-row"><input id="fxCarbs" inputmode="decimal" placeholder="0"><span class="input-unit">g</span></div></div>
        <div><div class="fd-fl">Fett</div><div class="input-row"><input id="fxFat" inputmode="decimal" placeholder="0"><span class="input-unit">g</span></div></div>
        <div><div class="fd-fl">Zucker</div><div class="input-row"><input id="fxSugar" inputmode="decimal" placeholder="0"><span class="input-unit">g</span></div></div>
        <div><div class="fd-fl">Koffein</div><div class="input-row"><input id="fxCaf" inputmode="decimal" placeholder="0"><span class="input-unit">mg</span></div></div>
      </div>
      <button class="btn-pill" data-act="cAddExtra" style="margin-bottom:1rem">+ Hinzufügen</button>
      <div class="sheet-label">Notiz (optional)</div><textarea class="note-input" id="fdNote" placeholder="z.B. Portion kleiner, Restaurant …">${esc(d.note)}</textarea>
      <div class="sheet-btns"><button class="btn-cancel" data-act="closeSheet">Abbrechen</button><button class="btn-save" data-act="cartLogSheet">Eintragen · ${n0(cartKcal())} kcal</button></div>`);
    if (focusFree) $("fxName")?.focus();
  }

  /* — Mahlzeit bearbeiten — */
  function openEditMeal(id) {
    const m = st.meals.find((x) => x.id === id);
    if (!m) return;
    if (!st.draft || st.draft.type !== "edit" || st.draft.id !== id) {
      st.draft = { type: "edit", id, time: core.isoToDatetimeLocal(m.eaten_at), label: m.label || "", note: m.note || "", dirty: false,
        legacy: !(m.items || []).length ? m.description : null,
        items: (m.items || []).map((i) => ({ food_id: i.food_id, name: i.name, qty: Number(i.qty), amount: i.amount != null ? Number(i.amount) : null, amount_unit: i.amount_unit || null, kcal: i.kcal, protein_g: i.protein_g, carbs_g: i.carbs_g, fat_g: i.fat_g, sugar_g: i.sugar_g, caffeine_mg: i.caffeine_mg })) };
    }
    const d = st.draft;
    const lines = d.items.map((i, idx) => `<div class="fd-eline"><div class="fd-eline-name">${esc(i.name)}<div class="fd-sub">${i.kcal != null ? n0(i.kcal) + " kcal" : "ohne Nährwerte"}${i.food_id ? "" : " · freier Posten"}</div></div>
        ${i.food_id ? qtyControl("edit", idx, foodMap().get(i.food_id) || { basis: i.amount_unit || "portion" }, i.amount_unit ? i.amount : i.qty, "eStep") : ""}<button class="btn-icon" data-act="eDel" data-i="${idx}" aria-label="Entfernen"><span class="material-symbols-outlined">delete</span></button></div>`).join("");
    openSheet(`<div class="sheet-title">Mahlzeit bearbeiten</div>
      <div class="sheet-label">Zeitpunkt</div><div class="input-row"><input type="datetime-local" id="fdTime" value="${esc(d.time)}"></div>
      <div class="sheet-label">Label</div>${labelPicker(d.label)}
      <div class="sheet-label">Posten</div>
      ${d.legacy ? `<div class="fd-legacy" style="margin:0 0 .5rem">Alt-Eintrag: „${esc(d.legacy)}“ — ohne Nährwerte. Posten hinzufügen, um ihn zu verknüpfen.</div>` : ""}
      ${lines}
      <div class="fd-addrow"><div class="input-row"><select id="fdAddFood">${foodOptions()}</select></div><button class="btn-pill" data-act="eAdd">Hinzufügen</button></div>
      <div class="sheet-label">Notiz</div><textarea class="note-input" id="fdNote">${esc(d.note)}</textarea>
      <div class="sheet-btns"><button class="btn-pill red" data-act="eDelete">Löschen</button><button class="btn-cancel" data-act="closeSheet">Abbrechen</button><button class="btn-save" data-act="eSave">Speichern</button></div>`);
  }

  /* — Katalogeintrag — */
  function openFoodSheet(id) {
    const f = id ? st.foods.find((x) => x.id === id) : null;
    st.draft = { type: "food", id: f ? f.id : null, kind: f ? f.kind : "food", source: f ? f.source : "geschätzt", basis: f ? f.basis || "portion" : "portion" };
    const v = (k) => (f && f[k] != null ? esc(String(f[k]).replace(".", ",")) : "");
    const field = (key, label, unit) => `<div><div class="fd-fl">${label}</div><div class="input-row"><input id="ff_${key}" inputmode="decimal" placeholder="0" value="${v(key)}"><span class="input-unit">${unit}</span></div></div>`;
    openSheet(`<div class="sheet-title">${f ? "Eintrag bearbeiten" : "Neuer Katalogeintrag"}</div>
      <div class="input-row"><input id="ff_name" placeholder="Name" value="${f ? esc(f.name) : ""}"></div>
      <div class="tag-picker">${[["food", "Essen"], ["drink", "Getränk"]].map(([k, l]) => `<button class="tag-btn ${st.draft.kind === k ? "active" : ""}" data-act="pickKind" data-kind="${k}">${l}</button>`).join("")}</div>
      <div class="sheet-label">Nährwerte beziehen sich auf</div>
      <div class="tag-picker">${[["portion", "1 Portion"], ["g", "100 g"], ["ml", "100 ml"]].map(([k, l]) => `<button class="tag-btn ${st.draft.basis === k ? "active" : ""}" data-act="pickBasis" data-basis="${k}">${l}</button>`).join("")}</div>
      <div class="input-row"><input id="ff_serving" placeholder="Portion, z.B. 1 Stück (~100 g)" value="${f ? esc(f.serving_label) : ""}"></div>
      <div id="ff_pg_row"><div class="fd-fl">Größe einer Packung / eines Stücks (optional, für ¼ ½ ¾ 1)</div><div class="input-row"><input id="ff_portion_g" inputmode="decimal" placeholder="z.B. 250" value="${f && f.portion_g != null ? esc(String(f.portion_g).replace(".", ",")) : ""}"><span class="input-unit" id="ff_pg_unit">g</span></div></div>
      <div class="sheet-label" id="ff_vals_label">Nährwerte pro Portion</div>
      <div class="fd-grid2">${field("kcal", "Kalorien", "kcal")}${field("protein_g", "Eiweiß", "g")}${field("carbs_g", "Kohlenhydrate", "g")}${field("fat_g", "Fett", "g")}${field("sugar_g", "Zucker", "g")}${field("caffeine_mg", "Koffein", "mg")}</div>
      <div class="sheet-label">Quelle der Werte</div>
      <div class="tag-picker">${SOURCES.map(([k, l]) => `<button class="tag-btn ${st.draft.source === k ? "active" : ""}" data-act="pickSource" data-source="${k}">${l}</button>`).join("")}</div>
      <div class="sheet-btns">${f ? `<button class="btn-pill red" data-act="fDelete">Entfernen</button>` : ""}<button class="btn-cancel" data-act="closeSheet">Abbrechen</button><button class="btn-save" data-act="fSave">Speichern</button></div>`);
    applyBasisUi();
  }
  // Beschriftungen/Felder des Katalog-Sheets an die gewählte Basis anpassen
  function applyBasisUi() {
    const b = st.draft.basis, g = b !== "portion", u = b === "ml" ? "ml" : "g";
    $("ff_pg_row").style.display = g ? "" : "none";
    $("ff_pg_unit").textContent = u;
    $("ff_vals_label").textContent = g ? `Nährwerte pro 100 ${u} (wie auf der Packung)` : "Nährwerte pro Portion";
    $("ff_serving").placeholder = g ? "Bezeichnung der Packung/des Stücks, z.B. Packung" : "Portion, z.B. 1 Stück (~100 g)";
  }

  /* — Vorlage — */
  function openBundleSheet(id) {
    const b = id ? st.bundles.find((x) => x.id === id) : null;
    if (!st.draft || st.draft.type !== "bundle" || st.draft.id !== (b ? b.id : null)) {
      st.draft = { type: "bundle", id: b ? b.id : null, name: b ? b.name : "", items: b ? b.items.map((i) => ({ food_id: i.food_id, name: i.name, qty: Number(i.qty), amount: i.amount != null ? Number(i.amount) : null })) : [] };
    }
    const d = st.draft;
    const lines = d.items.map((i, idx) => `<div class="fd-eline"><div class="fd-eline-name">${esc(i.name)}</div>${qtyControl("bundle", idx, foodMap().get(i.food_id) || { basis: "portion" }, isG(foodMap().get(i.food_id)) ? i.amount : i.qty, "bStep")}
        <button class="btn-icon" data-act="bDel" data-i="${idx}" aria-label="Entfernen"><span class="material-symbols-outlined">delete</span></button></div>`).join("");
    openSheet(`<div class="sheet-title">${b ? "Gericht bearbeiten" : "Neues Gericht"}</div>
      <div class="input-row"><input id="fbName" placeholder="Name, z.B. Falafel-Salat" value="${esc(d.name)}"></div>
      <div class="sheet-label">Zutaten (Gramm bei Lebensmitteln pro 100 g)</div>${lines || `<div class="fd-sub" style="padding:.4rem 0">Noch nichts enthalten.</div>`}
      <div class="fd-addrow"><div class="input-row"><select id="fdAddFood">${foodOptions()}</select></div><button class="btn-pill" data-act="bAdd">Hinzufügen</button></div>
      <div class="sheet-btns">${b ? `<button class="btn-pill red" data-act="bDelete">Löschen</button>` : ""}<button class="btn-cancel" data-act="closeSheet">Abbrechen</button><button class="btn-save" data-act="bSave">Speichern</button></div>`);
  }

  /* ── Aktionen ── */
  const guard = async (fn) => {   // Doppel-Tap-Schutz: verhindert doppelt angelegte Einträge
    if (st.busy) return;
    st.busy = true;
    try { await fn(); } catch (e) { /* Meldung kommt aus core.api (Banner) */ } finally { st.busy = false; }
  };

  function cartPayloadItems() {
    const fm = foodMap();
    return [...st.cart].map(([food_id, n]) => (isG(fm.get(food_id)) ? { food_id, amount: n } : { food_id, qty: n }))
      .concat(st.extra.map((x) => ({ name: x.name, qty: 1, kcal: x.kcal, protein_g: x.protein_g, carbs_g: x.carbs_g, fat_g: x.fat_g, sugar_g: x.sugar_g, caffeine_mg: x.caffeine_mg })));
  }
  async function logCart(meta) {
    const items = cartPayloadItems();
    if (!items.length) return;
    await api("/api/meal-log", { method: "POST", body: { eaten_at: core.toIsoOrNull(meta.time), label: meta.label || null, note: meta.note || null, items } });
    st.cart.clear(); st.extra = [];
    closeSheet();
    await refresh();
  }

  // Mengenfeld (g/ml): Food-ID zur Zeile bestimmen und neue Menge übernehmen
  function amtFood(ctx, key) {
    if (ctx === "cart") return key;
    return st.draft?.items?.[Number(key)]?.food_id;
  }
  function setAmount(ctx, key, value) {
    if (!(value > 0)) return;
    captureDraft();
    const d = st.draft;
    if (ctx === "cart") { st.cart.set(key, value); renderHeute(); return openCartSheet(false); }
    const it = d.items[Number(key)], f = foodMap().get(it.food_id);
    it.amount = value;
    if (ctx === "edit") { it.qty = value / 100; if (f && f.kcal != null) it.kcal = f.kcal * it.qty; d.dirty = true; return openEditMeal(d.id); }
    d.name = val("fbName"); return openBundleSheet(d.id);
  }
  function onChange(e) {
    const el = e.target.closest("[data-amt]");
    if (el && root.contains(el)) setAmount(el.dataset.amt, el.dataset.key, num(el.value));
  }

  function onClick(e) {
    const el = e.target.closest("[data-act]");
    if (!el || !root.contains(el)) return;
    const act = el.dataset.act, id = el.dataset.id, d = st.draft;
    if (act === "backdrop" && e.target !== el) return;
    const i = Number(el.dataset.i), delta = Number(el.dataset.d);
    switch (act) {
      case "backdrop": case "closeSheet": return closeSheet();
      case "kind": st.kind = el.dataset.kind; return renderHeute();
      case "add": { const f = foodMap().get(id); const cur = st.cart.get(id); st.cart.set(id, cur ? stepFood(f, cur, 1) : defAmount(f)); return renderHeute(); }
      case "minus": { e.stopPropagation(); const q = stepFood(foodMap().get(id), st.cart.get(id) || 0, -1); q > 0 ? st.cart.set(id, q) : st.cart.delete(id); return renderHeute(); }
      case "addBundle": { const b = st.bundles.find((x) => x.id === id);
        b?.items.forEach((it) => st.cart.set(it.food_id, (st.cart.get(it.food_id) || 0) + Number(it.basis && it.basis !== "portion" && it.amount != null ? it.amount : it.qty)));
        return renderHeute(); }
      case "cartClear": st.cart.clear(); st.extra = []; return renderHeute();
      case "cartLog": return guard(() => logCart({ time: null, label: "", note: "" }));
      case "cartSheet": return openCartSheet(false);
      case "cartSheetFree": return openCartSheet(true);
      case "pickLabel": captureDraft(); d.label = d.label === el.dataset.label ? "" : el.dataset.label; return d.type === "edit" ? openEditMeal(d.id) : openCartSheet(false);
      case "cStep": { captureDraft(); const q = stepFood(foodMap().get(id), st.cart.get(id) || 0, delta); q > 0 ? st.cart.set(id, q) : st.cart.delete(id); renderHeute(); return openCartSheet(false); }
      case "cDel": captureDraft(); st.cart.delete(id); renderHeute(); return openCartSheet(false);
      case "cDelExtra": captureDraft(); st.extra.splice(i, 1); renderHeute(); return openCartSheet(false);
      case "cAddExtra": {
        const name = val("fxName").trim(), kcal = num(val("fxKcal"));
        if (!name || kcal == null) return core.showError("Eigener Posten: Name und kcal angeben.");
        captureDraft(); st.extra.push({ name, kcal, protein_g: num(val("fxProt")), carbs_g: num(val("fxCarbs")), fat_g: num(val("fxFat")), sugar_g: num(val("fxSugar")), caffeine_mg: num(val("fxCaf")) });
        renderHeute(); return openCartSheet(false);
      }
      case "cartLogSheet": { captureDraft(); return guard(() => logCart(d)); }

      case "amtFrac": { const f = foodMap().get(amtFood(el.dataset.ctx, el.dataset.key)); return f && setAmount(el.dataset.ctx, el.dataset.key, Number(f.portion_g) * Number(el.dataset.f)); }
      case "editMeal": st.draft = null; return openEditMeal(id);
      case "eStep": { captureDraft(); const it = d.items[Number(id)]; it.qty = Math.max(0.5, stepQty(it.qty, delta)); d.dirty = true;
        { const f = foodMap().get(it.food_id); if (f && f.kcal != null) it.kcal = f.kcal * it.qty; }
        return openEditMeal(d.id); }
      case "eDel": captureDraft(); d.items.splice(i, 1); d.dirty = true; return openEditMeal(d.id);
      case "eAdd": {
        const f = foodMap().get(val("fdAddFood")); if (!f) return;
        captureDraft();
        const ex = d.items.find((x) => x.food_id === f.id);
        if (isG(f)) {
          if (ex) { ex.amount += 25; ex.qty = ex.amount / 100; ex.kcal = f.kcal * ex.qty; }
          else { const a = defAmount(f); d.items.push({ food_id: f.id, name: f.name, qty: a / 100, amount: a, amount_unit: unitOf(f), kcal: f.kcal * a / 100 }); }
        } else ex ? ((ex.qty += 1), (ex.kcal = f.kcal * ex.qty)) : d.items.push({ food_id: f.id, name: f.name, qty: 1, kcal: f.kcal });
        d.dirty = true; return openEditMeal(d.id);
      }
      case "eSave": return guard(async () => {
        captureDraft();
        const body = { eaten_at: core.toIsoOrNull(d.time), label: d.label || null, note: d.note || null };
        if (d.dirty) {
          if (!d.items.length) return core.showError("Mindestens ein Posten nötig — oder die Mahlzeit löschen.");
          body.items = d.items.map((x) => x.food_id ? (x.amount_unit ? { food_id: x.food_id, amount: x.amount } : { food_id: x.food_id, qty: x.qty })
            : { name: x.name, qty: x.qty, kcal: x.kcal, protein_g: x.protein_g, carbs_g: x.carbs_g, fat_g: x.fat_g, sugar_g: x.sugar_g, caffeine_mg: x.caffeine_mg });
        }
        await api("/api/meal-log/" + d.id, { method: "PATCH", body });
        closeSheet(); await refresh();
      });
      case "eDelete": return guard(async () => {
        if (!confirm("Diese Mahlzeit wirklich löschen?")) return;
        await api("/api/meal/" + d.id, { method: "DELETE" });
        closeSheet(); await refresh();
      });

      case "newFood": return openFoodSheet(null);
      case "editFood": return openFoodSheet(id);
      case "pickKind": d.kind = el.dataset.kind; el.parentElement.querySelectorAll(".tag-btn").forEach((b) => b.classList.toggle("active", b === el)); return;
      case "pickBasis": d.basis = el.dataset.basis; el.parentElement.querySelectorAll(".tag-btn").forEach((b) => b.classList.toggle("active", b === el)); return applyBasisUi();
      case "pickSource": d.source = el.dataset.source; el.parentElement.querySelectorAll(".tag-btn").forEach((b) => b.classList.toggle("active", b === el)); return;
      case "fSave": return guard(async () => {
        const name = val("ff_name").trim();
        if (!name) return core.showError("Name angeben.");
        const body = { name, kind: d.kind, serving_label: val("ff_serving").trim() || (d.basis === "portion" ? "1 Portion" : "Packung"), source: d.source,
          basis: d.basis, portion_g: d.basis === "portion" ? null : num(val("ff_portion_g")) };
        ["kcal", "protein_g", "carbs_g", "fat_g", "sugar_g", "caffeine_mg"].forEach((k) => (body[k] = num(val("ff_" + k))));
        if (body.kcal == null) return core.showError("kcal angeben (Schätzung reicht).");
        await api(d.id ? "/api/foods/" + d.id : "/api/foods", { method: d.id ? "PATCH" : "POST", body });
        closeSheet(); await refresh();
      });
      case "fDelete": return guard(async () => {
        if (!confirm("Aus dem Katalog entfernen? Bisherige Mahlzeiten behalten ihre Werte.")) return;
        await api("/api/foods/" + d.id, { method: "DELETE" });
        closeSheet(); await refresh();
      });

      case "newBundle": st.draft = null; return openBundleSheet(null);
      case "editBundle": st.draft = null; return openBundleSheet(id);
      case "bStep": { d.name = val("fbName"); const it = d.items[Number(id)]; it.qty = Math.max(1, it.qty + delta); return openBundleSheet(d.id); }
      case "bDel": d.name = val("fbName"); d.items.splice(i, 1); return openBundleSheet(d.id);
      case "bAdd": {
        const f = foodMap().get(val("fdAddFood")); if (!f) return;
        d.name = val("fbName");
        const ex = d.items.find((x) => x.food_id === f.id);
        if (isG(f)) ex ? (ex.amount += 25) : d.items.push({ food_id: f.id, name: f.name, qty: 1, amount: defAmount(f) });
        else ex ? (ex.qty += 1) : d.items.push({ food_id: f.id, name: f.name, qty: 1, amount: null });
        return openBundleSheet(d.id);
      }
      case "bSave": return guard(async () => {
        d.name = val("fbName").trim();
        if (!d.name) return core.showError("Name angeben.");
        if (!d.items.length) return core.showError("Mindestens eine Zutat nötig.");
        const fm = foodMap();
        const body = { name: d.name, items: d.items.map((x) => (isG(fm.get(x.food_id)) ? { food_id: x.food_id, amount: x.amount } : { food_id: x.food_id, qty: x.qty })) };
        await api(d.id ? "/api/food-bundles/" + d.id : "/api/food-bundles", { method: d.id ? "PATCH" : "POST", body });
        closeSheet(); await refresh();
      });
      case "bDelete": return guard(async () => {
        if (!confirm("Gericht löschen? Die Katalogeinträge bleiben.")) return;
        await api("/api/food-bundles/" + d.id, { method: "DELETE" });
        closeSheet(); await refresh();
      });
    }
  }

  function onTab(e) {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    st.tab = btn.dataset.tab;
    root.querySelectorAll("#fdTabs .tab").forEach((t) => t.classList.toggle("active", t === btn));
    root.querySelectorAll(".fd-section").forEach((s) => s.classList.toggle("visible", s.id === "fd-" + st.tab));
    window.scrollTo(0, 0);
  }

  async function init() {
    root.addEventListener("click", onClick);
    root.addEventListener("change", onChange);
    $("fdTabs").addEventListener("click", onTab);
    renderAll();                 // sofort Gerüst zeigen, dann Daten laden
    await refresh();
  }
  return { init };
}

let styleEl = null;
export default {
  async mount(root, core) {
    styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    document.head.append(styleEl);
    root.innerHTML = TEMPLATE;
    await build(core, root).init();
  },
  unmount() {
    styleEl?.remove();
    styleEl = null;
  },
};

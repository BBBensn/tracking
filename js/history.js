// history.js — gemeinsamer Verlauf für alle Tracker: einklappbare Monate (neuester offen) +
// Umschalter Liste/Kalender. Der Kalender zeigt je Tag Markierungspunkte; ein Tipp auf einen Tag
// zeigt darunter dessen Einträge.
//
// Ein Modul liefert nur zwei Dinge:
//   setData(days)       Map  "YYYY-MM-DD" -> { count, marks: [css-farbe, …] }   (Wiener Tage)
//   opts.renderDay(day) -> { extra?: htmlString, body: string | Node | Node[] }  (Inhalt eines Tages)
// Alles andere (Monatsköpfe, Tagesköpfe, Kalenderraster, Merken von Liste/Kalender) macht die Komponente.
// Klicks innerhalb der Tages-Inhalte (Bearbeiten …) gehören dem Modul und laufen unverändert weiter.
import { dayLabel, todayKey, dayKey } from "./core.js";

const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const pad = (n) => String(n).padStart(2, "0");
const monthOf = (day) => day.slice(0, 7);                                   // "2026-10"
const prettyMonth = (mk) => `${MONTHS_DE[+mk.slice(5) - 1]} ${mk.slice(0, 4)}`;
const shiftMonth = (mk, d) => { const x = new Date(+mk.slice(0, 4), +mk.slice(5) - 1 + d, 1); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`; };

export function createHistory(el, opts) {
  const storeKey = "bensn.hx." + (opts.key || "default");
  const read = () => { try { return localStorage.getItem(storeKey) === "cal" ? "cal" : "list"; } catch (_) { return "list"; } };
  const save = (m) => { try { localStorage.setItem(storeKey, m); } catch (_) { /* privat/geblockt */ } };

  const st = { mode: read(), days: new Map(), open: new Set(), initialised: false, calMonth: null, sel: null, message: null };
  el.classList.add("hx");

  const sortedDays = () => [...st.days.keys()].sort((a, b) => b.localeCompare(a));
  const sortedMonths = () => [...new Set(sortedDays().map(monthOf))];

  /* ── Tagesblock: Kopf (Label · Anzahl · Linie) + optionale Zusatzzeile + Inhalt ── */
  function dayBlock(day) {
    const info = st.days.get(day) || { count: 0 };
    const r = opts.renderDay(day);
    const wrap = document.createElement("div");
    wrap.className = "hx-day-block";
    wrap.innerHTML = `<div class="day-header"><span class="day-label">${dayLabel(day)}</span><span class="day-count">${info.count ? info.count + " Eintr." : ""}</span><div class="day-line"></div></div>`
      + (r.extra ? `<div class="hx-day-extra">${r.extra}</div>` : "");
    const body = document.createElement("div");
    body.className = "hx-day-body";
    const parts = Array.isArray(r.body) ? r.body : [r.body];
    parts.forEach((p) => (typeof p === "string" ? body.insertAdjacentHTML("beforeend", p) : p && body.append(p)));
    wrap.append(body);
    return wrap;
  }

  /* ── Listenansicht: Monate einklappbar ── */
  function fillMonth(section) {
    const body = section.querySelector(".hx-month-body");
    if (body.dataset.filled) return;
    body.dataset.filled = "1";
    const mk = section.dataset.month;
    sortedDays().filter((d) => monthOf(d) === mk).forEach((d) => body.append(dayBlock(d)));
  }
  function renderList() {
    const host = el.querySelector(".hx-content");
    host.innerHTML = "";
    sortedMonths().forEach((mk) => {
      const open = st.open.has(mk);
      const total = [...st.days].filter(([d]) => monthOf(d) === mk).reduce((a, [, v]) => a + v.count, 0);
      const section = document.createElement("section");
      section.className = "hx-month" + (open ? "" : " collapsed");
      section.dataset.month = mk;
      section.innerHTML = `<button class="hx-month-head" data-hx="month" data-month="${mk}"><span class="hx-arrow">▼</span><span>${prettyMonth(mk)}</span><span class="hx-month-count">${total}</span></button><div class="hx-month-body"></div>`;
      host.append(section);
      if (open) fillMonth(section);
    });
  }

  /* ── Kalenderansicht ── */
  function defaultSelection(mk) {
    const inMonth = sortedDays().filter((d) => monthOf(d) === mk);
    return inMonth.length ? inMonth[0] : null;
  }
  function renderCalendar() {
    const host = el.querySelector(".hx-content");
    const mk = st.calMonth;
    const y = +mk.slice(0, 4), m = +mk.slice(5);
    const first = (new Date(y, m - 1, 1).getDay() + 6) % 7;               // Montag = 0
    const length = new Date(y, m, 0).getDate();
    const today = todayKey();
    const months = sortedMonths(); const lo = months[months.length - 1] || mk; const hi = monthOf(today) > (months[0] || mk) ? monthOf(today) : (months[0] || mk);
    let cells = WEEKDAYS.map((w) => `<div class="hx-wd">${w}</div>`).join("") + '<div class="hx-cell blank"></div>'.repeat(first);
    for (let d = 1; d <= length; d++) {
      const day = `${mk}-${pad(d)}`;
      const info = st.days.get(day);
      const dots = info ? [...new Set(info.marks || [])].slice(0, 3).map((c) => `<i style="background:${c}"></i>`).join("") : "";
      const cls = ["hx-cell", info ? "has" : "", day === today ? "today" : "", day === st.sel ? "sel" : ""].join(" ");
      cells += `<button class="${cls}" ${info ? `data-hx="day" data-day="${day}"` : "disabled"}><span>${d}</span><span class="hx-dots">${dots}</span></button>`;
    }
    host.innerHTML = `<div class="hx-cal-nav">
        <button class="btn-icon" data-hx="nav" data-d="-1" ${mk <= lo ? "disabled" : ""} aria-label="Vorheriger Monat"><span class="material-symbols-outlined">chevron_left</span></button>
        <div class="hx-cal-title">${prettyMonth(mk)}</div>
        <button class="btn-icon" data-hx="nav" data-d="1" ${mk >= hi ? "disabled" : ""} aria-label="Nächster Monat"><span class="material-symbols-outlined">chevron_right</span></button>
      </div>
      <div class="hx-grid">${cells}</div>
      <div class="hx-todaybar"><button class="btn-pill" data-hx="today">Heute</button></div>
      <div class="hx-daydetail"></div>`;
    const detail = host.querySelector(".hx-daydetail");
    if (st.sel && st.days.has(st.sel) && monthOf(st.sel) === mk) detail.append(dayBlock(st.sel));
    else detail.innerHTML = '<div class="empty-state">Keine Einträge in diesem Monat.</div>';
    if (!st.days.size || !defaultSelection(mk)) return;
  }

  /* ── Gesamtrahmen ── */
  function render() {
    if (st.message != null) { el.innerHTML = `<div class="empty-state">${st.message}</div>`; return; }
    if (!st.days.size) { el.innerHTML = opts.emptyHtml || '<div class="empty-state">Noch keine Einträge.</div>'; return; }
    if (!el.querySelector(".hx-toolbar")) {
      el.innerHTML = `<div class="hx-toolbar"><div class="hx-seg">
          <button data-hx="mode" data-mode="list"><span class="material-symbols-outlined">view_agenda</span>Liste</button>
          <button data-hx="mode" data-mode="cal"><span class="material-symbols-outlined">calendar_month</span>Kalender</button>
        </div></div><div class="hx-content"></div>`;
    }
    el.querySelectorAll("[data-hx=mode]").forEach((b) => b.classList.toggle("active", b.dataset.mode === st.mode));
    if (st.mode === "cal") renderCalendar(); else renderList();
  }

  function onClick(e) {
    const t = e.target.closest("[data-hx]");
    if (!t || !el.contains(t) || t.disabled) return;
    switch (t.dataset.hx) {
      case "mode":
        st.mode = t.dataset.mode; save(st.mode);
        if (st.mode === "cal" && !st.sel) st.sel = defaultSelection(st.calMonth);
        return render();
      case "month": {
        const section = t.closest(".hx-month"); const mk = t.dataset.month;
        const collapsed = section.classList.toggle("collapsed");
        collapsed ? st.open.delete(mk) : (st.open.add(mk), fillMonth(section));
        return;
      }
      case "nav": st.calMonth = shiftMonth(st.calMonth, +t.dataset.d); st.sel = defaultSelection(st.calMonth); return renderCalendar();
      case "today": { const td = todayKey(); st.calMonth = monthOf(td); st.sel = st.days.has(td) ? td : defaultSelection(st.calMonth); return renderCalendar(); }
      case "day": st.sel = t.dataset.day; return renderCalendar();
    }
  }
  el.addEventListener("click", onClick);

  return {
    /** days: Map "YYYY-MM-DD" -> { count, marks } */
    setData(days) {
      st.days = days; st.message = null;
      const months = sortedMonths();
      if (!st.initialised && months.length) {
        st.initialised = true;
        st.open.add(months[0]);                                    // neuester Monat offen, ältere zu
        st.calMonth = months[0];
        st.sel = defaultSelection(months[0]);
      }
      if (st.sel && !days.has(st.sel)) st.sel = defaultSelection(st.calMonth || (months[0] || ""));
      render();
    },
    /** Platzhalter statt Verlauf (Laden / Fehler); setData() stellt ihn wieder her. */
    setMessage(html) { st.message = html; render(); },
    /** Nach Änderungen an einem Tag (z.B. Bearbeiten) alles neu zeichnen, Zustand bleibt. */
    refresh() { render(); },
    destroy() { el.removeEventListener("click", onClick); el.innerHTML = ""; el.classList.remove("hx"); },
  };
}

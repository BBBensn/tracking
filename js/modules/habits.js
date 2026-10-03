// habits.js — Modul "Habits" (Konsum-/Gewohnheits-Zähler, Verlauf, Einstellungen).
// Aus tracking.bensn.me übernommen. Besonderheiten gegenüber der Einzel-App:
//  - Handler in Inline-onclick laufen über window.HB (nur solange gemountet).
//  - API über core.api (Cookie-Auth) — der frühere Client-seitige API-Key entfällt.
//  - Beim Verlassen: Tastatur-Listener, Toast-Timer und das an <body> gehängte Sheet werden
//    aufgeräumt (dispose). Kopfzeile/Status/Footer/SW-Registrierung entfallen (macht die Shell).
//  - Seit 2026-10-04 reine Zähler-Logik: kein Vorrat/Bestand, keine verknüpften Buchungen, keine Packungen.
//    Antippen eines Buttons bucht sofort, gedrückt halten öffnet das Eintrag-Sheet (Menge, Uhrzeit, Notiz).
//  - Red Bull, Holy und Kaffee sind seit 2026-10-03 nach Food migriert (tracking_items inaktiv).
//  - Arbeits-Zigaretten kommen mit EINER Abfrage (/api/smoke-breaks) und stehen je Pause chronologisch im Verlauf.
//  - Verlauf: gemeinsame Komponente js/history.js (Monate einklappbar, Liste/Kalender; die Datums-Pills entfallen).

import { createHistory } from "../history.js";

const CSS = `.m-habits {
            /* ── Tabs ── */
            .tab {
                font-family: "DM Mono", monospace;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                padding: 9px 14px;
                cursor: pointer;
                color: var(--muted);
                border: none;
                border-bottom: 2px solid transparent;
                margin-bottom: -1px;
                background: none;
                transition:
                    color 0.15s,
                    border-color 0.15s;
            }
            .tab.active {
                color: var(--text);
                border-bottom-color: var(--text);
            }
            .tab:hover:not(.active) {
                color: var(--text);
            }
            .tab-section {
                display: none;
            }
            .tab-section.visible {
                display: block;
            }

            /* ── API Status Bar ── */

            /* ── Category Group ── */
            .cat-group {
                margin-bottom: 1.5rem;
            }
            .cat-header {
                display: flex;
                align-items: center;
                gap: 0.6rem;
                margin-bottom: 0.75rem;
            }
            .cat-icon {
                font-size: 14px;
                line-height: 1;
            }
            .cat-title {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: var(--muted);
            }
            .cat-today-total {
                margin-left: auto;
                font-family: "DM Mono", monospace;
                font-size: 10px;
                color: var(--muted);
            }

            /* ── Item Card ── */
            .item-card {
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 1rem 1.25rem;
                margin-bottom: 6px;
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 0.75rem;
                align-items: center;
                transition: border-color 0.15s;
            }
            .item-card:hover {
                border-color: var(--border-hover);
            }
            .item-name {
                font-family: "Syne", sans-serif;
                font-size: 0.95rem;
                font-weight: 700;
                letter-spacing: -0.01em;
                margin-bottom: 2px;
            }
            .item-meta {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                color: var(--muted);
            }


            /* Zähler display */
            .item-zaehler {
                font-family: "DM Mono", monospace;
                font-size: 11px;
                margin-top: 5px;
                color: var(--muted);
            }
            .item-zaehler span {
                color: var(--text);
                font-weight: 500;
            }

            .item-actions {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                flex-shrink: 0;
            }
            .btn-unit {
                font-family: "DM Mono", monospace;
                font-size: 11px;
                font-weight: 500;
                letter-spacing: 0.04em;
                background: none;
                border: 1px solid var(--border-hover);
                color: var(--text);
                border-radius: 8px;
                padding: 7px 13px;
                cursor: pointer;
                transition:
                    background 0.15s,
                    border-color 0.15s,
                    color 0.15s;
                white-space: nowrap;
                -webkit-user-select: none;
                user-select: none;
                -webkit-touch-callout: none;
            }
            .btn-unit:hover {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(255, 255, 255, 0.3);
            }
            .btn-unit:active {
                background: rgba(255, 255, 255, 0.1);
                transform: scale(0.96);
            }

            .btn-icon {
                width: 30px;
                height: 30px;
                background: none;
                border: 1px solid var(--border);
                border-radius: 7px;
                color: var(--muted);
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition:
                    border-color 0.15s,
                    color 0.15s;
                flex-shrink: 0;
                padding: 0;
            }
            .btn-icon:hover {
                border-color: var(--border-hover);
                color: var(--text);
            }

            /* Category color accents */
            .cat-kiffen .item-card {
                border-left: 2px solid rgba(74, 222, 128, 0.25);
            }
            .cat-kiffen .btn-unit {
                border-color: rgba(74, 222, 128, 0.4);
                color: var(--green);
            }
            .cat-kiffen .btn-unit:hover {
                background: rgba(74, 222, 128, 0.08);
                border-color: rgba(74, 222, 128, 0.7);
            }
            .cat-rauchen .item-card {
                border-left: 2px solid rgba(232, 114, 74, 0.25);
            }
            .cat-rauchen .btn-unit {
                border-color: rgba(232, 114, 74, 0.4);
                color: var(--orange);
            }
            .cat-rauchen .btn-unit:hover {
                background: rgba(232, 114, 74, 0.08);
                border-color: rgba(232, 114, 74, 0.7);
            }
            .cat-lebensmittel .item-card {
                border-left: 2px solid rgba(0, 166, 251, 0.25);
            }
            .cat-lebensmittel .btn-unit {
                border-color: rgba(0, 166, 251, 0.4);
                color: var(--accent-blue);
            }
            .cat-lebensmittel .btn-unit:hover {
                background: rgba(0, 166, 251, 0.08);
                border-color: rgba(0, 166, 251, 0.7);
            }

            /* ── Verlauf ── */
            .history-day {
                margin-bottom: 1.5rem;
            }
            .history-day-header {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--muted);
                padding-bottom: 0.5rem;
                border-bottom: 1px solid var(--border);
                margin-bottom: 0.75rem;
            }
            .history-entry {
                padding: 0.6rem 0.9rem;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 8px;
                margin-bottom: 4px;
                transition: border-color 0.15s;
            }
            .history-entry:hover {
                border-color: var(--border-hover);
            }
            .history-row {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            .history-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 0.5rem;
            }
            /* .btn-pill now lives in the shared /shared/bensn.css — one definition for all apps */
            .history-time {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                color: var(--muted);
                width: 42px;
                flex-shrink: 0;
            }
            .history-name {
                font-family: "Syne", sans-serif;
                font-size: 0.85rem;
                font-weight: 600;
                flex: 1;
                min-width: 0;
            }
            .history-type-badge {
                font-family: "DM Mono", monospace;
                font-size: 9px;
                padding: 1px 6px;
                border-radius: 3px;
                flex-shrink: 0;
            }
            .history-type-badge.bestand {
                background: rgba(255, 180, 0, 0.1);
                border: 1px solid rgba(255, 180, 0, 0.25);
                color: #ffb400;
            }
            .history-type-badge.zaehler {
                background: rgba(0, 166, 251, 0.08);
                border: 1px solid rgba(0, 166, 251, 0.2);
                color: var(--accent-blue);
            }
            .history-amount {
                font-family: "DM Mono", monospace;
                font-size: 11px;
                color: var(--muted);
                white-space: nowrap;
            }
            .history-amount span {
                color: var(--text);
                font-weight: 500;
            }
            .history-day-totals {
                margin-top: 0.5rem;
                display: flex;
                flex-wrap: wrap;
                gap: 0.35rem;
            }
            .history-total-badge {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                padding: 2px 8px;
                border-radius: 4px;
                border: 1px solid var(--border);
                color: var(--muted);
            }

            /* ── Sheets: .sheet-title/.sheet-label hier, Overlay-Rahmen kommt als Inline-Style aus showSheet() ── */
            .sheet-label {
                font-family: "DM Mono", monospace;
                font-size: 9px;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                color: var(--muted);
                margin-bottom: 4px;
            }
            .sheet-title {
                font-family: "Syne", sans-serif;
                font-size: 1.3rem;
                font-weight: 800;
                margin-bottom: 1.25rem;
                letter-spacing: -0.02em;
            }
            .sheet-subtitle {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                color: var(--muted);
                margin-bottom: 1rem;
                line-height: 1.6;
            }

            /* Toggle for Bestand vs Zähler */
            .mode-toggle {
                display: flex;
                gap: 0.4rem;
                margin-bottom: 1rem;
            }
            .mode-btn {
                flex: 1;
                font-family: "DM Mono", monospace;
                font-size: 10px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                padding: 8px;
                border-radius: 8px;
                border: 1px solid var(--border);
                background: none;
                color: var(--muted);
                cursor: pointer;
                transition: all 0.15s;
                text-align: center;
            }
            .mode-btn.active {
                border-color: var(--accent-blue);
                color: var(--accent-blue);
                background: rgba(0, 166, 251, 0.08);
            }

            .input-row {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 10px;
                padding: 0.5rem 0.75rem;
                margin-bottom: 0.75rem;
            }
            .input-row input {
                flex: 1;
                background: none;
                border: none;
                color: var(--text);
                font-family: "DM Mono", monospace;
                font-size: 1.4rem;
                font-weight: 500;
                outline: none;
                min-width: 0;
            }
            .input-row input::placeholder {
                color: rgba(255, 255, 255, 0.15);
            }
            .input-unit {
                font-family: "DM Mono", monospace;
                font-size: 13px;
                color: var(--muted);
                flex-shrink: 0;
            }
            .preset-btn {
                font-family: "DM Mono", monospace;
                font-size: 11px;
                padding: 5px 12px;
                border-radius: 6px;
                border: 1px solid var(--border);
                color: var(--muted);
                background: none;
                cursor: pointer;
                transition: all 0.15s;
            }
            .preset-btn:hover {
                border-color: var(--border-hover);
                color: var(--text);
                background: rgba(255, 255, 255, 0.04);
            }
            .note-input {
                width: 100%;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 10px;
                padding: 8px 12px;
                color: var(--text);
                font-family: "DM Mono", monospace;
                font-size: 12px;
                outline: none;
                margin-bottom: 1rem;
            }
            .note-input::placeholder {
                color: var(--muted);
            }
            .sheet-btns {
                display: flex;
                gap: 0.5rem;
            }
            /* .btn-save / .btn-cancel now live in the shared /shared/bensn.css
               (tracking's .btn-cancel used 18px horizontal padding vs 16px in
               health/feed — converged to the shared 16px value) */

            /* ── Toast ── */
            .toast {
                position: fixed;
                bottom: calc(var(--nav-clear) + 1rem);
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                background: #1e1e20;
                border: 1px solid var(--border-hover);
                border-radius: 8px;
                padding: 9px 18px;
                font-family: "DM Mono", monospace;
                font-size: 12px;
                color: var(--text);
                z-index: 200;
                opacity: 0;
                transition:
                    opacity 0.2s,
                    transform 0.2s;
                pointer-events: none;
                white-space: nowrap;
            }
            .toast.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }

            /* ── Footer ── */
            .empty-state {
                font-family: "DM Mono", monospace;
                font-size: 12px;
                color: var(--muted);
                text-align: center;
                padding: 2.5rem 1rem;
                border: 1px dashed var(--border);
                border-radius: 16px;
                line-height: 1.8;
            }

            /* ── Worktracker supplement row ── */
            .item-wt-row {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-top: 5px;
                flex-wrap: wrap;
            }
            .wt-arbeit-badge {
                font-family: "DM Mono", monospace;
                font-size: 9px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                padding: 1px 6px;
                border-radius: 3px;
                background: rgba(0, 166, 237, 0.1);
                border: 1px solid rgba(0, 166, 237, 0.25);
                color: var(--accent-blue);
                flex-shrink: 0;
            }
            .wt-arbeit-val {
                font-family: "DM Mono", monospace;
                font-size: 11px;
                color: var(--text);
                font-weight: 500;
            }
            .wt-arbeit-src {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                color: var(--muted);
            }

            /* ── Day header (Location-Style) ── */
            .day-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 1.25rem 0 0.6rem;
                padding: 0 2px;
            }
            .day-header:first-child {
                margin-top: 0;
            }
            .day-label {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--muted);
                white-space: nowrap;
            }
            .day-count {
                font-family: "DM Mono", monospace;
                font-size: 9px;
                color: rgba(255, 255, 255, 0.2);
                white-space: nowrap;
            }
            .day-line {
                flex: 1;
                height: 1px;
                background: var(--border);
            }

            /* ── Einstellungen ── */
            .settings-section {
                margin-bottom: 2rem;
            }
            .settings-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 0.75rem;
            }
            .settings-section-title {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: var(--muted);
            }
            .btn-add {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                letter-spacing: 0.06em;
                padding: 4px 10px;
                border-radius: 6px;
                border: 1px solid rgba(74, 222, 128, 0.3);
                color: var(--green);
                background: none;
                cursor: pointer;
                transition: all 0.15s;
            }
            .btn-add:hover {
                background: rgba(74, 222, 128, 0.08);
                border-color: rgba(74, 222, 128, 0.6);
            }

            .settings-cat {
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 12px;
                margin-bottom: 8px;
                overflow: hidden;
            }
            .settings-cat-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.9rem 1.1rem;
                cursor: pointer;
                transition: background 0.15s;
            }
            .settings-cat-header:hover {
                background: rgba(255, 255, 255, 0.02);
            }
            .settings-cat-emoji {
                font-size: 16px;
                line-height: 1;
                flex-shrink: 0;
            }
            .settings-cat-name {
                font-family: "Syne", sans-serif;
                font-size: 0.95rem;
                font-weight: 700;
                flex: 1;
            }
            .settings-cat-count {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                color: var(--muted);
            }
            .settings-cat-chevron {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                color: var(--muted);
                transition: transform 0.2s;
            }
            .settings-cat-chevron.open {
                transform: rotate(180deg);
            }
            .settings-cat-body {
                border-top: 1px solid var(--border);
                display: none;
            }
            .settings-cat-body.open {
                display: block;
            }
            .settings-cat-actions {
                display: flex;
                gap: 0.5rem;
                padding: 0.75rem 1.1rem;
                border-bottom: 1px solid var(--border);
            }

            .settings-item-row {
                display: grid;
                grid-template-columns: 1fr auto auto;
                align-items: center;
                gap: 0.75rem;
                padding: 0.7rem 1.1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                transition: background 0.15s;
            }
            .settings-item-row:last-child {
                border-bottom: none;
            }
            .settings-item-row:hover {
                background: rgba(255, 255, 255, 0.02);
            }
            .settings-item-name {
                font-family: "DM Mono", monospace;
                font-size: 12px;
                color: var(--text);
            }
            .settings-item-meta {
                font-family: "DM Mono", monospace;
                font-size: 10px;
                color: var(--muted);
                margin-top: 2px;
            }
            .btn-edit-item {
                width: 26px;
                height: 26px;
                background: none;
                border: 1px solid var(--border);
                border-radius: 6px;
                color: var(--muted);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
                flex-shrink: 0;
                padding: 0;
            }
            .btn-edit-item:hover {
                border-color: var(--border-hover);
                color: var(--text);
            }

            /* ── Item/Category edit sheet ── */
            .btn-edit-row {
                display: grid;
                grid-template-columns: 5.5rem minmax(0, 1fr) auto;
                gap: 0.4rem;
                margin-bottom: 0.4rem;
                align-items: center;
            }
            .btn-edit-row .sheet-input {
                min-width: 0;
            }
            .sheet-row {
                margin-bottom: 0.75rem;
            }
            .sheet-toggle {
                display: flex;
                gap: 0.4rem;
            }
            .sheet-toggle-btn {
                flex: 1;
                font-family: "DM Mono", monospace;
                font-size: 10px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                padding: 8px;
                border-radius: 8px;
                border: 1px solid var(--border);
                background: none;
                color: var(--muted);
                cursor: pointer;
                transition: all 0.15s;
                text-align: center;
            }
            .sheet-toggle-btn.active {
                border-color: var(--accent-blue);
                color: var(--accent-blue);
                background: rgba(0, 166, 251, 0.08);
            }
            .sheet-input {
                width: 100%;
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 8px;
                padding: 9px 12px;
                color: var(--text);
                font-family: "DM Mono", monospace;
                font-size: 13px;
                outline: none;
            }
            .sheet-input::placeholder {
                color: var(--muted);
            }
            /* .btn-danger removed — converged on .btn-pill.red (shared/bensn.css),
               same destructive-in-sheet role as health.bensn.me now uses */

            .history-type-badge.auffuellung {
                background: rgba(74, 222, 128, 0.08);
                border: 1px solid rgba(74, 222, 128, 0.2);
                color: var(--green);
            }
            .history-type-badge.entnahme {
                background: rgba(255, 0, 81, 0.08);
                border: 1px solid rgba(255, 0, 81, 0.2);
                color: var(--accent-red);
            }

            @media (max-width: 560px) {
                .item-name {
                    font-size: 0.9rem;
                }
            }
        
}
`;

const TEMPLATE = `<div class="subnav"><div class="tabs">
                <button class="tab active" onclick="HB.switchTab('heute', this)">
                    Heute
                </button>
                <button class="tab" onclick="HB.switchTab('verlauf', this)">
                    Verlauf
                </button>
                <button
                    class="tab"
                    onclick="HB.switchTab('einstellungen', this)"
                    style="margin-left: auto"
                >
                    ⚙
                </button>
            </div></div>

            <!-- ═══ TAB: HEUTE ═══ -->
            <div id="tab-heute" class="tab-section visible">
                <div id="heute-content"></div>
            </div>

            <!-- ═══ TAB: VERLAUF ═══ -->
            <div id="tab-verlauf" class="tab-section">
                <div id="verlauf-content"></div>
            </div>

            <!-- ═══ TAB: EINSTELLUNGEN ═══ -->
            <div id="tab-einstellungen" class="tab-section">
                <div id="einstellungen-content"></div>
            </div>

            <!-- Toast -->
        <div class="toast" id="toast"></div>

        `;

function build(core, root) {

            /* ════════════════════════════════════════════════════════════════
   API
   ════════════════════════════════════════════════════════════════ */
            const apiFetch = (path, method = "GET", body = null) => core.api(path, { method, body });

            /* ════════════════════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════════════════════ */
            let _categories = []; // [{id, name, emoji, color, items:[...]}]
            let _allEntries = [];
            let _wtByDate = {};
            let _hx = null;
            let _apiOnline = false;

            /* ════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════ */
            function pad(n) {
                return String(n).padStart(2, "0");
            }

            function todayKey() {
                return new Date().toLocaleDateString("en-CA", {
                    timeZone: "Europe/Vienna",
                });
            }

            function fmtAmt(amount, item) {
                const n = parseFloat(amount) || 0;
                if (!item) return n;
                const unit = item.base_unit || "";
                // Whole-number units
                const wholeUnits = [
                    "Stk.",
                    "Dose",
                    "Dosen",
                    "Packung",
                    "Flasche",
                    "Flaschen",
                    "Stück",
                ];
                const isWhole = wholeUnits.some(
                    (u) => unit.includes(u.replace(".", "")) || unit === u,
                );
                if (item.slug === "redbull")
                    return n === 1 ? "1 Dose" : `${n} Dosen`;
                if (unit === "g") {
                    if (n >= 1000) {
                        const kg = n / 1000;
                        return `${+kg.toFixed(2).replace(/\.?0+$/, "")} kg`;
                    }
                    return `${+n.toFixed(1).replace(/\.?0+$/, "")} g`;
                }
                if (unit === "ml")
                    return `${+n.toFixed(1).replace(/\.?0+$/, "")} ml`;
                if (isWhole) return `${Math.round(n)} ${unit}`;
                // Default: up to 2 decimal places, trim trailing zeros
                return `${+n.toFixed(2).replace(/\.?0+$/, "")} ${unit}`;
            }

            function localTimeStr(isoStr) {
                if (!isoStr) return "—";
                return new Date(isoStr).toLocaleTimeString("de-AT", {
                    timeZone: "Europe/Vienna",
                    hour: "2-digit",
                    minute: "2-digit",
                });
            }
            function localDateStr(isoStr) {
                if (!isoStr) return "—";
                return new Date(isoStr).toLocaleDateString("de-AT", {
                    timeZone: "Europe/Vienna",
                    day: "2-digit",
                    month: "2-digit",
                });
            }

            function allItems() {
                return _categories.flatMap((c) =>
                    (c.items || []).map((i) => ({
                        ...i,
                        category: c.name,
                        cat_emoji: c.emoji,
                        cat_color: c.color,
                    })),
                );
            }

            function itemBySlug(slug) {
                return allItems().find((i) => i.slug === slug);
            }
            function itemById(id) {
                return allItems().find((i) => i.id === id);
            }

            function entriesForItem(itemId) {
                return _allEntries.filter((e) => e.item_id === itemId);
            }

            // Tages-Gesamtmenge für Zähler (netto, Richtung beachten)
            function zaehlerTodayNet(itemId) {
                const td = todayKey();
                return _allEntries
                    .filter(
                        (e) =>
                            e.item_id === itemId &&
                            e.date === td &&
                            e.entry_type === "zaehler",
                    )
                    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
            }

            function catColorClass(color) {
                return (
                    {
                        green: "cat-kiffen",
                        orange: "cat-rauchen",
                        blue: "cat-lebensmittel",
                    }[color] || ""
                );
            }

            /* ════════════════════════════════════════════════════════════════
   LOAD
   ════════════════════════════════════════════════════════════════ */
            async function loadAll() {
                try {
                    const [catData, trackingData, smokeData] =
                        await Promise.all([
                            apiFetch("/api/tracking/categories"),
                            apiFetch("/api/tracking/entries?limit=1000"),
                            apiFetch("/api/smoke-breaks?days=730"),
                        ]);
                    _categories = catData.categories || [];
                    _allEntries = trackingData.entries || [];

                    // Arbeits-Zigaretten je Pause (mit Zeitstempel), nach Kalendertag der PAUSE
                    // gruppiert — Pausen nach Mitternacht in Nachtdiensten zählen so zum
                    // richtigen Tag. `breaks` hält die einzelnen Pausen fürs chronologische
                    // Einsortieren im Verlauf, `shifts` die Summen je Station.
                    const newWt = {};
                    (smokeData.breaks || []).forEach((b) => {
                        const dk = core.dayKey(b.break_start);
                        const day = (newWt[dk] ||= {
                            spicy: 0,
                            blend: 0,
                            shifts: [],
                            breaks: [],
                        });
                        day.spicy += b.zig_spicy || 0;
                        day.blend += b.zig_blend || 0;
                        day.breaks.push(b);
                        let st = day.shifts.find((x) => x.station === b.station);
                        if (!st)
                            day.shifts.push(
                                (st = { station: b.station, spicy: 0, blend: 0 }),
                            );
                        st.spicy += b.zig_spicy || 0;
                        st.blend += b.zig_blend || 0;
                    });
                    _wtByDate = newWt;
                    _apiOnline = true;
                    renderToday();
                    if (
                        document
                            .getElementById("tab-verlauf")
                            .classList.contains("visible")
                    )
                        renderVerlauf();
                    if (
                        document
                            .getElementById("tab-einstellungen")
                            .classList.contains("visible")
                    )
                        renderEinstellungen();
                } catch (e) {
                    _apiOnline = false;
                    renderToday();
                }
            }

            /* ════════════════════════════════════════════════════════════════
   RENDER — Heute (dynamic from _categories)
   ════════════════════════════════════════════════════════════════ */
            function renderToday() {
                const container = document.getElementById("heute-content");
                if (!_categories.length) {
                    container.innerHTML =
                        '<div class="empty-state">Keine Items konfiguriert.<br>Füge Items unter ⚙ Einstellungen hinzu.</div>';
                    return;
                }
                const wtToday = _wtByDate[todayKey()] || {
                    spicy: 0,
                    blend: 0,
                    shifts: [],
                };

                container.innerHTML = _categories
                    .map((cat) => {
                        const items = cat.items || [];
                        if (!items.length) return "";
                        let catActivity = 0;
                        const itemsHtml = items
                            .map((item) => {
                                const total = zaehlerTodayNet(item.id);
                                if (total > 0) catActivity++;

                                // Zigaretten aus dem Arbeitstracker kommen dazu
                                let wtHtml = "";
                                const wtAmt =
                                    (item.slug === "spicy" ? wtToday.spicy : 0) +
                                    (item.slug === "zigarette" ? wtToday.blend : 0);
                                if (wtAmt > 0) {
                                    catActivity++;
                                    const src =
                                        wtToday.shifts
                                            .map((s) => s.station)
                                            .join(", ") || "Dienst";
                                    wtHtml = `<div class="item-wt-row">
                                    <span class="wt-arbeit-badge">Arbeit</span>
                                    <span class="wt-arbeit-val">+${wtAmt} im Dienst</span>
                                    <span class="wt-arbeit-src">${src}</span>
                                </div>`;
                                }
                                const totalIncWT = total + wtAmt;
                                const dispText = total > 0 ? fmtAmt(total, item) : "—";

                                return `<div class="item-card">
                                <div>
                                    <div class="item-name">${core.esc(item.name)}</div>
                                    <div class="item-meta">${core.esc(item.base_unit)}</div>
                                    <div class="item-zaehler">Heute: <span>${dispText}</span>${totalIncWT > total ? ` · Gesamt: <span>${fmtAmt(totalIncWT, item)}</span>` : ""}</div>
                                    ${wtHtml}
                                </div>
                                <div class="item-actions">
                                    ${renderItemButtons(item)}
                                    <button class="btn-icon" data-manual="${item.id}" title="Mit Uhrzeit / Notiz eintragen">
                                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"/></svg>
                                    </button>
                                </div>
                            </div>`;
                            })
                            .join("");

                        return `
                        <div class="cat-group ${catColorClass(cat.color)}">
                            <div class="cat-header">
                                <span class="cat-icon">${cat.emoji}</span>
                                <span class="cat-title">${core.esc(cat.name)}</span>
                                <span class="cat-today-total">${catActivity > 0 ? catActivity + " aktiv" : ""}</span>
                            </div>
                            ${itemsHtml}
                        </div>`;
                    })
                    .join("");
            }

            /* ════════════════════════════════════════════════════════════════
   RENDER — Verlauf
   ════════════════════════════════════════════════════════════════ */
            // Zeilen eines Tages: eigene Einträge und Arbeits-Zigaretten (je Pause) in EINER Zeitreihe,
            // neueste zuerst. Zusammen mit den Tagessummen der Zähler (Kopfzeilen-Badges).
            function verlaufDay(date) {
                const entries = _allEntries.filter((e) => e.date === date);
                const wtDay = _wtByDate[date] || { spicy: 0, blend: 0, shifts: [], breaks: [] };
                const zaehlerTotals = {};
                entries
                    .filter((e) => e.entry_type === "zaehler")
                    .forEach((e) => {
                        zaehlerTotals[e.item_id] = (zaehlerTotals[e.item_id] || 0) + e.amount;
                    });
                [["spicy", wtDay.spicy], ["zigarette", wtDay.blend]].forEach(([slug, n]) => {
                    const item = n > 0 && allItems().find((i) => i.slug === slug);
                    if (item) zaehlerTotals[item.id] = (zaehlerTotals[item.id] || 0) + n;
                });
                const totalBadges = Object.entries(zaehlerTotals)
                    .map(([id, amt]) => {
                        const item = itemById(id);
                        return `<span class="history-total-badge">${item ? item.name : "?"}: ${fmtAmt(amt, item)}</span>`;
                    })
                    .join("");

                const rows = entries.map((e) => {
                    const item = itemById(e.item_id);
                    let typeLabel;
                    const eAmt = parseFloat(e.amount) || 0;
                    if (e.entry_type === "bestand") {
                        typeLabel = `<span class="history-type-badge bestand">Bestand</span>`;
                    } else if (e.entry_type === "auffuellung") {
                        typeLabel = `<span class="history-type-badge auffuellung">+${fmtAmt(eAmt, item)}</span>`;
                    } else if (e.entry_type === "entnahme") {
                        typeLabel = `<span class="history-type-badge entnahme">−${fmtAmt(eAmt, item)}</span>`;
                    } else if (e.entry_type === "delta") {
                        typeLabel =
                            eAmt >= 0
                                ? `<span class="history-type-badge auffuellung">+${fmtAmt(eAmt, item)}</span>`
                                : `<span class="history-type-badge entnahme">−${fmtAmt(Math.abs(eAmt), item)}</span>`;
                    } else {
                        typeLabel = `<span class="history-type-badge zaehler">+${fmtAmt(eAmt, item)}</span>`;
                    }
                    return {
                        ts: e.timestamp,
                        own: true,
                        html: `<div class="history-entry">
                            <div class="history-row">
                                <span class="history-time">${localTimeStr(e.timestamp)}</span>
                                <span class="history-name">${e.name}</span>
                                ${typeLabel}
                                <span class="history-amount">${e.note ? `<span style="color:var(--muted)">${e.note}</span>` : ""}</span>
                            </div>
                            <div class="history-actions">
                                <button class="btn-pill" onclick="HB.openEditEntrySheet('${e.id}')">Bearbeiten</button>
                                <button class="btn-pill red" onclick="HB.deleteEntry('${e.id}')">Löschen</button>
                            </div>
                        </div>`,
                    };
                });

                // Zigaretten aus dem Arbeitstracker: eine Zeile je Pause und Sorte, mit der
                // Uhrzeit der Pause (nur lesbar, Bearbeiten geht im Work-Modul)
                (wtDay.breaks || []).forEach((b) => {
                    [["Spicy", b.zig_spicy], ["Zigarette", b.zig_blend]].forEach(([name, n]) => {
                        if (!n) return;
                        rows.push({
                            ts: b.break_start,
                            own: false,
                            html: `<div class="history-entry" style="opacity:.7">
                            <div class="history-row">
                                <span class="history-time">${localTimeStr(b.break_start)}</span>
                                <span class="history-name">${name}</span>
                                <span class="history-type-badge" style="background:rgba(0,166,237,.1);border:1px solid rgba(0,166,237,.25);color:var(--accent-blue)">Arbeit</span>
                                <span class="history-amount"><span>${n} Stk.</span> · ${b.station || "Dienst"}</span>
                            </div>
                        </div>`,
                        });
                    });
                });
                rows.sort((x, y) => new Date(y.ts) - new Date(x.ts));
                return { rows, totalBadges };
            }

            function renderVerlauf() {
                const container = document.getElementById("verlauf-content");
                if (!_hx)
                    _hx = createHistory(container, {
                        key: "habits",
                        renderDay: (date) => {
                            const { rows, totalBadges } = verlaufDay(date);
                            return {
                                extra: totalBadges ? `<div style="display:flex;gap:.35rem;flex-wrap:wrap">${totalBadges}</div>` : "",
                                body: rows.map((r) => r.html).join(""),
                            };
                        },
                    });
                const dates = new Set([..._allEntries.map((e) => e.date), ...Object.keys(_wtByDate)]);
                const days = new Map();
                dates.forEach((date) => {
                    const { rows } = verlaufDay(date);
                    if (rows.length)
                        days.set(date, {
                            count: rows.length,
                            marks: [...new Set(rows.map((r) => (r.own ? "var(--orange)" : "var(--accent-blue)")))],
                        });
                });
                _hx.setData(days);
            }

            /* ════════════════════════════════════════════════════════════════
   RENDER — Einstellungen
   ════════════════════════════════════════════════════════════════ */
            function renderEinstellungen() {
                const container = document.getElementById(
                    "einstellungen-content",
                );
                container.innerHTML = `
                    <div class="settings-section">
                        <div class="settings-section-header">
                            <span class="settings-section-title">Kategorien & Items</span>
                            <button class="btn-add" onclick="HB.openCatSheet(null)">+ Kategorie</button>
                        </div>
                        ${_categories.map((cat) => renderSettingsCat(cat)).join("")}
                        ${!_categories.length ? '<div class="empty-state">Noch keine Kategorien.</div>' : ""}
                    </div>`;
            }

            function renderSettingsCat(cat) {
                const items = cat.items || [];
                const itemRows = items
                    .map(
                        (item) => `
                    <div class="settings-item-row">
                        <div>
                            <div class="settings-item-name">${core.esc(item.name)}</div>
                            <div class="settings-item-meta">${core.esc(item.base_unit)} · ${itemButtons(item).map((b) => b.label).join("  ")}</div>
                        </div>
                        <button class="btn-edit-item" onclick="HB.openItemSheet('${item.id}','${cat.id}')" title="Bearbeiten">
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"/></svg>
                        </button>
                    </div>`,
                    )
                    .join("");

                return `<div class="settings-cat" id="scat-${cat.id}">
                    <div class="settings-cat-header" onclick="HB.toggleCat('${cat.id}')">
                        <span class="settings-cat-emoji">${cat.emoji}</span>
                        <span class="settings-cat-name">${cat.name}</span>
                        <span class="settings-cat-count">${items.length} Items</span>
                        <span class="settings-cat-chevron" id="chevron-${cat.id}">▼</span>
                    </div>
                    <div class="settings-cat-body" id="catbody-${cat.id}">
                        <div class="settings-cat-actions">
                            <button class="btn-add" onclick="HB.openItemSheet(null,'${cat.id}')">+ Item</button>
                            <button class="btn-edit-item" onclick="HB.openCatSheet('${cat.id}')" title="Kategorie bearbeiten" style="margin-left:auto">
                                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"/></svg>
                            </button>
                        </div>
                        ${itemRows || "<div style=\"font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);padding:.75rem 1.1rem\">Keine Items.</div>"}
                    </div>
                </div>`;
            }

            function toggleCat(catId) {
                const body = document.getElementById(`catbody-${catId}`);
                const chevron = document.getElementById(`chevron-${catId}`);
                const open = body.classList.toggle("open");
                chevron.classList.toggle("open", open);
            }

            /* ════════════════════════════════════════════════════════════════
   CATEGORY SHEET
   ════════════════════════════════════════════════════════════════ */
            function openCatSheet(catId) {
                const cat = catId
                    ? _categories.find((c) => c.id === catId)
                    : null;
                const title = cat ? "Kategorie bearbeiten" : "Neue Kategorie";

                const EMOJIS = [
                    "🌿",
                    "🚬",
                    "☕",
                    "🍺",
                    "💊",
                    "🏃",
                    "🎮",
                    "📚",
                    "💤",
                    "🎵",
                    "🍕",
                    "🧴",
                ];
                const COLORS = [
                    { val: "green", label: "Grün" },
                    { val: "orange", label: "Orange" },
                    { val: "blue", label: "Blau" },
                    { val: "muted", label: "Grau" },
                ];

                showSheet(`
                    <div class="sheet-label">Kategorie</div>
                    <div class="sheet-title">${title}</div>
                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:4px">Name</div>
                        <input class="sheet-input" id="cs-name" type="text" value="${cat ? cat.name : ""}" placeholder="z.B. Getränke">
                    </div>
                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:6px">Emoji</div>
                        <div style="display:flex;flex-wrap:wrap;gap:.4rem" id="cs-emojis">
                            ${EMOJIS.map(
                                (
                                    e,
                                ) => `<button onclick="HB.selectEmoji(this,'${e}')" data-val="${e}"
                                style="width:36px;height:36px;border-radius:8px;border:1px solid ${cat && cat.emoji === e ? "var(--accent-blue)" : "var(--border)"};background:${cat && cat.emoji === e ? "rgba(0,166,251,.08)" : "none"};font-size:16px;cursor:pointer;transition:all .15s">${e}</button>`,
                            ).join("")}
                        </div>
                        <input type="hidden" id="cs-emoji" value="${cat ? cat.emoji : "📦"}">
                    </div>
                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:6px">Farbe</div>
                        <div class="sheet-toggle" id="cs-colors">
                            ${COLORS.map((c) => `<button class="sheet-toggle-btn ${cat && cat.color === c.val ? "active" : ""}" onclick="HB.selectColor(this,'${c.val}')" data-val="${c.val}">${c.label}</button>`).join("")}
                        </div>
                        <input type="hidden" id="cs-color" value="${cat ? cat.color : "muted"}">
                    </div>
                    <div class="sheet-btns" style="margin-top:1rem">
                        <button class="btn-save" onclick="HB.saveCat('${catId || ""}')">Speichern</button>
                        <button class="btn-cancel" onclick="HB.closeSheet()">Abbrechen</button>
                        ${cat ? `<button class="btn-pill red" onclick="HB.deleteCat('${catId}')">Löschen</button>` : ""}
                    </div>
                    <div id="sheet-msg" style="font-family:'DM Mono',monospace;font-size:11px;margin-top:.5rem;text-align:center"></div>
                `);
            }

            function selectEmoji(btn, val) {
                document.querySelectorAll("#cs-emojis button").forEach((b) => {
                    const active = b.dataset.val === val;
                    b.style.borderColor = active
                        ? "var(--accent-blue)"
                        : "var(--border)";
                    b.style.background = active
                        ? "rgba(0,166,251,.08)"
                        : "none";
                });
                document.getElementById("cs-emoji").value = val;
            }
            function selectColor(btn, val) {
                document
                    .querySelectorAll("#cs-colors button")
                    .forEach((b) =>
                        b.classList.toggle("active", b.dataset.val === val),
                    );
                document.getElementById("cs-color").value = val;
            }

            async function saveCat(catId) {
                const name = document.getElementById("cs-name").value.trim();
                const emoji = document.getElementById("cs-emoji").value;
                const color = document.getElementById("cs-color").value;
                const msg = document.getElementById("sheet-msg");
                if (!name) {
                    msg.style.color = "var(--accent-red)";
                    msg.textContent = "Name fehlt";
                    return;
                }
                msg.style.color = "var(--muted)";
                msg.textContent = "Speichere…";
                try {
                    if (catId) {
                        await apiFetch(
                            `/api/tracking/categories/${catId}`,
                            "PATCH",
                            { name, emoji, color },
                        );
                    } else {
                        await apiFetch("/api/tracking/categories", "POST", {
                            name,
                            emoji,
                            color,
                        });
                    }
                    closeSheet();
                    await loadAll();
                    renderEinstellungen();
                } catch (e) {
                    msg.style.color = "var(--accent-red)";
                    msg.textContent = e.message;
                }
            }

            async function deleteCat(catId) {
                if (!confirm("Kategorie löschen?")) return;
                try {
                    await apiFetch(
                        `/api/tracking/categories/${catId}`,
                        "DELETE",
                    );
                    closeSheet();
                    await loadAll();
                    renderEinstellungen();
                } catch (e) {
                    alert("Fehler: " + e.message);
                }
            }

            /* ════════════════════════════════════════════════════════════════
   ITEM SHEET
   ════════════════════════════════════════════════════════════════ */
            // Buttons eines Items: gespeicherte Liste, sonst ein Standard-Button aus unit_size
            function itemButtons(item) {
                if (Array.isArray(item.buttons) && item.buttons.length) return item.buttons;
                const amt = parseFloat(item.unit_size) || 1;
                return [{ label: autoLabel(amt, item.base_unit), amount: amt }];
            }
            function autoLabel(amount, unit) {
                return `${amount < 0 ? "−" : "+"}${fmtAmt(Math.abs(amount), { base_unit: unit })}`;
            }

            function btnEditRow(b) {
                return `<div class="btn-edit-row">
                    <input class="sheet-input be-amount" type="number" step="any" placeholder="Menge" value="${b ? b.amount : ""}">
                    <input class="sheet-input be-label" type="text" placeholder="Beschriftung (optional)" value="${b && b.custom ? core.esc(b.label) : ""}">
                    <button class="btn-icon" onclick="this.closest('.btn-edit-row').remove()" title="Button entfernen"><span class="material-symbols-outlined">close</span></button>
                </div>`;
            }
            function addBtnRow() {
                document.getElementById("is-buttons").insertAdjacentHTML("beforeend", btnEditRow(null));
            }

            function openItemSheet(itemId, catId) {
                const item = itemId ? allItems().find((i) => i.id === itemId) : null;
                const UNITS = ["Stk.", "g", "ml", "Dose", "kg", "l", "Packung", "Tablette", "Kapsel"];
                // Beschriftung nur dann als "eigene" vorbelegen, wenn sie vom automatischen Text abweicht
                const rows = item
                    ? itemButtons(item).map((b) => ({
                          ...b,
                          custom: b.label !== autoLabel(parseFloat(b.amount) || 0, item.base_unit),
                      }))
                    : [{ amount: 1, label: "" }];

                showSheet(`
                    <div class="sheet-label">Item</div>
                    <div class="sheet-title">${item ? "Item bearbeiten" : "Neues Item"}</div>

                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:4px">Name</div>
                        <input class="sheet-input" id="is-name" type="text" value="${item ? core.esc(item.name) : ""}" placeholder="z.B. Zigarette">
                    </div>

                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:4px">Einheit</div>
                        <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.4rem" id="is-unit-pills">
                            ${UNITS.map((u) => `<button onclick="HB.selectUnit(this,'${u}')" data-val="${u}"
                                class="preset-btn"
                                style="border-color:${item && item.base_unit === u ? "var(--accent-blue)" : "var(--border)"};color:${item && item.base_unit === u ? "var(--accent-blue)" : "var(--muted)"};background:${item && item.base_unit === u ? "rgba(0,166,251,.08)" : "none"}">${u}</button>`).join("")}
                        </div>
                        <input class="sheet-input" id="is-unit" type="text" value="${item ? core.esc(item.base_unit) : "Stk."}" placeholder="oder eigene Einheit…">
                    </div>

                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:4px">Buttons</div>
                        <div id="is-buttons">${rows.map(btnEditRow).join("")}</div>
                        <button class="btn-pill" onclick="HB.addBtnRow()">+ Button</button>
                        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);margin-top:.5rem;line-height:1.5">
                            Antippen bucht sofort, gedrückt halten öffnet das Eintrag-Sheet mit Uhrzeit.
                            Negative Menge zieht ab (z.B. −1). Ohne Beschriftung wird sie aus Menge und Einheit gebildet.
                        </div>
                    </div>

                    <div class="sheet-btns" style="margin-top:1rem">
                        <button class="btn-save" onclick="HB.saveItem('${itemId || ""}','${catId}')">Speichern</button>
                        <button class="btn-cancel" onclick="HB.closeSheet()">Abbrechen</button>
                        ${item ? `<button class="btn-pill red" onclick="HB.deleteItem('${itemId}')">Löschen</button>` : ""}
                    </div>
                    <div id="sheet-msg" style="font-family:'DM Mono',monospace;font-size:11px;margin-top:.5rem;text-align:center"></div>
                `);
            }

            function selectUnit(btn, val) {
                document.querySelectorAll("#is-unit-pills button").forEach((b) => {
                    const active = b.dataset.val === val;
                    b.style.borderColor = active ? "var(--accent-blue)" : "var(--border)";
                    b.style.color = active ? "var(--accent-blue)" : "var(--muted)";
                    b.style.background = active ? "rgba(0,166,251,.08)" : "none";
                });
                document.getElementById("is-unit").value = val;
            }

            async function saveItem(itemId, catId) {
                const name = document.getElementById("is-name").value.trim();
                const unit = document.getElementById("is-unit").value.trim();
                const msg = document.getElementById("sheet-msg");
                const buttons = [...document.querySelectorAll("#is-buttons .btn-edit-row")]
                    .map((row) => {
                        const amount = parseFloat(row.querySelector(".be-amount").value);
                        const custom = row.querySelector(".be-label").value.trim();
                        return { amount, label: custom || autoLabel(amount, unit) };
                    })
                    .filter((b) => b.amount && !isNaN(b.amount));
                if (!name || !unit) {
                    msg.style.color = "var(--accent-red)";
                    msg.textContent = "Name und Einheit fehlen";
                    return;
                }
                if (!buttons.length) {
                    msg.style.color = "var(--accent-red)";
                    msg.textContent = "Mindestens ein Button mit Menge";
                    return;
                }
                msg.style.color = "var(--muted)";
                msg.textContent = "Speichere…";
                // unit_size = Standardmenge für das Eintrag-Sheet (erster positiver Button)
                const firstPos = buttons.find((b) => b.amount > 0);
                const payload = {
                    name,
                    base_unit: unit,
                    unit_size: firstPos ? firstPos.amount : Math.abs(buttons[0].amount),
                    buttons,
                };
                try {
                    if (itemId) {
                        await apiFetch(`/api/tracking/items/${itemId}`, "PATCH", payload);
                    } else {
                        await apiFetch("/api/tracking/items", "POST", {
                            category_id: catId,
                            tracking_mode: "zaehler",
                            ...payload,
                        });
                    }
                    closeSheet();
                    await loadAll();
                    renderEinstellungen();
                } catch (e) {
                    msg.style.color = "var(--accent-red)";
                    msg.textContent = e.message;
                }
            }

            async function deleteItem(itemId) {
                if (!confirm("Item löschen?")) return;
                try {
                    await apiFetch(`/api/tracking/items/${itemId}`, "DELETE");
                    closeSheet();
                    await loadAll();
                    renderEinstellungen();
                } catch (e) {
                    alert("Fehler: " + e.message);
                }
            }

            /* ════════════════════════════════════════════════════════════════
   SHEET HELPER (generic bottom sheet)
   ════════════════════════════════════════════════════════════════ */
            function showSheet(html) {
                document.getElementById("sheet-edit-overlay")?.remove();
                const overlay = document.createElement("div");
                overlay.id = "sheet-edit-overlay";
                overlay.style.cssText =
                    "position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100;display:flex;align-items:flex-end;justify-content:center;";
                overlay.innerHTML = `<div onclick="event.stopPropagation()" style="background:#161616;border:1px solid rgba(255,255,255,.12);border-radius:16px 16px 0 0;padding:1.5rem 1.25rem 2.5rem;width:100%;max-width:480px;max-height:85vh;overflow-y:auto">${html}</div>`;
                // Nach dem Gedrückthalten feuert der Finger-Loslassen-Klick evtl. auf dem frischen Overlay
                const born = Date.now();
                overlay.addEventListener("click", () => { if (Date.now() - born > 500) closeSheet(); });
                // Im Modul-Container, NICHT an <body>: das Modul-CSS (.m-habits …) greift nur darin
                root.appendChild(overlay);
            }
            function closeSheet() {
                document.getElementById("sheet-edit-overlay")?.remove();
            }

            /* ════════════════════════════════════════════════════════════════
   BUTTONS + EINTRAG
   ════════════════════════════════════════════════════════════════ */
            // Schnell-Buttons eines Items. Antippen = sofort buchen, gedrückt halten = Sheet (siehe Press-Handler)
            function renderItemButtons(item) {
                return itemButtons(item)
                    .map((btn) => {
                        const amt = parseFloat(btn.amount) || 0;
                        const color = amt < 0 ? "rgba(255,0,81,.4)" : "rgba(74,222,128,.4)";
                        const txtColor = amt < 0 ? "var(--accent-red)" : "var(--green)";
                        return `<button class="btn-unit" data-tap data-item="${item.id}" data-amt="${amt}" data-lbl="${core.esc(btn.label)}"
                        style="border-color:${color};color:${txtColor}">${core.esc(btn.label)}</button>`;
                    })
                    .join("");
            }

            async function postEntry(item, amount, note, timestamp) {
                const when = timestamp ? new Date(timestamp) : null;
                return apiFetch("/api/tracking/entry", "POST", {
                    item_id: item.id,
                    category: item.category,
                    name: item.name,
                    amount,
                    unit: item.base_unit,
                    entry_type: "zaehler",
                    note: note || null,
                    date: when ? core.dayKey(when) : todayKey(),
                    ...(when ? { timestamp: when.toISOString() } : {}),
                    source: "pwa",
                });
            }

            async function tapButton(itemId, signedAmt, label) {
                const item = itemById(itemId);
                if (!item) return;
                try {
                    await postEntry(item, signedAmt);
                } catch (e) {
                    showToast("Fehler: " + e.message);
                    return;
                }
                showToast(`${item.name} ${label}`);
                await loadAll();
            }

            // Eintrag-Sheet: Menge, Uhrzeit (Standard: jetzt), Notiz. `amount` kommt vom gedrückten Button.
            function openEntry(itemId, amount) {
                const item = itemById(itemId);
                if (!item) return;
                const amt = amount || parseFloat(item.unit_size) || 1;
                showSheet(`
                    <div class="sheet-label">Eintrag</div>
                    <div class="sheet-title">${core.esc(item.name)}</div>
                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:4px">Menge</div>
                        <div class="input-row" style="margin-bottom:0">
                            <input id="en-amount" type="number" step="any" value="${amt}">
                            <span class="input-unit">${core.esc(item.base_unit)}</span>
                        </div>
                    </div>
                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:4px">Zeitpunkt</div>
                        <input class="sheet-input" id="en-time" type="datetime-local" value="${core.isoToDatetimeLocal(new Date().toISOString())}">
                    </div>
                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:4px">Notiz (optional)</div>
                        <input class="sheet-input" id="en-note" type="text" placeholder="optional">
                    </div>
                    <div class="sheet-btns" style="margin-top:1rem">
                        <button class="btn-save" onclick="HB.submitEntry('${item.id}')">Eintragen</button>
                        <button class="btn-cancel" onclick="HB.closeSheet()">Abbrechen</button>
                    </div>
                    <div id="sheet-msg" style="font-family:'DM Mono',monospace;font-size:11px;margin-top:.5rem;text-align:center"></div>
                `);
            }

            async function submitEntry(itemId) {
                const item = itemById(itemId);
                if (!item) return;
                const amount = parseFloat(document.getElementById("en-amount").value);
                const timeVal = document.getElementById("en-time").value;
                const note = document.getElementById("en-note").value.trim() || null;
                const msg = document.getElementById("sheet-msg");
                if (!amount || isNaN(amount) || !timeVal) {
                    msg.style.color = "var(--accent-red)";
                    msg.textContent = "Menge und Zeitpunkt sind Pflicht";
                    return;
                }
                msg.style.color = "var(--muted)";
                msg.textContent = "Speichere…";
                try {
                    await postEntry(item, amount, note, timeVal);
                    closeSheet();
                    showToast(`${item.name} ${autoLabel(amount, item.base_unit)}`);
                    await loadAll();
                } catch (e) {
                    msg.style.color = "var(--accent-red)";
                    msg.textContent = "Fehler: " + e.message;
                }
            }

            async function deleteEntry(entryId) {
                if (!confirm("Eintrag löschen?")) return;
                try {
                    await apiFetch(`/api/tracking/entry/${entryId}`, "DELETE");
                    showToast("Gelöscht");
                    await loadAll();
                } catch (e) {
                    showToast("Fehler: " + e.message);
                }
            }

            /* ════════════════════════════════════════════════════════════════
   ENTRY EDIT SHEET (amount, note, Zeitpunkt — wie in health.bensn.me)
   ════════════════════════════════════════════════════════════════ */
            function isoToDatetimeLocal(iso) {
                const d = new Date(iso);
                const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                return local.toISOString().slice(0, 16);
            }

            function openEditEntrySheet(entryId) {
                const entry = _allEntries.find((e) => e.id === entryId);
                if (!entry) return;
                showSheet(`
                    <div class="sheet-label">Eintrag</div>
                    <div class="sheet-title">${entry.name}</div>
                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:4px">Menge (${entry.unit})</div>
                        <input class="sheet-input" id="ee-amount" type="number" step="any" value="${entry.amount}">
                    </div>
                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:4px">Notiz</div>
                        <input class="sheet-input" id="ee-note" type="text" value="${entry.note ? entry.note.replace(/"/g, "&quot;") : ""}" placeholder="optional">
                    </div>
                    <div class="sheet-row">
                        <div class="sheet-label" style="margin-bottom:4px">Zeitpunkt</div>
                        <input class="sheet-input" id="ee-time" type="datetime-local" value="${isoToDatetimeLocal(entry.timestamp)}">
                    </div>
                    <div class="sheet-btns" style="margin-top:1rem">
                        <button class="btn-save" onclick="HB.saveEditedEntry('${entryId}')">Speichern</button>
                        <button class="btn-cancel" onclick="HB.closeSheet()">Abbrechen</button>
                    </div>
                    <div id="sheet-msg" style="font-family:'DM Mono',monospace;font-size:11px;margin-top:.5rem;text-align:center"></div>
                `);
            }

            async function saveEditedEntry(entryId) {
                const amount = parseFloat(document.getElementById("ee-amount").value);
                const note = document.getElementById("ee-note").value.trim() || null;
                const timeVal = document.getElementById("ee-time").value;
                const msg = document.getElementById("sheet-msg");
                if (!timeVal || isNaN(amount)) {
                    msg.style.color = "var(--accent-red)";
                    msg.textContent = "Menge und Zeitpunkt sind Pflicht";
                    return;
                }
                msg.style.color = "var(--muted)";
                msg.textContent = "Speichere…";
                try {
                    await apiFetch(`/api/tracking/entry/${entryId}`, "PATCH", {
                        amount,
                        note,
                        timestamp: new Date(timeVal).toISOString(),
                    });
                    closeSheet();
                    showToast("Gespeichert");
                    await loadAll();
                    renderVerlauf();
                } catch (e) {
                    msg.style.color = "var(--accent-red)";
                    msg.textContent = "Fehler: " + e.message;
                }
            }

            /* ════════════════════════════════════════════════════════════════
   TABS / TOAST / CLOCK
   ════════════════════════════════════════════════════════════════ */
            function switchTab(t, el) {
                document
                    .querySelectorAll(".tab")
                    .forEach((x) => x.classList.remove("active"));
                el.classList.add("active");
                ["heute", "verlauf", "einstellungen"].forEach((id) => {
                    document
                        .getElementById("tab-" + id)
                        .classList.toggle("visible", t === id);
                });
                if (t === "verlauf") renderVerlauf();
                if (t === "einstellungen") renderEinstellungen();
            }

            let toastTimer;
            function showToast(msg) {
                const el = document.getElementById("toast");
                el.textContent = msg;
                el.classList.add("show");
                clearTimeout(toastTimer);
                toastTimer = setTimeout(
                    () => el.classList.remove("show"),
                    1800,
                );
            }

            /* ── Lifecycle (Gesamt-App): Listener/Overlays sauber aufräumen ── */
            const onKeydown = (e) => {
                if (e.key === "Escape") closeSheet();
            };

            // Antippen = sofort buchen, gedrückt halten (450 ms) = Eintrag-Sheet mit Uhrzeit.
            // Delegiert am Container, damit es nach jedem Neuzeichnen der Heute-Liste weiter greift.
            let pressTimer = null;
            let pressFired = false;
            const heute = () => document.getElementById("heute-content");
            const onPressStart = (e) => {
                const b = e.target.closest("[data-tap]");
                pressFired = false;
                clearTimeout(pressTimer);
                if (!b) return;
                pressTimer = setTimeout(() => {
                    pressFired = true;
                    if (navigator.vibrate) navigator.vibrate(15);
                    openEntry(b.dataset.item, parseFloat(b.dataset.amt));
                }, 450);
            };
            const onPressEnd = () => clearTimeout(pressTimer);
            const onHeuteClick = (e) => {
                const tap = e.target.closest("[data-tap]");
                if (tap) {
                    if (pressFired) { pressFired = false; return; }
                    return tapButton(tap.dataset.item, parseFloat(tap.dataset.amt), tap.dataset.lbl);
                }
                const manual = e.target.closest("[data-manual]");
                if (manual) openEntry(manual.dataset.manual);
            };
            const onHeuteMenu = (e) => { if (e.target.closest("[data-tap]")) e.preventDefault(); };

            function init() {
                document.addEventListener("keydown", onKeydown);
                const h = heute();
                h.addEventListener("pointerdown", onPressStart);
                h.addEventListener("pointerup", onPressEnd);
                h.addEventListener("pointercancel", onPressEnd);
                h.addEventListener("pointerleave", onPressEnd);
                h.addEventListener("click", onHeuteClick);
                h.addEventListener("contextmenu", onHeuteMenu);
                return loadAll();
            }
            function dispose() {
                document.removeEventListener("keydown", onKeydown);
                clearTimeout(toastTimer);
                clearTimeout(pressTimer);
                document.getElementById("sheet-edit-overlay")?.remove();
            }

  window.HB = { fmtAmt, itemById, allItems, loadAll, renderToday, renderVerlauf, renderEinstellungen, renderSettingsCat, toggleCat, openCatSheet, selectEmoji, selectColor, saveCat, deleteCat, openItemSheet, selectUnit, addBtnRow, saveItem, deleteItem, showSheet, closeSheet, tapButton, openEntry, submitEntry, deleteEntry, openEditEntrySheet, saveEditedEntry, switchTab, showToast, init, dispose };
  return { init, dispose };
}

let styleEl = null;
let instance = null;
export default {
  async mount(root, core) {
    styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    document.head.append(styleEl);
    root.innerHTML = TEMPLATE;
    instance = build(core, root);
    await instance.init();
  },
  unmount() {
    instance?.dispose();
    instance = null;
    styleEl?.remove();
    styleEl = null;
    delete window.HB;
  },
};

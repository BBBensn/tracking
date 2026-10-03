// health.js — Modul "Gesundheit" (Medikamente, Blutdruck, Gewicht, Oura, Dashboard).
// Aus health.bensn.me übernommen. Zwei Besonderheiten gegenüber der Einzel-App:
//  - Handler in Inline-onclick laufen über den Namespace window.HL (nur solange gemountet).
//  - API-Aufrufe gehen über core.apiHealth ("/api/..." wird zu "/hapi/...").
//  - Verlauf: gemeinsame Komponente js/history.js (Monate einklappbar, Liste/Kalender).

import { createHistory } from "../history.js";

const CSS = `.m-health {
      /* ── Tabs (scrollt horizontal statt die ganze Seite, wie feed's #filtersWrap) ── */
      .tab {
        font-family: "DM Mono", monospace; font-size: 11px; text-transform: uppercase;
        letter-spacing: 0.1em; padding: 9px 14px; cursor: pointer; color: var(--muted);
        border: none; border-bottom: 2px solid transparent; margin-bottom: -1px;
        background: none; transition: color 0.15s, border-color 0.15s;
        white-space: nowrap; flex-shrink: 0;
      }
      .tab.active { color: var(--text); border-bottom-color: var(--text); }
      .tab:hover:not(.active) { color: var(--text); }
      .tab-section { display: none; }
      .tab-section.visible { display: block; }

      /* ── API Status Bar ── */

      /* ── Quick actions ── */
      .quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1.5rem; }
      .quick-btn {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        padding: 1.1rem 0.5rem; border-radius: 12px; border: 1px solid var(--border);
        background: var(--surface); color: var(--text); cursor: pointer; transition: all 0.15s;
        font-family: "DM Mono", monospace;
      }
      .quick-btn:hover { border-color: var(--border-hover); background: rgba(255,255,255,0.04); }
      .quick-btn .icon { font-size: 1.4rem; }
      .quick-btn .label { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

      /* ── Section headers ── */
      .section-label {
        font-family: "DM Mono", monospace; font-size: 10px; letter-spacing: 0.1em;
        text-transform: uppercase; color: var(--muted); margin: 1.5rem 0 0.6rem;
      }

      /* ── Med checklist (Heute) ── */
      .med-check-row {
        display: flex; align-items: center; gap: 0.75rem; background: var(--surface);
        border: 1px solid var(--border); border-radius: 10px; padding: 0.8rem 1rem;
        margin-bottom: 0.5rem; cursor: pointer; transition: all 0.15s;
      }
      .med-check-row:hover { border-color: var(--border-hover); }
      .med-check-row.done { border-color: rgba(74,222,128,0.35); background: rgba(74,222,128,0.06); }
      .med-check-box {
        width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--border);
        flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        font-size: 12px; color: var(--green);
      }
      .med-check-row.done .med-check-box { border-color: var(--green); background: rgba(74,222,128,0.15); }
      .med-check-main { flex: 1; min-width: 0; }
      .med-check-name { font-family: "Syne", sans-serif; font-weight: 700; font-size: 0.9rem; }
      .med-check-sub { font-family: "DM Mono", monospace; font-size: 10px; color: var(--muted); margin-top: 2px; }
      .med-check-count { font-family: "DM Mono", monospace; font-size: 10px; color: var(--muted); }

      /* ── Medication profile cards (Medikamente tab) ── */
      .med-profile-card {
        background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
        padding: 0.9rem 1rem; margin-bottom: 0.6rem;
      }
      .med-profile-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
      .med-profile-name { font-family: "Syne", sans-serif; font-weight: 700; font-size: 0.95rem; }
      .med-profile-dose { font-family: "DM Mono", monospace; font-size: 11px; color: var(--muted); }
      .med-profile-period { font-family: "DM Mono", monospace; font-size: 10px; color: var(--muted); margin-top: 4px; }
      .med-profile-notes { font-family: "DM Mono", monospace; font-size: 10.5px; color: var(--muted); margin-top: 6px; font-style: italic; }
      .pill {
        font-family: "DM Mono", monospace; font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase;
        padding: 2px 8px; border-radius: 20px; border: 1px solid var(--border); color: var(--muted); flex-shrink: 0;
      }
      .pill.active { border-color: rgba(74,222,128,0.4); color: var(--green); }
      .pill.prn { border-color: rgba(0,166,251,0.4); color: var(--accent-blue); }
      .btn-add-block {
        width: 100%; font-family: "DM Mono", monospace; font-size: 11px; letter-spacing: 0.06em;
        text-transform: uppercase; padding: 0.8rem; border-radius: 10px; border: 1px dashed var(--border);
        background: none; color: var(--muted); cursor: pointer; margin-bottom: 1rem;
      }
      .btn-add-block:hover { border-color: var(--border-hover); color: var(--text); }

      /* .btn-pill now lives in the shared /shared/bensn.css — one definition for all apps */

      /* ── Med checklist: selection state (distinct from "done") + confirm bar ── */
      .med-check-row.selected { border-color: var(--accent-blue); background: rgba(0, 166, 251, 0.08); }
      .med-check-row.selected .med-check-box { border-color: var(--accent-blue); background: rgba(0, 166, 251, 0.15); color: var(--accent-blue); }
      .med-confirm-bar {
        position: sticky; bottom: calc(var(--nav-clear) + 0.5rem); display: none; flex-wrap: wrap; align-items: center; gap: 0.5rem;
        background: #161616; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px;
        padding: 0.7rem 0.9rem; margin-top: 0.6rem; z-index: 10;
      }
      .med-confirm-bar.visible { display: flex; }
      .med-confirm-bar input[type="datetime-local"] {
        flex: 1 1 100%; order: -1; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
        padding: 8px 10px; color: var(--text); font-family: "DM Mono", monospace; font-size: 12px; min-width: 0;
      }
      .med-confirm-count {
        display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;
        font-family: "DM Mono", monospace; font-size: 13px; color: var(--text);
      }
      .med-confirm-count button { width: 26px; height: 26px; padding: 0; }
      .med-confirm-count span { min-width: 1.2em; text-align: center; }
      .med-confirm-count input {
        width: 4.4rem; background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
        padding: 6px 8px; color: var(--text); font-family: "DM Mono", monospace; font-size: 13px; text-align: center;
      }
      .med-confirm-count .mc-unit { min-width: 0; color: var(--muted); font-size: 11px; }
      .med-confirm-bar > .btn-pill { flex-shrink: 0; }

      /* ── Icon-only button (Material Symbols) ── */
      .btn-icon {
        width: 30px; height: 30px; background: none; border: 1px solid var(--border); border-radius: 7px;
        color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: border-color 0.15s, color 0.15s; flex-shrink: 0; padding: 0;
      }
      .btn-icon:hover { border-color: var(--border-hover); color: var(--text); }
      .btn-icon .material-symbols-outlined { font-size: 16px; }

      /* ── Day header (grouping in Verlauf / History-Modal) ── */
      .day-header { display: flex; align-items: center; gap: 10px; margin: 1.25rem 0 0.6rem; padding: 0 2px; }
      .day-header:first-child { margin-top: 0; }
      .day-label {
        font-family: "DM Mono", monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
        color: var(--muted); white-space: nowrap;
      }
      .day-count { font-family: "DM Mono", monospace; font-size: 9px; color: rgba(255, 255, 255, 0.2); white-space: nowrap; }
      .day-line { flex: 1; height: 1px; background: var(--border); }

      /* ── Effect notes nested under a Verlauf entry ── */
      .effect-notes { margin-top: 8px; padding-left: 0.6rem; border-left: 2px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
      .effect-note { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; font-family: "DM Mono", monospace; font-size: 10px; color: var(--muted); }
      .effect-note .effect-note-time { color: var(--text); }
      .effect-note-main { flex: 1; min-width: 0; }

      /* ── Stat cards ── */
      .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-bottom: 1rem; }
      .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 0.9rem 1rem; }
      .stat-label { font-family: "DM Mono", monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
      .stat-value { font-family: "Syne", sans-serif; font-weight: 800; font-size: 1.4rem; }
      .stat-sub { font-family: "DM Mono", monospace; font-size: 10px; color: var(--muted); margin-top: 2px; }
      .sparkline { margin-top: 6px; width: 100%; height: 32px; }

      /* ── Entry list (Verlauf) ── */
      .entry-row {
        display: flex; align-items: center; gap: 0.7rem; padding: 0.7rem 0.8rem;
        background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
        margin-bottom: 0.5rem;
      }
      .entry-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .entry-dot.med { background: var(--accent-blue); }
      .entry-dot.bp { background: var(--accent-red); }
      .entry-dot.weight { background: var(--orange); }
      .entry-dot.oura { background: var(--accent-blue); }
      .entry-main { flex: 1; min-width: 0; }
      .entry-title { font-family: "Syne", sans-serif; font-weight: 700; font-size: 0.9rem; }
      .entry-sub { font-family: "DM Mono", monospace; font-size: 10px; color: var(--muted); margin-top: 2px; }
      .entry-time { font-family: "DM Mono", monospace; font-size: 10px; color: var(--muted); flex-shrink: 0; }
      .empty-state { font-family: "DM Mono", monospace; font-size: 11px; color: var(--muted); padding: 2rem 0; text-align: center; }

      /* ── Bottom sheet (shared pattern) ── */
      .overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 100;
        display: none; align-items: flex-end; justify-content: center;
      }
      .overlay.visible { display: flex; }
      .overlay-sheet {
        background: #161616; border: 1px solid rgba(255,255,255,0.12);
        border-radius: 16px 16px 0 0; padding: 1.5rem 1.25rem 2.5rem; width: 100%; max-width: 480px;
      }
      .sheet-title { font-family: "Syne", sans-serif; font-size: 1.3rem; font-weight: 800; margin-bottom: 1.25rem; letter-spacing: -0.02em; }
      .input-row {
        display: flex; align-items: center; gap: 0.5rem; background: var(--surface);
        border: 1px solid var(--border); border-radius: 10px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem;
      }
      .input-row input, .input-row select {
        flex: 1; background: none; border: none; color: var(--text); font-family: "DM Mono", monospace;
        font-size: 1.2rem; font-weight: 500; outline: none; min-width: 0;
      }
      .input-unit { font-family: "DM Mono", monospace; font-size: 13px; color: var(--muted); flex-shrink: 0; }
      .tag-picker { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.9rem; }
      .tag-btn {
        font-family: "DM Mono", monospace; font-size: 10.5px; padding: 5px 11px; border-radius: 6px;
        border: 1px solid var(--border); color: var(--muted); background: none; cursor: pointer; transition: all 0.15s;
      }
      .tag-btn:hover { border-color: var(--border-hover); color: var(--text); }
      .tag-btn.active { border-color: var(--accent-blue); color: var(--accent-blue); background: rgba(0,166,251,0.08); }
      .note-input {
        width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
        padding: 8px 12px; color: var(--text); font-family: "DM Mono", monospace; font-size: 12px;
        outline: none; margin-bottom: 1rem; resize: vertical; min-height: 44px;
      }
      .sheet-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .sheet-label { font-family: "DM Mono", monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.4rem; }
      .toggle-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.9rem; font-family: "DM Mono", monospace; font-size: 11px; color: var(--text); }
      /* .btn-save / .btn-cancel now live in the shared /shared/bensn.css */
    
}
`;

const TEMPLATE = `<div class="subnav"><div class="tabs">
        <button class="tab active" onclick="HL.switchTab('heute', this)">Heute</button>
        <button class="tab" onclick="HL.switchTab('verlauf', this)">Verlauf</button>
        <button class="tab" onclick="HL.switchTab('dashboard', this)">Dashboard</button>
        <button class="tab" onclick="HL.switchTab('medikamente', this)">Medikamente</button>
        <button class="tab" onclick="HL.switchTab('oura', this)">Oura</button>
      </div></div>

      <!-- ═══ TAB: HEUTE ═══ -->
      <div id="tab-heute" class="tab-section visible">
        <div class="section-label">Tägliche Medikamente</div>
        <div id="medChecklistDaily"></div>
        <div class="section-label">Bedarfsmedikamente</div>
        <div id="medChecklistPrn"></div>

        <div class="med-confirm-bar" id="medConfirmBar">
          <input type="datetime-local" id="medConfirmTime">
          <div class="med-confirm-count" id="medConfirmCountRow" style="display:none">
            <span id="medConfirmStepper" style="display:flex;align-items:center;gap:0.4rem">
              <button class="btn-pill" onclick="HL.stepMedConfirmCount(-1)">−</button>
              <span id="medConfirmCountVal">1</span>
              <button class="btn-pill" onclick="HL.stepMedConfirmCount(1)">+</button>
            </span>
            <span id="medConfirmDropsWrap" style="display:none;align-items:center;gap:0.4rem">
              <input type="number" id="medConfirmDrops" min="1" max="999" inputmode="numeric" value="1" />
              <span class="mc-unit">Tropfen</span>
            </span>
          </div>
          <button class="btn-pill" onclick="HL.cancelMedSelection()">Abbrechen</button>
          <button class="btn-pill green" onclick="HL.confirmMedSelection()">Bestätigen</button>
        </div>

        <div class="quick-grid" style="margin-top: 1.25rem">
          <button class="quick-btn" onclick="HL.openSheet('bp')"><span class="icon">❤️</span><span class="label">Blutdruck</span></button>
          <button class="quick-btn" onclick="HL.openSheet('weight')"><span class="icon">⚖️</span><span class="label">Gewicht</span></button>
        </div>
      </div>

      <!-- ═══ TAB: MEDIKAMENTE ═══ -->
      <div id="tab-medikamente" class="tab-section">
        <button class="btn-add-block" onclick="HL.openMedCreateSheet()">+ Neues Medikament</button>
        <div class="section-label">Aktiv</div>
        <div id="medActiveList"></div>
        <div class="section-label">Historie</div>
        <div id="medHistoryList"></div>
      </div>

      <!-- ═══ TAB: VERLAUF ═══ -->
      <div id="tab-verlauf" class="tab-section">
        <div id="verlaufList"></div>
      </div>

      <!-- ═══ TAB: OURA ═══ -->
      <div id="tab-oura" class="tab-section">
        <div id="ouraNotConnected" style="display: none">
          <div class="empty-state">
            Oura ist noch nicht verbunden.<br />
            <a id="ouraAuthorizeLink" href="#" class="btn-pill green" style="display: inline-block; margin-top: 10px; text-decoration: none">Mit Oura verbinden</a>
          </div>
        </div>
        <div id="ouraConnected" style="display: none">
          <div class="section-label">Schlaf</div>
          <div id="ouraSleepList"></div>
          <div class="section-label" style="margin-top: 1.25rem">Herzfrequenz (täglich)</div>
          <div id="ouraHeartrateList"></div>
        </div>
      </div>

      <!-- ═══ TAB: DASHBOARD ═══ -->
      <div id="tab-dashboard" class="tab-section">
        <div class="stat-grid">
          <div class="stat-card" style="cursor: pointer" onclick="HL.openHistoryModal('bp')">
            <div class="stat-label">Blutdruck</div>
            <div class="stat-value" id="statBp">–</div>
            <div class="stat-sub" id="statBpSub">keine Daten</div>
            <svg class="sparkline" id="sparkBp"></svg>
          </div>
          <div class="stat-card" style="cursor: pointer" onclick="HL.openHistoryModal('weight')">
            <div class="stat-label">Gewicht</div>
            <div class="stat-value" id="statWeight">–</div>
            <div class="stat-sub" id="statWeightSub">keine Daten</div>
            <svg class="sparkline" id="sparkWeight"></svg>
          </div>
          <div class="stat-card" style="cursor: pointer" onclick="HL.openHistoryModal('sleep')">
            <div class="stat-label">Schlaf (Ø 7 Tage)</div>
            <div class="stat-value" id="statSleep">–</div>
            <div class="stat-sub" id="statSleepSub">keine Daten</div>
          </div>
          <div class="stat-card" style="cursor: pointer" onclick="HL.openHistoryModal('heartrate')">
            <div class="stat-label">Herzfrequenz (Ø 7 Tage)</div>
            <div class="stat-value" id="statHr">–</div>
            <div class="stat-sub" id="statHrSub">keine Daten</div>
            <svg class="sparkline" id="sparkHr"></svg>
          </div>
        </div>
      </div>
    <!-- ═══ SHEET: NEUES MEDIKAMENT ═══ -->
    <div class="overlay" id="sheetMedCreate" onclick="if(event.target===this) HL.closeSheet('medCreate')">
      <div class="overlay-sheet">
        <div class="sheet-title">Neues Medikament</div>
        <div class="input-row"><input type="text" id="newMedName" placeholder="Name" style="font-size: 1rem" /></div>
        <div class="sheet-label">Einnahme-Form</div>
        <div class="tag-picker" id="newMedUnitPicker">
          <button class="tag-btn active" data-unit="tablet" onclick="HL.setNewMedUnit('tablet', this)">Tabletten</button>
          <button class="tag-btn" data-unit="drops" onclick="HL.setNewMedUnit('drops', this)">Tropfen</button>
        </div>
        <div class="input-row"><input type="number" id="newMedDose" placeholder="Dosis" step="0.5" /><span class="input-unit" id="newMedDoseUnit">mg je Tablette</span></div>
        <div class="tag-picker">
          <button class="tag-btn" id="newMedPrnToggle" onclick="HL.toggleNewMedPrn(this)">Bedarfsorientiert (PRN)</button>
        </div>
        <div class="input-row">
          <span class="input-unit" style="margin-right: 6px">Gültig ab</span>
          <input type="date" id="newMedValidFrom" style="font-size: 1rem" />
        </div>
        <div class="input-row">
          <span class="input-unit" style="margin-right: 6px">Gültig bis</span>
          <input type="date" id="newMedValidTo" style="font-size: 1rem" />
          <span class="input-unit">leer = aktuell</span>
        </div>
        <textarea class="note-input" id="newMedNotes" placeholder="Notiz (optional, z.B. Grund für Absetzen)"></textarea>
        <div class="sheet-btns">
          <button class="btn-cancel" onclick="HL.closeSheet('medCreate')">Abbrechen</button>
          <button class="btn-save" onclick="HL.saveNewMed()">Speichern</button>
        </div>
      </div>
    </div>

    <!-- ═══ SHEET: BEOBACHTUNG NACHTRAGEN ═══ -->
    <div class="overlay" id="sheetMedNote" onclick="if(event.target===this) HL.closeSheet('medNote')">
      <div class="overlay-sheet">
        <div class="sheet-title" id="medNoteTitle">Beobachtung</div>
        <div class="tag-picker" id="medNoteEffectTags"></div>
        <div class="sheet-label">Zeitpunkt</div>
        <div class="input-row"><input type="datetime-local" id="medNoteDatetime" style="width:100%"></div>
        <textarea class="note-input" id="medNoteText" placeholder="Was fällt dir auf? (optional)"></textarea>
        <div class="sheet-btns">
          <button class="btn-cancel" onclick="HL.closeSheet('medNote')">Abbrechen</button>
          <button class="btn-save" onclick="HL.saveMedNote()">Speichern</button>
        </div>
      </div>
    </div>

    <!-- ═══ SHEET: ZEITPUNKT ÄNDERN (Heute-Checkliste, schneller Quick-Edit) ═══ -->
    <div class="overlay" id="sheetEditTime" onclick="if(event.target===this) HL.closeSheet('editTime')">
      <div class="overlay-sheet">
        <div class="sheet-title">Zeitpunkt ändern</div>
        <div class="input-row"><input type="datetime-local" id="editTimeInput" style="width:100%"></div>
        <div class="toggle-row" id="editTimeApplyAllRow" style="display:none" data-on="false">
          <span>Für alle heutigen Medikamente übernehmen</span>
          <div style="display:flex;gap:6px">
            <button type="button" class="tag-btn active" data-val="false" onclick="HL.setYesNoToggle('editTimeApplyAllRow', false)">Nein</button>
            <button type="button" class="tag-btn" data-val="true" onclick="HL.setYesNoToggle('editTimeApplyAllRow', true)">Ja</button>
          </div>
        </div>
        <div class="sheet-btns">
          <button class="btn-cancel" onclick="HL.closeSheet('editTime')">Abbrechen</button>
          <button class="btn-save" onclick="HL.saveEditedTime()">Speichern</button>
        </div>
      </div>
    </div>

    <!-- ═══ SHEET: EINTRAG BEARBEITEN (Verlauf — Zeitpunkt, Inhalt, Tablettenanzahl, Löschen) ═══ -->
    <div class="overlay" id="sheetEditEntry" onclick="if(event.target===this) HL.closeSheet('editEntry')">
      <div class="overlay-sheet">
        <div class="sheet-title" id="editEntryTitle">Eintrag bearbeiten</div>
        <div class="sheet-label">Zeitpunkt</div>
        <div class="input-row"><input type="datetime-local" id="editEntryTime" style="width:100%"></div>
        <div id="editEntryFields"></div>
        <div class="toggle-row" id="editEntryApplyAllRow" style="display:none" data-on="false">
          <span>Für alle heutigen Medikamente übernehmen</span>
          <div style="display:flex;gap:6px">
            <button type="button" class="tag-btn active" data-val="false" onclick="HL.setYesNoToggle('editEntryApplyAllRow', false)">Nein</button>
            <button type="button" class="tag-btn" data-val="true" onclick="HL.setYesNoToggle('editEntryApplyAllRow', true)">Ja</button>
          </div>
        </div>
        <div class="sheet-btns">
          <button class="btn-pill red" onclick="HL.deleteEditEntry()">Löschen</button>
          <button class="btn-cancel" onclick="HL.closeSheet('editEntry')">Abbrechen</button>
          <button class="btn-save" onclick="HL.saveEditEntry()">Speichern</button>
        </div>
      </div>
    </div>

    <!-- ═══ SHEET: BLUTDRUCK ═══ -->
    <div class="overlay" id="sheetBp" onclick="if(event.target===this) HL.closeSheet('bp')">
      <div class="overlay-sheet">
        <div class="sheet-title">Blutdruck</div>
        <div class="input-row"><input type="number" id="bpSys" placeholder="Systolisch" /><span class="input-unit">mmHg</span></div>
        <div class="input-row"><input type="number" id="bpDia" placeholder="Diastolisch" /><span class="input-unit">mmHg</span></div>
        <div class="input-row"><input type="number" id="bpPulse" placeholder="Puls (optional)" /><span class="input-unit">bpm</span></div>
        <div class="sheet-label">Zeitpunkt</div>
        <div class="input-row"><input type="datetime-local" id="bpDatetime" style="width:100%"></div>
        <textarea class="note-input" id="bpNote" placeholder="Notiz (optional)"></textarea>
        <div class="sheet-btns">
          <button class="btn-cancel" onclick="HL.closeSheet('bp')">Abbrechen</button>
          <button class="btn-save" onclick="HL.saveBp()">Speichern</button>
        </div>
      </div>
    </div>

    <!-- ═══ SHEET: GEWICHT ═══ -->
    <div class="overlay" id="sheetWeight" onclick="if(event.target===this) HL.closeSheet('weight')">
      <div class="overlay-sheet">
        <div class="sheet-title">Gewicht</div>
        <div class="input-row"><input type="number" id="weightKg" placeholder="Gewicht" step="0.1" /><span class="input-unit">kg</span></div>
        <div class="sheet-label">Zeitpunkt</div>
        <div class="input-row"><input type="datetime-local" id="weightDatetime" style="width:100%"></div>
        <textarea class="note-input" id="weightNote" placeholder="Notiz (optional)"></textarea>
        <div class="sheet-btns">
          <button class="btn-cancel" onclick="HL.closeSheet('weight')">Abbrechen</button>
          <button class="btn-save" onclick="HL.saveWeight()">Speichern</button>
        </div>
      </div>
    </div>

    <!-- ═══ SHEET: DASHBOARD-VERLAUF (History-Modal je Kachel) ═══ -->
    <div class="overlay" id="sheetHistory" onclick="if(event.target===this) HL.closeSheet('history')">
      <div class="overlay-sheet" style="max-height: 80vh; display: flex; flex-direction: column">
        <div class="sheet-title" id="historyTitle">Verlauf</div>
        <div id="historyList" style="overflow-y: auto; flex: 1; margin-bottom: 1rem">Lädt…</div>
        <div class="sheet-btns">
          <button class="btn-cancel" onclick="HL.closeSheet('history')" style="width: 100%">Schließen</button>
        </div>
      </div>
    </div>

    `;

function build(core) {
  const { nowForDatetimeLocal, toIsoOrNull, todayKey } = core;

      /* ════════════ API ════════════ */
      const apiFetch = (path, method = "GET", body = null) => core.apiHealth(path, { method, body });

      /* ════════════ CONSTANTS ════════════ */
      const EFFECT_TAGS = [
        "Motivation", "Konzentration/Fokus", "Reizkontrolle", "Entspannung", "Alltagsstruktur",
        "Blutdrucksteigerung", "Frequenzerhöhung", "Appetitverlust", "Kopfschmerz",
        "Trockener Mund", "Schlafstörungen",
      ];

      /* ════════════ STATE ════════════ */
      let _selectedNoteEffects = [];
      let _noteLogId = null;
      let _newMedPrn = false;
      let _newMedUnit = "tablet";
      let _apiOnline = false;

      /* ════════════ TABS ════════════ */
      function switchTab(name, btn) {
        document.querySelectorAll(".tab-section").forEach((el) => el.classList.remove("visible"));
        document.getElementById("tab-" + name).classList.add("visible");
        document.querySelectorAll(".tab").forEach((el) => el.classList.remove("active"));
        btn.classList.add("active");
        if (name === "dashboard") loadDashboard();
        if (name === "verlauf") loadVerlauf();
        if (name === "medikamente") loadMedProfiles();
        if (name === "oura") loadOura();
      }

      /* ════════════ SHEETS ════════════ */
      function openSheet(name) {
        document.getElementById("sheet" + capitalize(name)).classList.add("visible");
        const dtField = document.getElementById(name + "Datetime");
        if (dtField) dtField.value = nowForDatetimeLocal();
      }
      function closeSheet(name) {
        document.getElementById("sheet" + capitalize(name)).classList.remove("visible");
      }
      function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
      // Zwei-Buttons-Toggle (Nein/Ja) statt einem einzelnen Button mit wechselndem Text —
      // sonst ist auf einen Blick nicht klar, dass der Button überhaupt klickbar/ein Umschalter ist.
      function setYesNoToggle(rowId, value) {
        const row = document.getElementById(rowId);
        row.dataset.on = value ? "true" : "false";
        row.querySelectorAll(".tag-btn").forEach((b) => b.classList.toggle("active", b.dataset.val === String(value)));
      }

      function renderEffectTagsInto(elId) {
        const el = document.getElementById(elId);
        el.innerHTML = EFFECT_TAGS.map(
          (t) => `<button class="tag-btn" data-tag="${t}" onclick="HL.toggleNoteEffect('${t}', this)">${t}</button>`
        ).join("");
      }
      function toggleNoteEffect(tag, btn) {
        const i = _selectedNoteEffects.indexOf(tag);
        if (i >= 0) { _selectedNoteEffects.splice(i, 1); btn.classList.remove("active"); }
        else { _selectedNoteEffects.push(tag); btn.classList.add("active"); }
      }

      /* ════════════ SAVE ACTIONS ════════════ */

      // Heute-Checkliste: einfacher Tap loggt sofort eine Einnahme (kein Formular).
      // Auswählen-dann-bestätigen statt Instant-Log: mehrere Meds anhaken, gemeinsam
      // mit einem (optional angepassten) Zeitpunkt bestätigen.
      let _selectedMedIds = new Set();
      let _lastActiveMeds = [];
      let _lastAdherenceById = {};

      let _medConfirmCount = 1;

      const medById = (id) => _lastActiveMeds.find((m) => m.id === id);
      const isDrops = (m) => !!m && m.unit === "drops";
      // Zuletzt bestätigte Tropfenzahl je Medikament merken (typisch immer dieselbe Menge)
      function lastDrops(medId) {
        try { return parseInt(localStorage.getItem("bensn.drops." + medId)) || 1; } catch (_) { return 1; }
      }
      function rememberDrops(medId, n) {
        try { localStorage.setItem("bensn.drops." + medId, String(n)); } catch (_) { /* privat/geblockt */ }
      }
      function toggleMedSelect(medId) {
        if (_selectedMedIds.has(medId)) {
          _selectedMedIds.delete(medId);
        } else {
          // Tropfen haben eine eigene Mengenangabe und werden deshalb immer einzeln bestätigt —
          // sonst wäre unklar, auf welches der gleichzeitig gewählten Medikamente sie sich beziehen
          const anyDrops = [..._selectedMedIds].some((id) => isDrops(medById(id)));
          if (isDrops(medById(medId)) || anyDrops) _selectedMedIds.clear();
          _selectedMedIds.add(medId);
        }
        renderMedChecklistDOM();
      }
      // Anzahl-Stepper ("2x Ritalin auf einmal") nur sinnvoll, wenn genau EIN
      // Bedarfsmedikament ausgewählt ist — bei mehreren gleichzeitig ausgewählten
      // (v.a. gemischt mit täglichen) wäre unklar, auf welches sich die Anzahl bezieht.
      function renderMedConfirmBar() {
        const bar = document.getElementById("medConfirmBar");
        const timeInput = document.getElementById("medConfirmTime");
        const countRow = document.getElementById("medConfirmCountRow");
        if (_selectedMedIds.size > 0) {
          bar.classList.add("visible");
          if (!timeInput.value) timeInput.value = nowForDatetimeLocal();
          const onlyId = _selectedMedIds.size === 1 ? Array.from(_selectedMedIds)[0] : null;
          const onlyMed = onlyId ? _lastActiveMeds.find((m) => m.id === onlyId) : null;
          if (onlyMed && (onlyMed.is_prn || isDrops(onlyMed))) {
            countRow.style.display = "flex";
            const drops = isDrops(onlyMed);
            document.getElementById("medConfirmStepper").style.display = drops ? "none" : "flex";
            const wrap = document.getElementById("medConfirmDropsWrap");
            wrap.style.display = drops ? "flex" : "none";
            const inp = document.getElementById("medConfirmDrops");
            if (drops && inp.dataset.med !== onlyMed.id) { inp.value = lastDrops(onlyMed.id); inp.dataset.med = onlyMed.id; }
          } else {
            countRow.style.display = "none";
            _medConfirmCount = 1;
          }
          document.getElementById("medConfirmCountVal").textContent = _medConfirmCount;
        } else {
          bar.classList.remove("visible");
          timeInput.value = "";
          _medConfirmCount = 1;
        }
      }
      function stepMedConfirmCount(delta) {
        _medConfirmCount = Math.max(1, Math.min(10, _medConfirmCount + delta));
        document.getElementById("medConfirmCountVal").textContent = _medConfirmCount;
      }
      function cancelMedSelection() {
        _selectedMedIds.clear();
        _medConfirmCount = 1;
        renderMedChecklistDOM();
      }
      async function confirmMedSelection() {
        const iso = toIsoOrNull(document.getElementById("medConfirmTime").value);
        const ids = Array.from(_selectedMedIds);
        let count = _medConfirmCount;
        const only = ids.length === 1 ? medById(ids[0]) : null;
        if (isDrops(only)) {
          count = parseInt(document.getElementById("medConfirmDrops").value);
          if (!count || count < 1) return alert("Anzahl Tropfen angeben");
          rememberDrops(only.id, count);
        }
        await Promise.all(ids.map((id) => apiFetch("/api/medication-log", "POST", { medication_id: id, taken_at: iso, count })));
        _medConfirmCount = 1;
        await loadMedChecklist();
      }

      // Neues Medikamenten-Profil anlegen
      function openMedCreateSheet() {
        document.getElementById("newMedName").value = "";
        document.getElementById("newMedDose").value = "";
        document.getElementById("newMedValidFrom").value = todayKey();
        document.getElementById("newMedValidTo").value = "";
        document.getElementById("newMedNotes").value = "";
        _newMedPrn = false;
        document.getElementById("newMedPrnToggle").classList.remove("active");
        setNewMedUnit("tablet", document.querySelector('#newMedUnitPicker [data-unit="tablet"]'));
        openSheet("medCreate");
      }
      function setNewMedUnit(unit, btn) {
        _newMedUnit = unit;
        btn.parentElement.querySelectorAll(".tag-btn").forEach((b) => b.classList.toggle("active", b === btn));
        document.getElementById("newMedDoseUnit").textContent = unit === "drops" ? "mg je Tropfen" : "mg je Tablette";
      }
      function toggleNewMedPrn(btn) {
        _newMedPrn = !_newMedPrn;
        btn.classList.toggle("active", _newMedPrn);
      }

      async function saveNewMed() {
        const name = document.getElementById("newMedName").value.trim();
        if (!name) return alert("Name angeben");
        await apiFetch("/api/medications", "POST", {
          name,
          dose_mg: parseFloat(document.getElementById("newMedDose").value) || null,
          is_prn: _newMedPrn,
          unit: _newMedUnit,
          valid_from: document.getElementById("newMedValidFrom").value || null,
          valid_to: document.getElementById("newMedValidTo").value || null,
          notes: document.getElementById("newMedNotes").value || null,
        });
        closeSheet("medCreate");
        loadMedChecklist();
        loadMedProfiles();
      }

      // Ein aktives Profil beenden (z.B. Dosis wird geändert -> neues Profil separat anlegen)
      async function endMedication(id) {
        if (!confirm("Dieses Medikament als beendet (heute) markieren?")) return;
        await apiFetch(`/api/medications/${id}`, "PATCH", { valid_to: todayKey() });
        loadMedChecklist();
        loadMedProfiles();
      }

      // Zeitgestempelte Beobachtung zu einer bestehenden Einnahme nachtragen
      function openMedNoteSheet(logId, medName) {
        _noteLogId = logId;
        _selectedNoteEffects = [];
        document.getElementById("medNoteTitle").textContent = `Beobachtung · ${medName}`;
        document.getElementById("medNoteText").value = "";
        renderEffectTagsInto("medNoteEffectTags");
        openSheet("medNote");
      }
      async function saveMedNote() {
        await apiFetch(`/api/medication-log/${_noteLogId}/note`, "POST", {
          noted_at: toIsoOrNull(document.getElementById("medNoteDatetime").value),
          effects: _selectedNoteEffects,
          note: document.getElementById("medNoteText").value || null,
        });
        closeSheet("medNote");
        loadVerlauf();
      }

      async function saveBp() {
        const systolic = parseInt(document.getElementById("bpSys").value);
        const diastolic = parseInt(document.getElementById("bpDia").value);
        if (!systolic || !diastolic) return alert("Systolisch und diastolisch angeben");
        const pulseVal = document.getElementById("bpPulse").value;
        await apiFetch("/api/bp", "POST", {
          systolic, diastolic,
          pulse: pulseVal ? parseInt(pulseVal) : null,
          measured_at: toIsoOrNull(document.getElementById("bpDatetime").value),
          notes: document.getElementById("bpNote").value || null,
        });
        closeSheet("bp");
        ["bpSys", "bpDia", "bpPulse", "bpNote"].forEach((id) => (document.getElementById(id).value = ""));
      }

      async function saveWeight() {
        const weightKg = parseFloat(document.getElementById("weightKg").value);
        if (!weightKg) return alert("Gewicht angeben");
        await apiFetch("/api/weight", "POST", {
          weight_kg: weightKg,
          measured_at: toIsoOrNull(document.getElementById("weightDatetime").value),
          notes: document.getElementById("weightNote").value || null,
        });
        closeSheet("weight");
        document.getElementById("weightKg").value = "";
        document.getElementById("weightNote").value = "";
      }

      /* ════════════ LOAD: MEDICATIONS (Heute-Checkliste + Medikamente-Tab) ════════════ */
      async function loadMedChecklist() {
        const dailyEl = document.getElementById("medChecklistDaily");
        const prnEl = document.getElementById("medChecklistPrn");
        let active, adherence;
        try {
          [active, adherence] = await Promise.all([
            apiFetch("/api/medications?active=true"),
            apiFetch("/api/medication-adherence"),
          ]);
        } catch (e) {
          dailyEl.innerHTML = `<div class="empty-state">API nicht erreichbar · ${e.message}</div>`;
          prnEl.innerHTML = "";
          return;
        }
        _lastActiveMeds = active;
        _lastAdherenceById = {};
        adherence.forEach((a) => (_lastAdherenceById[a.medication_id] = a));
        _selectedMedIds.clear();
        renderMedChecklistDOM();
      }

      function renderMedChecklistDOM() {
        const dailyEl = document.getElementById("medChecklistDaily");
        const prnEl = document.getElementById("medChecklistPrn");
        if (!_lastActiveMeds.length) {
          dailyEl.innerHTML = '<div class="empty-state">Noch keine Medikamente angelegt — unter "Medikamente" eins hinzufügen.</div>';
          prnEl.innerHTML = "";
          renderMedConfirmBar();
          return;
        }
        const daily = _lastActiveMeds.filter((m) => !m.is_prn);
        const prn = _lastActiveMeds.filter((m) => m.is_prn);
        dailyEl.innerHTML = daily.length
          ? daily.map(renderMedChecklistRow).join("")
          : '<div class="empty-state">Keine täglichen Medikamente.</div>';
        prnEl.innerHTML = prn.length
          ? prn.map(renderMedChecklistRow).join("")
          : '<div class="empty-state">Keine Bedarfsmedikamente.</div>';
        renderMedConfirmBar();
      }

      function renderMedChecklistRow(m) {
        const a = _lastAdherenceById[m.id];
        // Bedarfsmedikamente bleiben NIE dauerhaft grün (sie werden mehrfach am Tag
        // genommen) — nur tägliche Medikamente zeigen den erledigt-Status persistent.
        const showDone = a && a.taken_today && !m.is_prn;
        const isSelected = _selectedMedIds.has(m.id);
        const doseLabel = m.dose_mg ? `${m.dose_mg}mg${isDrops(m) ? "/Tropfen" : ""}` : "";
        const countLabel = a && a.taken_count_today
          ? `${a.taken_count_today}${isDrops(m) ? " Tropfen" : "×"} heute${a.last_taken_at ? " · zuletzt " + fmtTime(a.last_taken_at) : ""}`
          : "";
        const editTimeBtn = a && a.taken_today && a.last_log_id
          ? `<button class="btn-pill" style="margin-top:6px" onclick="event.stopPropagation(); HL.openEditTimeSheet('med','${a.last_log_id}','${a.last_taken_at}')">Zeit ändern</button>`
          : "";
        return `
          <div class="med-check-row ${showDone ? "done" : ""} ${isSelected ? "selected" : ""}" onclick="HL.toggleMedSelect('${m.id}')">
            <div class="med-check-box">${showDone ? "✓" : isSelected ? "●" : ""}</div>
            <div class="med-check-main">
              <div class="med-check-name">${m.name}${m.is_prn ? ' <span class="pill prn">PRN</span>' : ""}</div>
              <div class="med-check-sub">${[doseLabel, countLabel].filter(Boolean).join(" · ")}</div>
              ${editTimeBtn}
            </div>
          </div>`;
      }

      async function loadMedProfiles() {
        const activeEl = document.getElementById("medActiveList");
        const historyEl = document.getElementById("medHistoryList");
        let meds;
        try {
          meds = await apiFetch("/api/medications");
        } catch (e) {
          activeEl.innerHTML = `<div class="empty-state">API nicht erreichbar · ${e.message}</div>`;
          historyEl.innerHTML = "";
          return;
        }
        const active = meds.filter((m) => m.active);
        const history = meds.filter((m) => !m.active);

        activeEl.innerHTML = active.length
          ? active.map((m) => renderMedProfileCard(m, true)).join("")
          : '<div class="empty-state">Keine aktiven Medikamente.</div>';
        historyEl.innerHTML = history.length
          ? history.map((m) => renderMedProfileCard(m, false)).join("")
          : '<div class="empty-state">Keine Historie.</div>';
      }

      function renderMedProfileCard(m, isActive) {
        const doseLabel = m.dose_mg ? `${m.dose_mg}mg${m.unit === "drops" ? "/Tropfen" : ""}` : "";
        const period = `${fmtDate(m.valid_from)} – ${m.valid_to ? fmtDate(m.valid_to) : "heute"}`;
        return `
          <div class="med-profile-card">
            <div class="med-profile-top">
              <div>
                <span class="med-profile-name">${m.name}</span>
                ${m.is_prn ? '<span class="pill prn">PRN</span>' : ""}
                ${m.unit === "drops" ? '<span class="pill">Tropfen</span>' : ""}
                ${isActive ? '<span class="pill active">Aktiv</span>' : ""}
              </div>
              <div class="med-profile-dose">${doseLabel}</div>
            </div>
            <div class="med-profile-period">${period}</div>
            ${m.notes ? `<div class="med-profile-notes">${m.notes}</div>` : ""}
            <div style="display:flex;gap:1rem;margin-top:4px">
              ${isActive ? `<button class="btn-pill" onclick="HL.endMedication('${m.id}')">Beenden</button>` : ""}
              <button class="btn-pill red" onclick="HL.deleteMedication('${m.id}','${m.name.replace(/'/g, "\\'")}')">Löschen</button>
            </div>
          </div>`;
      }

      async function deleteMedication(id, name) {
        if (!confirm(`"${name}" komplett löschen? Das entfernt auch alle bisherigen Einnahme-Einträge dazu. Für ein legitim beendetes Medikament besser "Beenden" statt "Löschen" verwenden.`)) return;
        await apiFetch(`/api/medications/${id}`, "DELETE");
        loadMedChecklist();
        loadMedProfiles();
      }

      function fmtDate(d) {
        return new Date(d + "T00:00:00").toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
      }

      /* ════════════ LOAD: VERLAUF ════════════ */
      // Cache der Rohdaten pro Eintrags-ID, damit das Bearbeiten-Modal (openEditEntrySheet)
      // z.B. die aktuelle Tablettenanzahl oder die Effekte einer Beobachtung kennt, ohne
      // sie erneut vom Server zu laden.
      let _verlaufDataById = {};

      let _hx = null, _verlaufRows = new Map();
      const VERLAUF_COLOR = { med: "var(--accent-blue)", bp: "var(--accent-red)", weight: "var(--orange)" };

      function verlaufRowHtml(r) {
        const notesHtml = r.effectNotes && r.effectNotes.length
          ? `<div class="effect-notes">${r.effectNotes
              .map(
                (n) => `<div class="effect-note">
                  <div class="effect-note-main"><span class="effect-note-time">${fmtTime(n.noted_at)}</span>${n.effects && n.effects.length ? " · " + n.effects.join(", ") : ""}${n.note ? " · " + n.note : ""}</div>
                  <button class="btn-icon" title="Bearbeiten" onclick="HL.openEditEntrySheet('note','${n.id}','${n.noted_at}')"><span class="material-symbols-outlined">edit</span></button>
                </div>`
              )
              .join("")}</div>`
          : "";
        const addNoteBtn = r.type === "med"
          ? `<button class="btn-pill green" style="margin-top:6px" onclick="HL.openMedNoteSheet('${r.logId}', '${r.medName.replace(/'/g, "\\'")}')">+ Beobachtung</button>`
          : "";
        return `
          <div class="entry-row" style="flex-direction:column; align-items:stretch">
            <div style="display:flex; align-items:center; gap:0.7rem">
              <div class="entry-dot ${r.type}"></div>
              <div class="entry-main">
                <div class="entry-title">${r.title}</div>
                ${r.sub ? `<div class="entry-sub">${r.sub}</div>` : ""}
              </div>
              <div class="entry-time">${fmtTime(r.time)}</div>
              <button class="btn-icon" title="Bearbeiten" onclick="HL.openEditEntrySheet('${r.type}','${r.id}','${r.time}')"><span class="material-symbols-outlined">edit</span></button>
            </div>
            ${notesHtml}
            ${addNoteBtn}
          </div>`;
      }

      async function loadVerlauf() {
        const el = document.getElementById("verlaufList");
        if (!_hx) _hx = createHistory(el, {
          key: "health",
          renderDay: (day) => ({ body: (_verlaufRows.get(day) || []).map(verlaufRowHtml).join("") }),
        });
        if (!_verlaufRows.size) _hx.setMessage("Lädt…");
        let meds, bps, weights;
        try {
          [meds, bps, weights] = await Promise.all([
            apiFetch("/api/medication-logs?limit=500"),
            apiFetch("/api/bp-logs?limit=500"),
            apiFetch("/api/weight-logs?limit=500"),
          ]);
        } catch (e) {
          _hx.setMessage(`API nicht erreichbar · ${e.message}`);
          return;
        }
        _verlaufDataById = {};
        const rows = [
          ...meds.map((m) => {
            const drops = m.unit === "drops";
            _verlaufDataById[m.id] = { count: m.count || 1, unit: m.unit || "tablet" };
            return {
              type: "med", id: m.id, time: m.taken_at,
              title: drops ? m.medication_name : (m.count > 1 ? `${m.count}× ` : "") + m.medication_name,
              sub: drops ? `${m.count} Tropfen${m.dose_mg ? ` · ${m.dose_mg}mg/Tropfen` : ""}` : (m.dose_mg ? `${m.dose_mg}mg` : ""),
              logId: m.id, medName: m.medication_name, effectNotes: m.effect_notes || [],
            };
          }),
          ...bps.map((b) => {
            _verlaufDataById[b.id] = { systolic: b.systolic, diastolic: b.diastolic, pulse: b.pulse, notes: b.notes };
            return {
              type: "bp", id: b.id, time: b.measured_at, title: `${b.systolic}/${b.diastolic} mmHg`,
              sub: [b.pulse ? `Puls ${b.pulse} bpm` : "", b.notes || ""].filter(Boolean).join(" · "),
            };
          }),
          ...weights.map((w) => {
            _verlaufDataById[w.id] = { weight_kg: w.weight_kg, notes: w.notes };
            return { type: "weight", id: w.id, time: w.measured_at, title: `${w.weight_kg} kg`, sub: w.notes || "" };
          }),
        ].sort((a, b) => new Date(b.time) - new Date(a.time));

        rows.forEach((r) => {
          if (r.effectNotes) {
            r.effectNotes.forEach((n) => {
              _verlaufDataById[n.id] = { effects: n.effects || [], note: n.note || "" };
            });
          }
        });

        _verlaufRows = new Map();
        rows.forEach((r) => {
          const k = dayKeyVienna(r.time);
          (_verlaufRows.get(k) || _verlaufRows.set(k, []).get(k)).push(r);
        });
        const days = new Map();
        _verlaufRows.forEach((list, k) => days.set(k, { count: list.length, marks: list.map((r) => VERLAUF_COLOR[r.type]) }));
        _hx.setData(days);
      }

      /* ════════════ EDIT-TIME / DELETE (Medikamente, BP, Gewicht, Beobachtungen) ════════════ */
      const ENTRY_API_MAP = {
        med: { url: (id) => `/api/medication-log/${id}`, timeField: "taken_at" },
        bp: { url: (id) => `/api/bp/${id}`, timeField: "measured_at" },
        weight: { url: (id) => `/api/weight/${id}`, timeField: "measured_at" },
        note: { url: (id) => `/api/medication-log-note/${id}`, timeField: "noted_at" },
      };
      let _editTimeType = null, _editTimeId = null;
      function openEditTimeSheet(type, id, currentIso) {
        _editTimeType = type; _editTimeId = id;
        const d = new Date(currentIso);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        document.getElementById("editTimeInput").value = local.toISOString().slice(0, 16);
        document.getElementById("editTimeApplyAllRow").style.display = type === "med" ? "flex" : "none";
        setYesNoToggle("editTimeApplyAllRow", false);
        openSheet("editTime");
      }
      async function saveEditedTime() {
        const val = document.getElementById("editTimeInput").value;
        if (!val) return;
        const newIso = toIsoOrNull(val);
        const map = ENTRY_API_MAP[_editTimeType];
        await apiFetch(map.url(_editTimeId), "PATCH", { [map.timeField]: newIso });

        const applyAll = _editTimeType === "med" && document.getElementById("editTimeApplyAllRow").dataset.on === "true";
        if (applyAll) {
          const viennaDateKey = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Vienna" });
          const today = viennaDateKey(new Date().toISOString());
          const todaysLogs = await apiFetch("/api/medication-logs?limit=100");
          const others = todaysLogs.filter((l) => l.id !== _editTimeId && viennaDateKey(l.taken_at) === today);
          await Promise.all(others.map((l) => apiFetch(`/api/medication-log/${l.id}`, "PATCH", { taken_at: newIso })));
        }

        closeSheet("editTime");
        loadVerlauf();
        loadMedChecklist();
      }

      /* ════════════ EINTRAG BEARBEITEN (Verlauf — Zeit, Anzahl, Notiz-Inhalt, Löschen) ════════════ */
      const EDIT_ENTRY_TITLES = {
        med: "Einnahme bearbeiten", bp: "Blutdruck bearbeiten",
        weight: "Gewicht bearbeiten", note: "Beobachtung bearbeiten",
      };
      let _editEntryType = null, _editEntryId = null, _editEntryCount = 1;

      function openEditEntrySheet(type, id, currentIso) {
        _editEntryType = type; _editEntryId = id;
        const d = new Date(currentIso);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        document.getElementById("editEntryTime").value = local.toISOString().slice(0, 16);
        document.getElementById("editEntryTitle").textContent = EDIT_ENTRY_TITLES[type] || "Eintrag bearbeiten";

        const data = _verlaufDataById[id] || {};
        const fieldsEl = document.getElementById("editEntryFields");
        if (type === "med") {
          _editEntryCount = data.count || 1;
          fieldsEl.innerHTML = data.unit === "drops"
            ? `<div class="sheet-label">Tropfen</div>
               <div class="input-row"><input type="number" id="editEntryDrops" min="1" max="999" inputmode="numeric" value="${_editEntryCount}" /><span class="input-unit">Tropfen</span></div>`
            : `<div class="sheet-label">Anzahl</div>
            <div class="med-confirm-count" style="margin-bottom:1rem">
              <button class="btn-pill" onclick="HL.stepEditEntryCount(-1)">−</button>
              <span id="editEntryCountVal">${_editEntryCount}</span>
              <button class="btn-pill" onclick="HL.stepEditEntryCount(1)">+</button>
            </div>`;
        } else if (type === "note") {
          _selectedNoteEffects = [...(data.effects || [])];
          fieldsEl.innerHTML = `
            <div class="sheet-label">Effekte</div>
            <div class="tag-picker" id="editEntryEffectTags"></div>
            <div class="sheet-label">Notiz</div>
            <textarea class="note-input" id="editEntryNoteText">${data.note || ""}</textarea>`;
          renderEffectTagsInto("editEntryEffectTags");
          document.querySelectorAll("#editEntryEffectTags .tag-btn").forEach((b) => {
            if (_selectedNoteEffects.includes(b.dataset.tag)) b.classList.add("active");
          });
        } else if (type === "bp") {
          fieldsEl.innerHTML = `
            <div class="input-row"><input type="number" id="editEntrySystolic" placeholder="Systolisch" value="${data.systolic ?? ""}" /><span class="input-unit">mmHg</span></div>
            <div class="input-row"><input type="number" id="editEntryDiastolic" placeholder="Diastolisch" value="${data.diastolic ?? ""}" /><span class="input-unit">mmHg</span></div>
            <div class="input-row"><input type="number" id="editEntryPulse" placeholder="Puls (optional)" value="${data.pulse ?? ""}" /><span class="input-unit">bpm</span></div>
            <div class="sheet-label">Notiz</div>
            <textarea class="note-input" id="editEntryNotes">${data.notes || ""}</textarea>`;
        } else if (type === "weight") {
          fieldsEl.innerHTML = `
            <div class="input-row"><input type="number" id="editEntryWeightKg" step="0.1" placeholder="Gewicht" value="${data.weight_kg ?? ""}" /><span class="input-unit">kg</span></div>
            <div class="sheet-label">Notiz</div>
            <textarea class="note-input" id="editEntryNotes">${data.notes || ""}</textarea>`;
        } else {
          fieldsEl.innerHTML = "";
        }

        document.getElementById("editEntryApplyAllRow").style.display = type === "med" ? "flex" : "none";
        setYesNoToggle("editEntryApplyAllRow", false);

        openSheet("editEntry");
      }
      function stepEditEntryCount(delta) {
        _editEntryCount = Math.max(1, Math.min(10, _editEntryCount + delta));
        document.getElementById("editEntryCountVal").textContent = _editEntryCount;
      }
      async function saveEditEntry() {
        const val = document.getElementById("editEntryTime").value;
        if (!val) return;
        const newIso = toIsoOrNull(val);
        const map = ENTRY_API_MAP[_editEntryType];
        const body = { [map.timeField]: newIso };
        if (_editEntryType === "med") {
          const dropsEl = document.getElementById("editEntryDrops");
          body.count = dropsEl ? parseInt(dropsEl.value) : _editEntryCount;
          if (!body.count || body.count < 1) return alert("Anzahl angeben");
        } else if (_editEntryType === "note") {
          body.effects = _selectedNoteEffects;
          body.note = document.getElementById("editEntryNoteText").value || null;
        } else if (_editEntryType === "bp") {
          const systolic = parseInt(document.getElementById("editEntrySystolic").value);
          const diastolic = parseInt(document.getElementById("editEntryDiastolic").value);
          if (!systolic || !diastolic) return alert("Systolisch und diastolisch angeben");
          const pulseVal = document.getElementById("editEntryPulse").value;
          body.systolic = systolic;
          body.diastolic = diastolic;
          body.pulse = pulseVal ? parseInt(pulseVal) : null;
          body.notes = document.getElementById("editEntryNotes").value || null;
        } else if (_editEntryType === "weight") {
          const weightKg = parseFloat(document.getElementById("editEntryWeightKg").value);
          if (!weightKg) return alert("Gewicht angeben");
          body.weight_kg = weightKg;
          body.notes = document.getElementById("editEntryNotes").value || null;
        }
        await apiFetch(map.url(_editEntryId), "PATCH", body);

        const applyAll = _editEntryType === "med" && document.getElementById("editEntryApplyAllRow").dataset.on === "true";
        if (applyAll) {
          const viennaDateKey = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Vienna" });
          const today = viennaDateKey(new Date().toISOString());
          const todaysLogs = await apiFetch("/api/medication-logs?limit=100");
          const others = todaysLogs.filter((l) => l.id !== _editEntryId && viennaDateKey(l.taken_at) === today);
          await Promise.all(others.map((l) => apiFetch(`/api/medication-log/${l.id}`, "PATCH", { taken_at: newIso })));
        }

        closeSheet("editEntry");
        loadVerlauf();
        loadMedChecklist();
      }
      async function deleteEditEntry() {
        if (!confirm("Diesen Eintrag wirklich löschen?")) return;
        await apiFetch(ENTRY_API_MAP[_editEntryType].url(_editEntryId), "DELETE");
        closeSheet("editEntry");
        loadVerlauf();
        loadMedChecklist();
      }
      function fmtTime(iso) {
        const d = new Date(iso);
        return d.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
      }

      /* ════════════ DAY GROUPING (Verlauf + History-Modal) ════════════ */
      function dayKeyVienna(iso) {
        return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Vienna" });
      }
      function dayLabelFor(dateKey) {
        const today = dayKeyVienna(new Date().toISOString());
        const yd = new Date();
        yd.setDate(yd.getDate() - 1);
        const yesterday = dayKeyVienna(yd.toISOString());
        if (dateKey === today) return "Heute";
        if (dateKey === yesterday) return "Gestern";
        const [y, m, d] = dateKey.split("-");
        const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
        return `${dayNames[new Date(+y, +m - 1, +d).getDay()]} ${d}.${m}.`;
      }
      // Gruppiert `items` nach Kalendertag (Wien) und rendert je Gruppe einen day-header
      // gefolgt von den gerenderten Zeilen — geteiltes Muster für Verlauf und History-Modal.
      function groupByDayHtml(items, dayKeyGetter, rowRenderer) {
        const groups = {};
        items.forEach((item) => {
          const key = dayKeyGetter(item);
          (groups[key] = groups[key] || []).push(item);
        });
        return Object.keys(groups)
          .sort((a, b) => b.localeCompare(a))
          .map((key) => {
            const rowsHtml = groups[key].map(rowRenderer).join("");
            return `<div class="day-header">
              <span class="day-label">${dayLabelFor(key)}</span>
              <span class="day-count">${groups[key].length} Eintr.</span>
              <div class="day-line"></div>
            </div>${rowsHtml}`;
          })
          .join("");
      }

      /* ════════════ LOAD: DASHBOARD ════════════ */
      async function loadDashboard() {
        let d;
        try {
          d = await apiFetch("/api/dashboard");
        } catch (e) {
          return;
        }

        if (d.bp_trend.length) {
          const latest = d.bp_trend[0];
          document.getElementById("statBp").textContent = `${latest.systolic}/${latest.diastolic}`;
          document.getElementById("statBpSub").textContent = fmtTime(latest.measured_at);
          drawSparkline("sparkBp", d.bp_trend.map((r) => r.systolic).reverse(), "var(--accent-red)");
        }
        if (d.weight_trend.length) {
          const latest = d.weight_trend[0];
          document.getElementById("statWeight").textContent = `${latest.weight_kg} kg`;
          document.getElementById("statWeightSub").textContent = fmtTime(latest.measured_at);
          drawSparkline("sparkWeight", d.weight_trend.map((r) => parseFloat(r.weight_kg)).reverse(), "var(--orange)");
        }
        if (d.sleep_summary.length) {
          const withDuration = d.sleep_summary.filter((s) => s.total_sleep_duration);
          if (withDuration.length) {
            const avgSec = withDuration.reduce((a, s) => a + s.total_sleep_duration, 0) / withDuration.length;
            const withScore = withDuration.filter((s) => s.sleep_score);
            const scoreSub = withScore.length
              ? ` · Ø Score ${Math.round(withScore.reduce((a, s) => a + s.sleep_score, 0) / withScore.length)}`
              : "";
            document.getElementById("statSleep").textContent = `${(avgSec / 3600).toFixed(1)}h`;
            document.getElementById("statSleepSub").textContent = `${withDuration.length} Nächte${scoreSub}`;
          }
        }
        if (d.hr_summary.length) {
          const withResting = d.hr_summary.filter((h) => h.resting_bpm);
          if (withResting.length) {
            const lo = Math.min(...withResting.map((h) => h.resting_bpm));
            const hi = Math.max(...withResting.map((h) => h.resting_bpm));
            document.getElementById("statHr").textContent = lo === hi ? `${lo} bpm` : `${lo}–${hi} bpm`;
            document.getElementById("statHrSub").textContent = "Ruhepuls-Spanne";
            drawSparkline("sparkHr", withResting.map((h) => h.resting_bpm).reverse(), "var(--accent-blue)");
          }
        }
      }

      /* ════════════ LOAD: OURA ════════════ */
      async function loadOura() {
        let status;
        try {
          status = await apiFetch("/api/oura/status");
        } catch (e) {
          return;
        }
        document.getElementById("ouraNotConnected").style.display = status.connected ? "none" : "block";
        document.getElementById("ouraConnected").style.display = status.connected ? "block" : "none";
        if (!status.connected) {
          const params = new URLSearchParams({
            response_type: "code",
            client_id: status.client_id,
            redirect_uri: "https://health.bensn.me/api/oura/callback",
            scope: "daily heartrate",
            state: "bensn-health-oura-auth",
          });
          document.getElementById("ouraAuthorizeLink").href = `https://cloud.ouraring.com/oauth/authorize?${params}`;
          return;
        }

        const [sleepRes, hrRes] = await Promise.all([
          apiFetch("/api/oura/sleep?days=30"),
          apiFetch("/api/oura/heartrate?days=30"),
        ]);

        const fmtDay = (iso) => new Date(iso).toLocaleDateString("de-AT", { weekday: "short", day: "2-digit", month: "2-digit" });

        const sleepEl = document.getElementById("ouraSleepList");
        sleepEl.innerHTML = sleepRes.sleep.length
          ? sleepRes.sleep.map((s) => {
              const hrs = s.total_sleep_duration ? (s.total_sleep_duration / 3600).toFixed(1) + "h" : "–";
              const stages = ["deep_sleep_duration", "rem_sleep_duration", "light_sleep_duration"].map((k) => s[k]);
              const stageLabel = stages.every((v) => v != null)
                ? `Tief ${(stages[0] / 60).toFixed(0)}min · REM ${(stages[1] / 60).toFixed(0)}min · Leicht ${(stages[2] / 60).toFixed(0)}min`
                : "";
              const subParts = [stageLabel, s.efficiency ? `Effizienz ${s.efficiency}%` : "",
                s.average_heart_rate ? `Ø ${Math.round(s.average_heart_rate)} bpm` : "",
                s.average_hrv ? `HRV ${s.average_hrv}ms` : ""].filter(Boolean);
              return `<div class="entry-row">
                <div class="entry-dot oura"></div>
                <div class="entry-main">
                  <div class="entry-title">${hrs}${s.sleep_score ? ` · Score ${s.sleep_score}` : ""}</div>
                  ${subParts.length ? `<div class="entry-sub">${subParts.join(" · ")}</div>` : ""}
                </div>
                <div class="entry-time">${fmtDay(s.day)}</div>
              </div>`;
            }).join("")
          : '<div class="empty-state">Noch keine Schlaf-Daten synct.</div>';

        const hrEl = document.getElementById("ouraHeartrateList");
        hrEl.innerHTML = hrRes.days.length
          ? hrRes.days.map((h) => `<div class="entry-row">
                <div class="entry-dot oura"></div>
                <div class="entry-main">
                  <div class="entry-title">${h.resting_bpm ? `${h.resting_bpm} bpm Ruhepuls` : `${h.min_bpm}–${h.max_bpm} bpm`}</div>
                  <div class="entry-sub">Ø ${h.avg_bpm} bpm · ${h.min_bpm}–${h.max_bpm} bpm über den Tag</div>
                </div>
                <div class="entry-time">${fmtDay(h.day)}</div>
              </div>`).join("")
          : '<div class="empty-state">Noch keine Herzfrequenz-Daten synct.</div>';
      }

      /* ════════════ DASHBOARD: HISTORY-MODAL (Klick auf eine Kachel) ════════════ */
      const HISTORY_CONFIGS = {
        bp: {
          title: "Blutdruck · Verlauf",
          load: () => apiFetch("/api/bp-logs?limit=500"),
          dateField: (r) => r.measured_at,
          row: (r) => ({
            dot: "bp", time: fmtTime(r.measured_at),
            title: `${r.systolic}/${r.diastolic} mmHg`,
            sub: r.pulse ? `Puls ${r.pulse} bpm` : "",
          }),
        },
        weight: {
          title: "Gewicht · Verlauf",
          load: () => apiFetch("/api/weight-logs?limit=500"),
          dateField: (r) => r.measured_at,
          row: (r) => ({ dot: "weight", time: fmtTime(r.measured_at), title: `${r.weight_kg} kg`, sub: r.notes || "" }),
        },
        sleep: {
          title: "Schlaf · Verlauf",
          load: async () => (await apiFetch("/api/oura/sleep?days=30")).sleep,
          dateField: (r) => r.bedtime_end,
          row: (r) => ({
            dot: "oura", time: fmtTime(r.bedtime_end),
            title: (r.total_sleep_duration ? (r.total_sleep_duration / 3600).toFixed(1) + "h" : "–") + (r.sleep_score ? ` · Score ${r.sleep_score}` : ""),
            sub: r.efficiency ? `Effizienz ${r.efficiency}%` : "",
          }),
        },
        heartrate: {
          title: "Herzfrequenz · Verlauf",
          load: async () => (await apiFetch("/api/oura/heartrate?days=30")).days,
          dateField: (r) => r.day,
          row: (r) => ({
            dot: "oura", time: new Date(r.day).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" }),
            title: r.resting_bpm ? `${r.resting_bpm} bpm Ruhepuls` : `${r.min_bpm}–${r.max_bpm} bpm`,
            sub: `Ø ${r.avg_bpm} bpm · ${r.min_bpm}–${r.max_bpm} bpm über den Tag`,
          }),
        },
      };
      async function openHistoryModal(kind) {
        const cfg = HISTORY_CONFIGS[kind];
        document.getElementById("historyTitle").textContent = cfg.title;
        const listEl = document.getElementById("historyList");
        listEl.innerHTML = "Lädt…";
        openSheet("history");
        let rows;
        try {
          rows = await cfg.load();
        } catch (e) {
          listEl.innerHTML = `<div class="empty-state">API nicht erreichbar · ${e.message}</div>`;
          return;
        }
        if (!rows || !rows.length) {
          listEl.innerHTML = '<div class="empty-state">Noch keine Einträge.</div>';
          return;
        }
        listEl.innerHTML = groupByDayHtml(
          rows,
          (r) => dayKeyVienna(cfg.dateField(r)),
          (r) => {
            const row = cfg.row(r);
            return `<div class="entry-row">
              <div class="entry-dot ${row.dot}"></div>
              <div class="entry-main">
                <div class="entry-title">${row.title}</div>
                ${row.sub ? `<div class="entry-sub">${row.sub}</div>` : ""}
              </div>
              <div class="entry-time">${row.time}</div>
            </div>`;
          }
        );
      }

      function drawSparkline(svgId, values, color) {
        const svg = document.getElementById(svgId);
        if (values.length < 2) { svg.innerHTML = ""; return; }
        const w = 200, h = 32;
        const min = Math.min(...values), max = Math.max(...values);
        const range = max - min || 1;
        const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svg.innerHTML = `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" />`;
      }

      /* ════════════ INIT ════════════ */
      async function init() { await loadMedChecklist(); }

  window.HL = { setNewMedUnit, switchTab, openSheet, closeSheet, capitalize, setYesNoToggle, renderEffectTagsInto, toggleNoteEffect, toggleMedSelect, renderMedConfirmBar, stepMedConfirmCount, cancelMedSelection, confirmMedSelection, openMedCreateSheet, toggleNewMedPrn, saveNewMed, endMedication, openMedNoteSheet, saveMedNote, saveBp, saveWeight, loadMedChecklist, renderMedChecklistDOM, renderMedChecklistRow, loadMedProfiles, renderMedProfileCard, deleteMedication, fmtDate, loadVerlauf, openEditTimeSheet, saveEditedTime, openEditEntrySheet, stepEditEntryCount, saveEditEntry, deleteEditEntry, fmtTime, dayKeyVienna, dayLabelFor, groupByDayHtml, loadDashboard, loadOura, openHistoryModal, drawSparkline, init };
  return { init };
}

let styleEl = null;
export default {
  async mount(root, core) {
    styleEl = document.createElement("style");
    styleEl.textContent = CSS;
    document.head.append(styleEl);
    root.innerHTML = TEMPLATE;
    await build(core).init();
  },
  unmount() {
    styleEl?.remove();
    styleEl = null;
    delete window.HL;
  },
};

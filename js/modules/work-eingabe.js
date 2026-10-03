// work-eingabe.js — Tab "Eingabe" des Work-Moduls (Dienst starten, Pause starten/beenden, Sender
// ändern, Dienst beenden — mit nachträglichen Uhrzeiten). Aus worktracker.bensn.me/eingabe übernommen.
// Unterschiede zur Einzel-Seite: läuft als Tab (kein eigener Seitenkopf), API über core.api (Fehler
// kommen weiter als {error} zurück), nach dem Absenden geht es per hooks.onDone() zurück zu "Aktiv"
// statt per Redirect, und der Zustand wird bei jedem Öffnen frisch aufgebaut (create/dispose).
// Handler laufen über window.WI (nur solange der Tab offen ist).

const CSS = `.m-work {
/* ── Mobile-first Eingabe ── */

.eingabe-wrap {
  display: flex;
  flex-direction: column;
  max-width: 480px;
  margin: 0 auto;
}

.eingabe-header {
  padding: 0 0 1.25rem;
  display: flex;
  align-items: center;
  gap: .75rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.75rem;
}
.eingabe-back {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--muted);
  text-decoration: none;
  letter-spacing: .06em;
  display: flex;
  align-items: center;
  gap: 4px;
}
.eingabe-back:before { content: '←'; }
.eingabe-title {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-left: auto;
}

/* ── Action Grid (Hauptmenü) ── */
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .75rem;
  flex: 1;
  align-content: start;
  padding-top: .5rem;
}
.action-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem 1.25rem;
  cursor: pointer;
  transition: border-color .15s, transform .1s;
  text-align: left;
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.action-btn:active { transform: scale(.97); }
.action-btn:hover { border-color: var(--border-hover); }
.action-btn.full { grid-column: 1 / -1; }
.action-btn.disabled { opacity: .35; pointer-events: none; }

.action-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity .2s;
  border-radius: 16px;
}
.action-btn.start::before { background: radial-gradient(circle at top right, rgba(74,222,128,.08), transparent 60%); }
.action-btn.pause::before { background: radial-gradient(circle at top right, rgba(232,114,74,.08), transparent 60%); }
.action-btn.end::before   { background: radial-gradient(circle at top right, rgba(255,0,81,.08), transparent 60%); }
.action-btn.sender::before{ background: radial-gradient(circle at top right, rgba(0,166,251,.08), transparent 60%); }
.action-btn:hover::before { opacity: 1; }

.action-icon {
  font-size: 1.5rem;
  margin-bottom: .75rem;
  display: block;
}
.action-label {
  font-family: 'Syne', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  display: block;
  margin-bottom: .25rem;
}
.action-sub {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: .04em;
}
.action-badge {
  position: absolute;
  top: .75rem;
  right: .75rem;
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: .08em;
  padding: 3px 7px;
  border-radius: 4px;
  text-transform: uppercase;
}
.badge-green { background: rgba(74,222,128,.12); color: var(--green); border: 1px solid rgba(74,222,128,.2); }
.badge-orange { background: rgba(232,114,74,.12); color: var(--orange); border: 1px solid rgba(232,114,74,.2); }
.badge-muted { background: rgba(255,255,255,.04); color: var(--muted); border: 1px solid var(--border); }

/* ── Forms ── */
.form-section { display: none; }
.form-section.active { display: block; }

.form-group { margin-bottom: 1.25rem; }
.form-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--muted);
  display: block;
  margin-bottom: .5rem;
}

/* ── Option Pills ── */
.pill-group { display: flex; flex-wrap: wrap; gap: .5rem; }
.pill {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
  transition: all .15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.pill:active { transform: scale(.95); }
.pill.selected {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  background: rgba(0,166,251,.08);
}
.pill.selected.green { border-color: var(--green); color: var(--green); background: rgba(74,222,128,.08); }
.pill.selected.orange { border-color: var(--orange); color: var(--orange); background: rgba(232,114,74,.08); }
.pill.selected.red { border-color: var(--accent-red); color: var(--accent-red); background: rgba(255,0,81,.08); }

/* ── Number Input ── */
.num-input-wrap {
  display: flex;
  align-items: center;
  gap: .75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: .75rem 1rem;
}
.num-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,.04);
  color: var(--text);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}
.num-btn:active { transform: scale(.9); background: rgba(255,255,255,.08); }
.num-val {
  font-family: 'DM Mono', monospace;
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--text);
  min-width: 2ch;
  text-align: center;
  flex: 1;
}
.num-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: .06em;
}

/* ── Text Input ── */
.text-input {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: .875rem 1rem;
  color: var(--text);
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  outline: none;
  transition: border-color .15s;
  -webkit-appearance: none;
}
.text-input:focus { border-color: var(--border-hover); }
.text-input::placeholder { color: var(--muted); }

/* ── Submit Button ── */
.submit-btn {
  width: 100%;
  padding: 1rem;
  border-radius: 12px;
  border: none;
  font-family: 'Syne', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 1.5rem;
  transition: opacity .15s, transform .1s;
  -webkit-tap-highlight-color: transparent;
}
.submit-btn:active { transform: scale(.98); opacity: .85; }
.submit-btn.green { background: var(--green); color: #0a0a0b; }
.submit-btn.orange { background: var(--orange); color: #fff; }
.submit-btn.red { background: var(--accent-red); color: #fff; }
.submit-btn.blue { background: var(--accent-blue); color: #fff; }
.submit-btn:disabled { opacity: .4; pointer-events: none; }

/* ── Status Banner ── */
.status-banner {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  display: none;
}
.status-banner.visible { display: block; }
.status-banner .sb-sender {
  font-family: 'Syne', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -.01em;
}
.status-banner .sb-meta {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--muted);
  margin-top: 3px;
}
.status-banner .sb-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--green);
  display: inline-block;
  margin-right: 5px;
  animation: pulse 2s ease-in-out infinite;
}

/* ── Toast ── */
.toast {
  position: fixed;
  bottom: calc(var(--nav-clear) + 1rem);
  left: 50%;
  transform: translateX(-50%) translateY(200px);
  background: var(--surface);
  border: 1px solid var(--border-hover);
  border-radius: 12px;
  padding: .875rem 1.5rem;
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: var(--text);
  transition: transform .3s ease;
  z-index: 100;
  white-space: nowrap;
}
.toast.show { transform: translateX(-50%) translateY(0); }
.toast.success { border-color: rgba(74,222,128,.3); color: var(--green); }
.toast.error { border-color: rgba(255,0,81,.3); color: var(--accent-red); }

/* ── Divider ── */
.form-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1.25rem 0;
}

@media (max-width: 360px) {
  .action-grid { grid-template-columns: 1fr; }
  .action-btn.full { grid-column: 1; }
}
}
`;

const TEMPLATE = `<div class="eingabe-wrap">

  <!-- ── Header ── -->
  <div class="eingabe-header">
    <a class="eingabe-back" style="cursor:pointer">Aktiv</a>
    <span class="eingabe-title" id="pageTitle">Eingabe</span>
  </div>

  <!-- ── Status Banner ── -->
  <div class="status-banner" id="statusBanner">
    <div class="sb-sender" id="sbSender">—</div>
    <div class="sb-meta" id="sbMeta">—</div>
  </div>

  <!-- ── Main Menu ── -->
  <div id="mainMenu">
    <div class="action-grid">
      <button class="action-btn start full" id="btnStart" onclick="WI.showForm('start')">
        <span class="action-icon">▶</span>
        <span class="action-label">Dienst starten</span>
        <span class="action-sub">Arbeitsbeginn eintragen</span>
      </button>
      <button class="action-btn pause" id="btnPauseStart" onclick="WI.showForm('pause_start')">
        <span class="action-icon">⏸</span>
        <span class="action-label">Pause</span>
        <span class="action-sub">Pause beginnen</span>
      </button>
      <button class="action-btn pause" id="btnPauseEnd" onclick="WI.showForm('pause_end')">
        <span class="action-icon">▷</span>
        <span class="action-label">Pause Ende</span>
        <span class="action-sub">Pause beenden</span>
      </button>
      <button class="action-btn sender" id="btnSender" onclick="WI.showForm('sender')">
        <span class="action-icon">✎</span>
        <span class="action-label">Sender</span>
        <span class="action-sub">Station ändern</span>
      </button>
      <button class="action-btn end full" id="btnEnd" onclick="WI.showForm('end')">
        <span class="action-icon">■</span>
        <span class="action-label">Dienst beenden</span>
        <span class="action-sub">Arbeitsende eintragen</span>
      </button>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════ -->
  <!-- FORM: Dienst starten                          -->
  <!-- ══════════════════════════════════════════════ -->
  <div class="form-section" id="form-start">
    <div class="form-group">
      <label class="form-label">Startzeit</label>
      <input type="time" class="text-input" id="startTime">
    </div>
    <div class="form-group">
      <label class="form-label">Sender</label>
      <div class="pill-group" id="senderPills">
        <div class="pill" data-val="Puls4" onclick="WI.selectPill(this,'sender');WI.checkCafePuls()">Puls4</div>
        <div class="pill" data-val="ATV/ATV2" onclick="WI.selectPill(this,'sender');WI.checkCafePuls()">ATV / ATV2</div>
        <div class="pill" data-val="ATV" onclick="WI.selectPill(this,'sender');WI.checkCafePuls()">ATV</div>
        <div class="pill" data-val="ATV2" onclick="WI.selectPill(this,'sender');WI.checkCafePuls()">ATV2</div>
        <div class="pill" data-val="Puls24" onclick="WI.selectPill(this,'sender');WI.checkCafePuls()">Puls24</div>
        <div class="pill" data-val="unbekannt" onclick="WI.selectPill(this,'sender');WI.checkCafePuls()">Später</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Schichttyp</label>
      <div class="pill-group">
        <div class="pill" data-val="früh" onclick="WI.selectPill(this,'shift_type');WI.checkCafePuls()">Früh</div>
        <div class="pill" data-val="nachmittag" onclick="WI.selectPill(this,'shift_type');WI.checkCafePuls()">Nachmittag</div>
        <div class="pill" data-val="nacht" onclick="WI.selectPill(this,'shift_type');WI.checkCafePuls()">Nacht</div>
      </div>
    </div>

    <!-- Café Puls – nur bei Puls4 + Früh -->
    <div class="form-group" id="cafePulsGroup" style="display:none">
      <label class="form-label">Café Puls</label>
      <div class="pill-group">
        <div class="pill" data-val="true" onclick="WI.selectPill(this,'cafe_puls')">Ja, abgewickelt</div>
        <div class="pill" data-val="false" onclick="WI.selectPill(this,'cafe_puls')">Nein</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Dienstart</label>
      <div class="pill-group">
        <div class="pill selected green" data-val="normal" onclick="WI.selectPill(this,'dienstart');WI.toggleDienstart('normal')">Normal</div>
        <div class="pill" data-val="duo" onclick="WI.selectPill(this,'dienstart');WI.toggleDienstart('duo')">Zu zweit</div>
        <div class="pill" data-val="schulung" onclick="WI.selectPill(this,'dienstart');WI.toggleDienstart('schulung')">Schulung</div>
        <div class="pill" data-val="krankenstand" onclick="WI.selectPill(this,'dienstart');WI.toggleDienstart('krankenstand')">Krankenstand</div>
        <div class="pill" data-val="anderes" onclick="WI.selectPill(this,'dienstart');WI.toggleDienstart('anderes')">Anderes</div>
      </div>
    </div>

    <!-- Dienst zu zweit -->
    <div class="form-group" id="duoGroup" style="display:none">
      <label class="form-label">Zweiter Sender</label>
      <div class="pill-group">
        <div class="pill" data-val="Puls4" onclick="WI.selectPill(this,'sender2')">Puls4</div>
        <div class="pill" data-val="ATV" onclick="WI.selectPill(this,'sender2')">ATV</div>
        <div class="pill" data-val="ATV2" onclick="WI.selectPill(this,'sender2')">ATV2</div>
        <div class="pill" data-val="Puls24" onclick="WI.selectPill(this,'sender2')">Puls24</div>
      </div>
    </div>

    <!-- Schulung -->
    <div class="form-group" id="schulungGroup" style="display:none">
      <label class="form-label">Schulungsthema</label>
      <input type="text" class="text-input" id="schulungNote" placeholder="Thema eingeben…">
    </div>

    <!-- Krankenstand -->
    <div class="form-group" id="krankenstandGroup" style="display:none">
      <label class="form-label">Zeitraum</label>
      <div class="pill-group">
        <div class="pill" data-val="ganztägig" onclick="WI.selectPill(this,'ks_type');WI.toggleKrankenstand('ganztägig')">Ganztägig</div>
        <div class="pill" data-val="zeitraum" onclick="WI.selectPill(this,'ks_type');WI.toggleKrankenstand('zeitraum')">Zeitraum</div>
      </div>
    </div>
    <div class="form-group" id="krankenstandZeit" style="display:none">
      <input type="text" class="text-input" id="krankenstandNote" placeholder="z.B. 08:00–12:00">
    </div>

    <!-- Anderes -->
    <div class="form-group" id="anderesGroup" style="display:none">
      <label class="form-label">Beschreibung</label>
      <input type="text" class="text-input" id="anderesNote" placeholder="Was ist anders?">
    </div>

    <button class="submit-btn green" onclick="WI.submitStart()">Dienst starten</button>
  </div>

  <!-- ══════════════════════════════════════════════ -->
  <!-- FORM: Pause Start                             -->
  <!-- ══════════════════════════════════════════════ -->
  <div class="form-section" id="form-pause_start">
    <div class="form-group">
      <label class="form-label">Alles bereit?</label>
      <p style="font-family:'DM Mono',monospace;font-size:12px;color:var(--muted);margin-bottom:1rem">Pause wird jetzt gestartet.</p>
    </div>
    <div class="form-group">
      <label class="form-label">Startzeit</label>
      <input type="time" class="text-input" id="pauseStartTime">
    </div>
    <button class="submit-btn orange" onclick="WI.submitPauseStart()">Pause starten</button>
  </div>

  <!-- ══════════════════════════════════════════════ -->
  <!-- FORM: Pause Ende                              -->
  <!-- ══════════════════════════════════════════════ -->
  <div class="form-section" id="form-pause_end">
    <div class="form-group">
      <label class="form-label">Pausentyp</label>
      <div class="pill-group" id="pauseTypePills">
        <div class="pill" data-val="Rauchen" onclick="WI.togglePauseType(this)">Rauchen</div>
        <div class="pill" data-val="WC" onclick="WI.togglePauseType(this)">WC</div>
        <div class="pill" data-val="Einkaufen" onclick="WI.togglePauseType(this)">Einkaufen</div>
        <div class="pill" data-val="Essen" onclick="WI.togglePauseType(this)">Essen</div>
        <div class="pill" data-val="Sonstiges" onclick="WI.togglePauseType(this)">Sonstiges</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Spicy 🌶</label>
      <div class="num-input-wrap">
        <button class="num-btn" onclick="WI.adjustNum('spicy',-1)">−</button>
        <span class="num-val" id="spicyVal">0</span>
        <button class="num-btn" onclick="WI.adjustNum('spicy',1)">+</button>
        <span class="num-label">Zigaretten</span>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Blend 🚬</label>
      <div class="num-input-wrap">
        <button class="num-btn" onclick="WI.adjustNum('blend',-1)">−</button>
        <span class="num-val" id="blendVal">0</span>
        <button class="num-btn" onclick="WI.adjustNum('blend',1)">+</button>
        <span class="num-label">Zigaretten</span>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Zeitraum</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
        <div>
          <label class="form-label" style="margin-bottom:.35rem">Von</label>
          <input type="time" class="text-input" id="pauseEndStartTime">
        </div>
        <div>
          <label class="form-label" style="margin-bottom:.35rem">Bis</label>
          <input type="time" class="text-input" id="pauseEndEndTime">
        </div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Anmerkung (optional)</label>
      <input type="text" class="text-input" id="pauseNote" placeholder="z.B. länger als geplant…">
    </div>

    <button class="submit-btn orange" onclick="WI.submitPauseEnd()">Pause beenden</button>
  </div>

  <!-- ══════════════════════════════════════════════ -->
  <!-- FORM: Dienst beenden                          -->
  <!-- ══════════════════════════════════════════════ -->
  <div class="form-section" id="form-end">
    <div class="form-group">
      <label class="form-label">Endzeit</label>
      <input type="time" class="text-input" id="endTime">
    </div>
    <div class="form-group">
      <label class="form-label">Anmerkung zum Dienst</label>
      <textarea class="text-input" id="endNotes" rows="3" placeholder="Optional…" style="resize:none"></textarea>
    </div>
    <button class="submit-btn red" onclick="WI.submitEnd()">Dienst beenden</button>
  </div>

  <!-- ══════════════════════════════════════════════ -->
  <!-- FORM: Sender ändern                           -->
  <!-- ══════════════════════════════════════════════ -->
  <div class="form-section" id="form-sender">
    <div class="form-group">
      <label class="form-label">Sender 1</label>
      <div class="pill-group">
        <div class="pill" data-val="Puls4" onclick="WI.selectPill(this,'new_sender')">Puls4</div>
        <div class="pill" data-val="ATV" onclick="WI.selectPill(this,'new_sender')">ATV</div>
        <div class="pill" data-val="ATV2" onclick="WI.selectPill(this,'new_sender')">ATV2</div>
        <div class="pill" data-val="Puls24" onclick="WI.selectPill(this,'new_sender')">Puls24</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Sender 2 (optional)</label>
      <div class="pill-group">
        <div class="pill" data-val="" onclick="WI.selectPill(this,'new_sender2')">Keiner</div>
        <div class="pill" data-val="Puls4" onclick="WI.selectPill(this,'new_sender2')">Puls4</div>
        <div class="pill" data-val="ATV" onclick="WI.selectPill(this,'new_sender2')">ATV</div>
        <div class="pill" data-val="ATV2" onclick="WI.selectPill(this,'new_sender2')">ATV2</div>
        <div class="pill" data-val="Puls24" onclick="WI.selectPill(this,'new_sender2')">Puls24</div>
      </div>
    </div>
    <button class="submit-btn blue" onclick="WI.submitSender()">Sender aktualisieren</button>
  </div>

</div><!-- /eingabe-wrap -->

<!-- Toast -->
<div class="toast" id="toast"></div>`;

export function create(core, root, hooks) {
  const styleEl = document.createElement("style");
  styleEl.textContent = CSS;
  document.head.append(styleEl);
  root.innerHTML = TEMPLATE;
  const done = () => hooks.onDone();


  /* ── State ── */
  const state = {
    sender: null, shift_type: null, dienstart: 'normal',
    sender2: null, ks_type: null, new_sender: null, new_sender2: null,
    cafe_puls: false,
    spicy: 0, blend: 0,
    pauseTypes: [],
    currentShift: null,
    openBreak: null
  };

  // Doppel-Submit-Schutz: verhindert doppelt angelegte Schichten/Pausen bei
  // Doppel-Tap oder langsamer Verbindung (Ursache historischer Duplikate)
  let isSubmitting = false;

  /* ── Time Helpers ── */
  function toLocalISO(iso) {
    if(!iso) return '';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2,'0');
    const tz = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Vienna',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d);
    const p = {};
    tz.forEach(({type,value}) => p[type]=value);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  }

  function localToUTC(val) {
    if(!val) return null;
    // val is "YYYY-MM-DDTHH:MM" in Vienna local time
    const [date, time] = val.split('T');
    const [y,m,d] = date.split('-');
    const [h,min] = time.split(':');
    const approx = new Date(`${date}T${time}:00`); // parsed as local browser time
    // Get what Vienna thinks this moment is
    const viennaParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Vienna',
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', hour12:false
    }).formatToParts(approx);
    const vp = {};
    viennaParts.forEach(({type,value}) => vp[type]=value);
    // Difference between what we want and what Vienna shows = correction needed
    const wantMin = +y*525600 + (+m-1)*43800 + +d*1440 + +h*60 + +min;
    const gotMin  = parseInt(vp.year)*525600 + (parseInt(vp.month)-1)*43800 + parseInt(vp.day)*1440 + parseInt(vp.hour)*60 + parseInt(vp.minute);
    const diffMs  = (wantMin - gotMin) * 60000;
    const corrected = new Date(approx.getTime() + diffMs);
    return corrected.toISOString();
  }

  /* ── Init ── */
  async function init() {
    // Load current shift status
    try {
      const d = await apiFetch('/api/shift/current');
      if(d.shift) {
        state.currentShift = d.shift;
        state.openBreak = d.shift.breaks?.find(b=>!b.break_end) || null;
        updateStatusBanner(d.shift);
        updateButtonStates(true, !!state.openBreak);
      } else {
        updateButtonStates(false, false);
      }
    } catch(e) {
      console.error('Status load failed', e);
    }

  }

  function updateStatusBanner(shift) {
    const banner = document.getElementById('statusBanner');
    const sbSender = document.getElementById('sbSender');
    const sbMeta = document.getElementById('sbMeta');
    const types = {'früh':'Frühdienst','nachmittag':'Nachmittagsdienst','nacht':'Nachtdienst'};

    sbSender.innerHTML = `<span class="sb-dot"></span>${shift.station || '—'}`;
    const start = new Date(shift.work_start).toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Vienna'});
    sbMeta.textContent = `${types[shift.shift_type]||shift.shift_type} · seit ${start}`;
    banner.classList.add('visible');
  }

  function updateButtonStates(hasShift, onBreak) {
    const btnStart = document.getElementById('btnStart');
    const btnPauseStart = document.getElementById('btnPauseStart');
    const btnPauseEnd = document.getElementById('btnPauseEnd');
    const btnEnd = document.getElementById('btnEnd');
    const btnSender = document.getElementById('btnSender');

    if(!hasShift) {
      btnStart.classList.remove('disabled');
      btnPauseStart.classList.add('disabled');
      btnPauseEnd.classList.add('disabled');
      btnEnd.classList.add('disabled');
      btnSender.classList.add('disabled');
      // Add badge
      addBadge(btnStart, 'Bereit', 'badge-green');
    } else {
      btnStart.classList.add('disabled');
      btnEnd.classList.remove('disabled');
      btnSender.classList.remove('disabled');
      addBadge(btnEnd, 'Aktiv', 'badge-green');

      if(onBreak) {
        btnPauseStart.classList.add('disabled');
        btnPauseEnd.classList.remove('disabled');
        addBadge(btnPauseEnd, 'Pause läuft', 'badge-orange');
      } else {
        btnPauseStart.classList.remove('disabled');
        btnPauseEnd.classList.add('disabled');
        addBadge(btnPauseStart, 'Bereit', 'badge-green');
      }
    }
  }

  function addBadge(btn, text, cls) {
    const existing = btn.querySelector('.action-badge');
    if(existing) existing.remove();
    const badge = document.createElement('span');
    badge.className = `action-badge ${cls}`;
    badge.textContent = text;
    btn.appendChild(badge);
  }

  /* ── Navigation ── */
  function showForm(action) {
    document.getElementById('mainMenu').style.display = 'none';
    document.querySelectorAll('.form-section').forEach(f => f.classList.remove('active'));
    const form = document.getElementById(`form-${action}`);
    if(form) form.classList.add('active');

    if(action === 'start') {
      const el = document.getElementById('startTime');
      if(el) el.value = toLocalISO(new Date().toISOString()).split('T')[1];
    }
    if(action === 'pause_start') {
      const el = document.getElementById('pauseStartTime');
      if(el) el.value = toLocalISO(new Date().toISOString()).split('T')[1];
    }
    if(action === 'pause_end') {
      const startEl = document.getElementById('pauseEndStartTime');
      const endEl = document.getElementById('pauseEndEndTime');
      if(startEl) startEl.value = state.openBreak ? toLocalISO(state.openBreak.break_start).split('T')[1] : '';
      if(endEl) endEl.value = toLocalISO(new Date().toISOString()).split('T')[1];
    }
    if(action === 'end') {
      const el = document.getElementById('endTime');
      if(el) el.value = toLocalISO(new Date().toISOString()).split('T')[1];
    }

    const titles = {
      start: 'Dienst starten',
      pause_start: 'Pause starten',
      pause_end: 'Pause beenden',
      end: 'Dienst beenden',
      sender: 'Sender ändern'
    };
    document.getElementById('pageTitle').textContent = titles[action] || 'Eingabe';

    // Back button in header
    const back = document.querySelector('.eingabe-back');
    back.onclick = () => showMain();
    back.textContent = 'Eingabe';
  }

  function showMain() {
    document.getElementById('mainMenu').style.display = 'block';
    document.querySelectorAll('.form-section').forEach(f => f.classList.remove('active'));
    document.getElementById('pageTitle').textContent = 'Eingabe';
    const back = document.querySelector('.eingabe-back');
    back.onclick = () => done();
    back.textContent = 'Aktiv';
  }

  /* ── Pill Selection ── */
  function selectPill(el, key) {
    const group = el.closest('.pill-group');
    group.querySelectorAll('.pill').forEach(p => p.classList.remove('selected','green','orange','red'));
    el.classList.add('selected', 'green');
    state[key] = el.dataset.val;
  }

  /* ── Pause Type Multi-Select ── */
  function togglePauseType(el) {
    el.classList.toggle('selected');
    el.classList.toggle('orange');
    const val = el.dataset.val;
    if(el.classList.contains('selected')) {
      state.pauseTypes.push(val);
    } else {
      state.pauseTypes = state.pauseTypes.filter(v => v !== val);
    }
  }

  /* ── Number Adjust ── */
  function adjustNum(type, delta) {
    if(type === 'spicy') {
      state.spicy = Math.max(0, state.spicy + delta);
      document.getElementById('spicyVal').textContent = state.spicy;
    } else {
      state.blend = Math.max(0, state.blend + delta);
      document.getElementById('blendVal').textContent = state.blend;
    }
  }

  /* ── Café Puls Toggle ── */
  function checkCafePuls() {
    const show = state.sender === 'Puls4' && state.shift_type === 'früh';
    document.getElementById('cafePulsGroup').style.display = show ? 'block' : 'none';
    if(!show) state.cafe_puls = false;
  }

  /* ── Dienstart Toggle ── */
  function toggleDienstart(type) {
    state.dienstart = type;
    document.getElementById('duoGroup').style.display        = type === 'duo'          ? 'block' : 'none';
    document.getElementById('schulungGroup').style.display   = type === 'schulung'     ? 'block' : 'none';
    document.getElementById('krankenstandGroup').style.display = type === 'krankenstand' ? 'block' : 'none';
    document.getElementById('anderesGroup').style.display    = type === 'anderes'      ? 'block' : 'none';
  }

  function toggleKrankenstand(type) {
    state.ks_type = type;
    document.getElementById('krankenstandZeit').style.display = type === 'zeitraum' ? 'block' : 'none';
  }

  /* ── API ── */
  async function apiFetch(path, method='GET', body=null) {
    try { return await core.api(path, { method, body }); }
    catch (e) { return { error: e.message }; }
  }

  /* ── Toast ── */
  function showToast(msg, type='') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ── Submit: Dienst starten ── */
  async function submitStart() {
    if(isSubmitting) return;
    if(!state.sender) { showToast('Bitte Sender auswählen', 'error'); return; }
    if(!state.shift_type) { showToast('Bitte Schichttyp auswählen', 'error'); return; }
    isSubmitting = true;

    let notes = null;
    let training_note = null;
    let has_training = false;
    let is_duo = false;

    if(state.dienstart === 'schulung') {
      training_note = document.getElementById('schulungNote').value;
      has_training = true;
    } else if(state.dienstart === 'duo') {
      is_duo = true;
    } else if(state.dienstart === 'krankenstand') {
      const ksNote = document.getElementById('krankenstandNote').value;
      notes = `Krankenstand${ksNote ? ': ' + ksNote : ''}`;
    } else if(state.dienstart === 'anderes') {
      notes = document.getElementById('anderesNote').value;
    }

    const startTimeVal = document.getElementById('startTime')?.value;
    const today = toLocalISO(new Date().toISOString()).split('T')[0];
    const work_start = startTimeVal ? localToUTC(`${today}T${startTimeVal}`) : undefined;

    const payload = {
      shift_type: state.shift_type,
      station: state.sender,
      service_label: `${state.sender} · ${state.shift_type}`,
      is_duo_service: is_duo,
      duo_partner_station: state.sender2 || null,
      has_training,
      training_note,
      notes,
      cafe_puls: state.cafe_puls === 'true' || state.cafe_puls === true,
      work_start,
      source: 'pwa'
    };

    try {
      const d = await apiFetch('/api/shift/start', 'POST', payload);
      if(d.shift) {
        showToast('Dienst gestartet ✓', 'success');
        setTimeout(() => done(), 1200);
      } else {
        showToast(d.error || 'Fehler', 'error');
        isSubmitting = false;
      }
    } catch(e) {
      showToast('Verbindungsfehler', 'error');
      isSubmitting = false;
    }
  }

  /* ── Submit: Pause Start ── */
  async function submitPauseStart() {
    if(isSubmitting) return;
    isSubmitting = true;
    const timeVal = document.getElementById('pauseStartTime')?.value;
    const today = toLocalISO(new Date().toISOString()).split('T')[0];
    const break_start = timeVal ? localToUTC(`${today}T${timeVal}`) : undefined;

    try {
      const d = await apiFetch('/api/break/start', 'POST', { source: 'pwa', break_start });
      if(d.break) {
        showToast('Pause gestartet ✓', 'success');
        setTimeout(() => done(), 1200);
      } else {
        showToast(d.error || 'Fehler', 'error');
        isSubmitting = false;
      }
    } catch(e) {
      showToast('Verbindungsfehler', 'error');
      isSubmitting = false;
    }
  }

  /* ── Submit: Pause Ende ── */
  async function submitPauseEnd() {
    if(isSubmitting) return;
    isSubmitting = true;
    const pauseType = state.pauseTypes.length > 0
      ? state.pauseTypes.join(' + ')
      : 'Pause';
    const notes = document.getElementById('pauseNote')?.value || null;

    const startTime = document.getElementById('pauseEndStartTime')?.value;
    const endTime = document.getElementById('pauseEndEndTime')?.value;
    const baseDate = state.openBreak
      ? toLocalISO(state.openBreak.break_start).split('T')[0]
      : toLocalISO(new Date().toISOString()).split('T')[0];

    let break_start, break_end;
    if(startTime) break_start = localToUTC(`${baseDate}T${startTime}`);
    if(endTime) {
      // Overnight: falls Ende vor Start liegt, Ende auf Folgetag setzen
      let endDate = baseDate;
      if(startTime && endTime < startTime) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + 1);
        endDate = d.toISOString().split('T')[0];
      }
      break_end = localToUTC(`${endDate}T${endTime}`);
    }

    try {
      const d = await apiFetch('/api/break/end', 'POST', {
        zig_spicy: state.spicy,
        zig_blend: state.blend,
        break_type: pauseType,
        notes: notes || undefined,
        break_start,
        break_end,
        source: 'pwa'
      });
      if(d.break) {
        showToast('Pause beendet ✓', 'success');
        setTimeout(() => done(), 1200);
      } else {
        showToast(d.error || 'Fehler', 'error');
        isSubmitting = false;
      }
    } catch(e) {
      showToast('Verbindungsfehler', 'error');
      isSubmitting = false;
    }
  }

  /* ── Submit: Dienst Ende ── */
  async function submitEnd() {
    if(isSubmitting) return;
    isSubmitting = true;
    const notes = document.getElementById('endNotes').value || null;

    const endTimeVal = document.getElementById('endTime')?.value;
    let work_end;
    if(endTimeVal && state.currentShift) {
      const startDate = toLocalISO(state.currentShift.work_start).split('T')[0];
      const startTime = toLocalISO(state.currentShift.work_start).split('T')[1];
      // Overnight: falls Endzeit vor Dienstbeginn-Uhrzeit liegt, Ende auf Folgetag setzen
      let endDate = startDate;
      if(endTimeVal < startTime) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + 1);
        endDate = d.toISOString().split('T')[0];
      }
      work_end = localToUTC(`${endDate}T${endTimeVal}`);
    }

    try {
      const d = await apiFetch('/api/shift/end', 'POST', { notes, work_end, source: 'pwa' });
      if(d.shift) {
        showToast('Dienst beendet ✓', 'success');
        setTimeout(() => done(), 1200);
      } else {
        showToast(d.error || 'Fehler', 'error');
        isSubmitting = false;
      }
    } catch(e) {
      showToast('Verbindungsfehler', 'error');
      isSubmitting = false;
    }
  }

  /* ── Submit: Sender ── */
  async function submitSender() {
    if(isSubmitting) return;
    if(!state.new_sender) { showToast('Bitte Sender auswählen', 'error'); return; }
    isSubmitting = true;
    const payload = {
      station: state.new_sender,
      duo_partner_station: state.new_sender2 || null,
      is_duo_service: !!state.new_sender2,
      corrected_reason: 'Sender nachgereicht'
    };
    try {
      const d = await apiFetch(`/api/shift/${state.currentShift.id}/correct`, 'PATCH', payload);
      if(d.shift) {
        showToast('Sender aktualisiert ✓', 'success');
        setTimeout(() => done(), 1200);
      } else {
        showToast(d.error || 'Fehler', 'error');
        isSubmitting = false;
      }
    } catch(e) {
      showToast('Verbindungsfehler', 'error');
      isSubmitting = false;
    }
  }

  window.WI = { toLocalISO, localToUTC, init, updateStatusBanner, updateButtonStates, addBadge, showForm, showMain, selectPill, togglePauseType, adjustNum, checkCafePuls, toggleDienstart, toggleKrankenstand, apiFetch, showToast, submitStart, submitPauseStart, submitPauseEnd, submitEnd, submitSender };
  root.querySelector(".eingabe-back").onclick = () => done();
  init();
  return {
    dispose() {
      delete window.WI;
      styleEl.remove();
      root.innerHTML = "";
    },
  };
}

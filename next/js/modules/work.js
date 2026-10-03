// work.js — Modul "Work" (Schichten, Pausen, Statistiken).
// Aus worktracker.bensn.me übernommen. Besonderheiten gegenüber der Einzel-App:
//  - Handler in Inline-onclick laufen über window.WT (nur solange gemountet).
//  - Beim Verlassen werden Intervall (alle 30s), Dokument-Listener und das an <body>
//    gehängte Pausen-Overlay aufgeräumt (dispose).
//  - --orange ist nur in diesem Modul Pink-Rot (#FF0051), global bleibt es Orange.
//  - Schichten werden weiter per iOS-Kurzbefehl gestartet/beendet (worktracker.bensn.me/api).

const CSS = `.m-work {
/* ── App Layout ── */

/* ── Navbar ── */

/* ── Tabs ── */
.tab {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .1em;
  padding: 9px 14px;
  cursor: pointer;
  color: var(--muted);
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  transition: color .15s, border-color .15s;
}
.tab.active { color: var(--text); border-bottom-color: var(--text); }
.tab:hover:not(.active) { color: var(--text); }
.tab-section { display: none; } .tab-section.visible { display: block; }

/* ── Shift Row Color Badge ── */
--orange: #FF0051;
.wt-shift-row {
  position: relative;
  overflow: hidden;
}
/* Left color bar — 3px, full height, sits inside border-radius */
.wt-shift-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
  pointer-events: none;
  z-index: 2;
}
.wt-shift-row > * { position: relative; z-index: 1; }
/* Extra left padding so content clears the color bar */
.wt-shift-row { padding-left: 1.75rem; }
.wt-shift-row.typ-frueh::before      { background: #FFB400; box-shadow: 0 0 8px 1px rgba(255,180,0,.45); }
.wt-shift-row.typ-nachmittag::before { background: #F96F5D; box-shadow: 0 0 8px 1px rgba(249,111,93,.45); }
.wt-shift-row.typ-nacht::before      { background: #00A6ED; box-shadow: 0 0 8px 1px rgba(0,166,237,.45); }

/* Prevent text selection on long press */
.wt-shift-row, .wt-table tr {
  -webkit-user-select: none;
  user-select: none;
}
/* Expand arrow */
.expand-arrow { font-size: 9px !important; }

/* Pause table – wider S/B columns */
.wt-table th.col-s, .wt-table td.col-s,
.wt-table th.col-b, .wt-table td.col-b {
  text-align: center;
  width: 28px;
  padding-right: 4px;
}
.wt-table th.col-typ, .wt-table td.col-typ {
  width: 60px;
}

/* ── Stats: Shift-Type Breakdown ── */
.typ-row { margin-bottom: 1rem; }
.typ-row:last-child { margin-bottom: 0; }
.typ-row-head {
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: 'DM Mono', monospace; font-size: 12px; margin-bottom: 4px;
}
.typ-row-name { color: var(--text); font-weight: 500; }
.typ-row-count { color: var(--muted); font-size: 11px; }
.typ-bar-track {
  height: 6px; border-radius: 3px; background: rgba(255,255,255,.06);
  overflow: hidden; margin-bottom: 4px;
}
.typ-bar-fill { height: 100%; border-radius: 3px; transition: width .5s ease; }
.typ-row-meta { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); }

/* ── Stats: Monthly Trend Chart ── */
.stats-chart {
  display: flex; align-items: stretch; gap: 6px;
  height: 150px; padding-top: 1.25rem;
}
.stats-bar-col {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  min-width: 0;
}
.stats-bar-value {
  font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted);
  margin-bottom: 4px; white-space: nowrap;
}
.stats-bar-track {
  flex: 1; width: 100%; max-width: 22px; display: flex; align-items: flex-end;
}
.stats-bar-fill {
  width: 100%; background: var(--green); border-radius: 4px 4px 0 0;
  min-height: 3px; transition: height .5s ease;
}
.stats-bar-label {
  font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted);
  margin-top: 6px; letter-spacing: .04em;
}
}
`;

const TEMPLATE = `<div class="subnav"><div class="tabs">
    <button class="tab active" onclick="WT.switchTab('aktiv',this)">Aktiv</button>
    <button class="tab" onclick="WT.switchTab('schichten',this)">Schichten</button>
    <button class="tab" onclick="WT.switchTab('stats',this)">Stats</button>
    <a class="tab" href="https://worktracker.bensn.me/eingabe" style="margin-left:auto;text-decoration:none;color:var(--accent-blue);border-bottom-color:transparent">+ Eingabe</a>
  </div></div>

  <div id="tab-aktiv" class="tab-section visible">
    <div id="activeContent"><div class="state-msg">Daten werden geladen…</div></div>
  </div>

  <div id="tab-schichten" class="tab-section">
    <div id="shiftsList"><div class="state-msg">Schichten werden geladen…</div></div>
  </div>

  <div id="tab-stats" class="tab-section">
    <div id="statsContent"><div class="state-msg">Statistik wird geladen…</div></div>
`;

function build(core, root) {

  // Doppel-Submit-Schutz: verhindert doppelt angelegte Pausen bei Doppel-Tap
  // oder langsamer Verbindung (Ursache historischer Duplikate)
  let isSubmitting = false;

  function pad(n){return String(n).padStart(2,'0')}

  /* ── Tabs ── */
  function switchTab(t,el){
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('tab-aktiv').classList.toggle('visible',t==='aktiv');
    document.getElementById('tab-schichten').classList.toggle('visible',t==='schichten');
    document.getElementById('tab-stats').classList.toggle('visible',t==='stats');
    if(t==='schichten') loadShifts();
    if(t==='stats' && !statsLoaded) loadStats();
  }

  /* ── Helpers ── */
  function fmtTime(iso){
    if(!iso) return '—';
    return new Date(iso).toLocaleTimeString('de-AT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Vienna'});
  }
  function fmtDuration(min){
    if(!min&&min!==0) return '—';
    if(min<60) return min+' min';
    return Math.floor(min/60)+'h '+(min%60)+'m';
  }
  function fmtDate(iso){
    if(!iso) return '—';
    const d=new Date(iso),t=new Date();
    const diff=Math.floor((t-d)/86400000);
    if(diff===0) return 'Heute';
    if(diff===1) return 'Gestern';
    return pad(d.getDate())+'.'+pad(d.getMonth()+1);
  }
  function schichtTyp(t){return({'früh':'Frühdienst','nachmittag':'Nachmittagsdienst','nacht':'Nachtdienst'}[t]||t||'—')}

  /* ── API ── */
  const apiFetch = (path, method='GET', body=null) => core.api(path, { method, body });

  /* ── Pause Type Icons (inline SVG) ── */
  const ICONS = {
    rauchen:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.45;vertical-align:middle"><path d="M2 16h14v3H2z"/><path d="M18 16h4v3h-4z"/><path d="M18 8c0-2.5 2-2.5 2-5"/><path d="M14 8c0-2.5 2-2.5 2-5"/></svg>`,
    wc:        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.45;vertical-align:middle"><path d="M12 2a3 3 0 100 6 3 3 0 000-6z"/><path d="M7 22V12a5 5 0 0110 0v10"/><path d="M7 17h10"/></svg>`,
    einkaufen: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.45;vertical-align:middle"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
    essen:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.45;vertical-align:middle"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3M10 1v3M14 1v3"/></svg>`,
    sonstiges: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.45;vertical-align:middle"><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>`,
  };

  function pauseIcons(type) {
    if(!type) return ICONS.sonstiges;
    const t = type.toLowerCase();
    const result = [];
    if(t.includes('rauchen'))   result.push(ICONS.rauchen);
    if(t.includes('wc'))        result.push(ICONS.wc);
    if(t.includes('einkaufen')) result.push(ICONS.einkaufen);
    if(t.includes('essen'))     result.push(ICONS.essen);
    if(!result.length)          result.push(ICONS.sonstiges);
    return result.join('');
  }

  /* ── Render Active ── */
  function renderActive(data){
    const container=document.getElementById('activeContent');

    if(!data||!data.shift){
      container.innerHTML='<div class="state-msg">Kein aktiver Dienst.<br><span style="font-size:11px">Starte einen Dienst über den iPhone-Shortcut.</span></div>';
      return;
    }

    const s=data.shift, breaks=s.breaks||[], isActive=!s.work_end;

    const totalPauseMin=breaks.filter(b=>b.break_end).reduce((a,b)=>a+Math.round((new Date(b.break_end)-new Date(b.break_start))/60000),0);
    const nettoMin=Math.round(((s.work_end?new Date(s.work_end):new Date())-new Date(s.work_start))/60000)-totalPauseMin;
    const cigSpicy=breaks.reduce((a,b)=>a+(b.zig_spicy||0),0);
    const cigBlend=breaks.reduce((a,b)=>a+(b.zig_blend||0),0);
    const cigTotal=cigSpicy+cigBlend;

    const activePause=breaks.find(b=>!b.break_end);
    const lastBreak=breaks.filter(b=>b.break_end).slice(-1)[0];
    let pauseBar='';
    if(activePause) pauseBar=`<div class="wt-pause-bar" style="color:var(--orange)">● Pause aktiv seit ${fmtTime(activePause.break_start)}</div>`;
    else if(lastBreak) pauseBar=`<div class="wt-pause-bar">Pause inaktiv · Letzte: ${fmtTime(lastBreak.break_start)}–${fmtTime(lastBreak.break_end)}</div>`;

    const breakRows=breaks.length===0
      ?'<tr><td colspan="6" style="text-align:center;padding:12px 0;color:var(--muted)">Noch keine Pausen</td></tr>'
      :breaks.map(b=>{
        const dur=b.break_end?Math.round((new Date(b.break_end)-new Date(b.break_start))/60000):null;
        const sc=b.zig_spicy||0, bc=b.zig_blend||0;
        const hasNote=b.notes&&b.notes.trim();
        const row=`<tr id="active-brow-${b.id}" style="cursor:pointer" title="Lang drücken zum Bearbeiten">
          <td>${fmtTime(b.break_start)}</td>
          <td>${b.break_end?fmtTime(b.break_end):'<span style="color:var(--orange)">aktiv</span>'}</td>
          <td>${dur!==null?dur+' min':'—'}</td>
          <td class="col-typ">${pauseIcons(b.break_type)}${hasNote?'<span style="color:var(--accent-blue);margin-left:3px;font-size:10px">●</span>':''}</td>
          <td class="col-s">${sc>0?`<span style="color:var(--orange);font-weight:500">${sc}</span>`:'<span style="color:rgba(255,255,255,.15)">—</span>'}</td>
          <td class="col-b">${bc>0?`<span style="color:var(--accent-blue);font-weight:500">${bc}</span>`:'<span style="color:rgba(255,255,255,.15)">—</span>'}</td>
        </tr>`;
        const noteRow=hasNote?`<tr><td colspan="6" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);padding-bottom:8px;padding-top:2px">↳ ${b.notes}</td></tr>`:'';
        return row+noteRow;
      }).join('');

    container.innerHTML=`
      <div class="wt-card">
        <div class="wt-card-header">
          <div>
            <div class="wt-sender">${s.station||'—'}${s.duo_partner_station?` · ${s.duo_partner_station}`:''}</div>
            <div class="wt-type">${schichtTyp(s.shift_type)}</div>
          </div>
          <div class="wt-badge ${isActive?'':'off'}">${isActive?'● Aktiv':'Beendet'}</div>
        </div>
        <div class="wt-stats">
          <div class="wt-stat"><div class="wt-stat-val" style="color:var(--accent-blue)">${fmtTime(s.work_start)}</div><div class="wt-stat-label">Beginn</div></div>
          <div class="wt-stat"><div class="wt-stat-val" style="color:var(--green)">${fmtDuration(nettoMin)}</div><div class="wt-stat-label">Netto</div></div>
          <div class="wt-stat"><div class="wt-stat-val" style="color:var(--orange)">${totalPauseMin>0?totalPauseMin+' min':'—'}</div><div class="wt-stat-label">Gesamtpause</div></div>
          <div class="wt-stat"><div class="wt-stat-val">${cigTotal}</div><div class="wt-stat-label">Zigaretten</div></div>
        </div>
        <div class="wt-label">Pausen</div>
        <table class="wt-table">
          <thead><tr>
            <th>Von</th><th>Bis</th><th>Dauer</th><th class="col-typ"></th>
            <th class="col-s">S</th><th class="col-b">B</th>
          </tr></thead>
          <tbody>${breakRows}</tbody>
        </table>
        ${pauseBar}
        <div class="wt-divider"></div>
        <div class="wt-label">Zigaretten (Dienst gesamt)</div>
        <div class="wt-cigs">
          <div class="wt-cig"><div class="wt-cig-num" style="color:${cigSpicy>0?'var(--orange)':'rgba(255,255,255,.15)'}">${cigSpicy}</div><div class="wt-cig-label">Spicy</div></div>
          <div class="wt-cig"><div class="wt-cig-num" style="color:${cigBlend>0?'var(--accent-blue)':'rgba(255,255,255,.15)'}">${cigBlend}</div><div class="wt-cig-label">Blend</div></div>
          <div class="wt-cig"><div class="wt-cig-num">${cigTotal}</div><div class="wt-cig-label">Gesamt</div></div>
        </div>
      </div>`;

    breaks.forEach(b=>{
      const rowEl=document.getElementById(`active-brow-${b.id}`);
      if(rowEl) setupBreakLongPress(rowEl, b.id, s.id);
    });
  }

  /* ── Render Shifts ── */
  function renderShifts(shifts){
    const list=document.getElementById('shiftsList');
    if(!shifts||shifts.length===0){list.innerHTML='<div class="state-msg">Noch keine Schichten vorhanden.</div>';return;}
    list.innerHTML='';

    // Shift type colors: früh=yellow, nachmittag=orange, nacht=blue
    const shiftColors = {
      'früh':       'rgba(250,204,21,0.08)',
      'nachmittag': 'rgba(232,114,74,0.08)',
      'nacht':      'rgba(0,166,237,0.08)'
    };
    const shiftBorders = {
      'früh':       'rgba(250,204,21,0.35)',
      'nachmittag': 'rgba(232,114,74,0.35)',
      'nacht':      'rgba(0,166,237,0.35)'
    };

    const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    let lastMonthKey = null;
    let animIdx = 0;
    let currentBody = null;
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${now.getMonth()}`;

    shifts.forEach((s,i)=>{
      // ── Month header (collapsible) ──
      const d = new Date(s.work_start);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      if(monthKey !== lastMonthKey){
        lastMonthKey = monthKey;
        const isOpen = monthKey === nowKey;

        const group = document.createElement('div');
        group.className = 'month-group';

        const hdr = document.createElement('div');
        hdr.className = 'month-header';
        hdr.style.cssText="display:flex;align-items:center;gap:.5rem;cursor:pointer;-webkit-tap-highlight-color:transparent;font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;color:var(--text);margin:1.75rem 0 .75rem;opacity:0;transition:opacity .4s ease;user-select:none";
        hdr.innerHTML = `<span class="month-arrow" style="font-size:.8rem;color:var(--muted);display:inline-block;transition:transform .2s;transform:rotate(${isOpen?0:-90}deg)">▼</span><span>${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}</span>`;

        const body = document.createElement('div');
        body.className = 'month-body';
        body.style.display = isOpen ? 'block' : 'none';

        hdr.addEventListener('click', ()=>{
          const open = body.style.display !== 'none';
          body.style.display = open ? 'none' : 'block';
          hdr.querySelector('.month-arrow').style.transform = `rotate(${open?-90:0}deg)`;
        });

        group.appendChild(hdr);
        group.appendChild(body);
        list.appendChild(group);
        setTimeout(()=>hdr.style.opacity='1', 80 + animIdx*80);
        animIdx++;
        currentBody = body;
      }

      const isActive=!s.work_end;
      const grossMin=s.work_end?Math.round((new Date(s.work_end)-new Date(s.work_start))/60000):null;
      const nettoMin=grossMin!==null?grossMin-(s.total_break_minutes||0):null;
      const cigTotal=s.zig_total||0;
      const stationLabel=s.station+(s.duo_partner_station?` · ${s.duo_partner_station}`:'');
      const borderColor = shiftBorders[s.shift_type] || 'var(--border)';
      const typClass = {'früh':'typ-frueh','nachmittag':'typ-nachmittag','nacht':'typ-nacht'}[s.shift_type] || '';

      const el=document.createElement('div');
      el.className='wt-shift-row ' + typClass;
      el.dataset.shiftId = s.id;
      el.style.cssText=`opacity:0;transform:translateY(12px);transition:opacity .5s ease,transform .5s ease;border-color:${borderColor};background:var(--surface)`;

      el.innerHTML=`
        <div class="wt-shift-dot ${isActive?'active':''}"></div>
        <div style="min-width:0">
          <div class="wt-shift-sender">${stationLabel}</div>
          <div class="wt-shift-meta">${fmtDate(s.work_start)} · ${schichtTyp(s.shift_type)} · ${fmtTime(s.work_start)} → ${fmtTime(s.work_end)}</div>
          ${cigTotal>0?`<span class="tag">${cigTotal} Zig.</span>`:''}
          ${(s.total_break_minutes||0)>0?`<span class="tag">${s.total_break_minutes} min Pause</span>`:''}
          ${s.notes?`<span class="tag" style="color:var(--accent-blue)">Notiz</span>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="wt-shift-netto">Netto ${nettoMin!==null?fmtDuration(nettoMin):'—'}</div>
          <div class="wt-shift-meta">Brutto ${grossMin!==null?fmtDuration(grossMin):'—'}</div>
          <div class="wt-shift-status" style="color:${isActive?'var(--green)':'var(--muted)'}">${isActive?'aktiv':'abgeschlossen'}</div>
          <div class="expand-arrow" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);margin-top:4px">▼</div>
        </div>
        <div class="shift-detail" style="display:none;grid-column:1/-1;border-top:1px solid var(--border);padding-top:1rem;margin-top:.5rem">
          <div id="detail-${s.id}"><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);text-align:center;padding:.5rem">Laden…</div></div>
        </div>`;

      el.style.cursor='pointer';
      el.addEventListener('click', (e)=>{
        if(e.target.closest('.shift-detail')) return;
        toggleShiftDetail(el, s.id);
      });
      currentBody.appendChild(el);
      setTimeout(()=>{el.style.opacity='1';el.style.transform='none';},100+animIdx*80);
      animIdx++;
    });
  }

  async function toggleShiftDetail(el, shiftId){
    const detail=el.querySelector('.shift-detail');
    const arrow=el.querySelector('.expand-arrow');
    const isOpen=detail.style.display!=='none';

    if(isOpen){
      detail.style.display='none';
      arrow.textContent='▼';
      return;
    }

    detail.style.display='block';
    arrow.textContent='▲';

    // Load breaks for this shift
    try{
      const data=await apiFetch(`/api/shift/${shiftId}`);
      const breaks=data.breaks||[];
      const container=document.getElementById(`detail-${shiftId}`);

      let html='';

      // Café Puls
      if(data.cafe_puls) {
        html+=`<div style="font-family:'DM Mono',monospace;font-size:11px;margin-bottom:.75rem">
          <span style="background:rgba(0,166,237,.1);border:1px solid rgba(0,166,237,.2);color:var(--accent-blue);padding:3px 8px;border-radius:4px;font-size:10px;letter-spacing:.06em">CAFÉ PULS</span>
        </div>`;
      }

      // Notes
      if(data.notes){
        html+=`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);margin-bottom:.75rem">
          <span style="letter-spacing:.08em;text-transform:uppercase;font-size:9px">Anmerkung</span><br>
          <span style="color:var(--text)">${data.notes}</span>
        </div>`;
      }

      // Duo partner
      if(data.duo_partner_station){
        html+=`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);margin-bottom:.75rem">
          <span style="letter-spacing:.08em;text-transform:uppercase;font-size:9px">Zweiter Sender</span><br>
          <span style="color:var(--text)">${data.duo_partner_station}</span>
        </div>`;
      }

      // Breaks table
      if(breaks.length===0){
        html+=`<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);text-align:center;padding:.5rem">Keine Pausen</div>`;
      } else {
        html+=`<table class="wt-table" style="margin-bottom:.5rem">
          <thead><tr><th>Von</th><th>Bis</th><th>Dauer</th><th class="col-typ"></th><th class="col-s">S</th><th class="col-b">B</th></tr></thead>
          <tbody>`;
        breaks.forEach(b=>{
          const dur=b.break_end?Math.round((new Date(b.break_end)-new Date(b.break_start))/60000):null;
          const sc=b.zig_spicy||0,bc=b.zig_blend||0;
          const hasNote = b.notes && b.notes.trim();
          const rowId = `brow-${b.id}`;
          html+=`<tr id="${rowId}" style="cursor:pointer" title="Lang drücken zum Bearbeiten">
            <td>${fmtTime(b.break_start)}</td>
            <td>${b.break_end?fmtTime(b.break_end):'aktiv'}</td>
            <td>${dur!==null?dur+' min':'—'}</td>
            <td class="col-typ">${pauseIcons(b.break_type)}${hasNote?'<span style="color:var(--accent-blue);margin-left:3px;font-size:10px">●</span>':''}</td>
            <td class="col-s">${sc>0?`<span style="color:var(--orange);font-weight:500">${sc}</span>`:'<span style="color:rgba(255,255,255,.15)">—</span>'}</td>
            <td class="col-b">${bc>0?`<span style="color:var(--accent-blue);font-weight:500">${bc}</span>`:'<span style="color:rgba(255,255,255,.15)">—</span>'}</td>
          </tr>`;
          if(hasNote){
            html+=`<tr><td colspan="6" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);padding-bottom:8px;padding-top:2px">↳ ${b.notes}</td></tr>`;
          }
          // Setup long press after render
          setTimeout(()=>{
            const rowEl = document.getElementById(rowId);
            if(rowEl) setupBreakLongPress(rowEl, b.id, shiftId);
          }, 50);
        });
        html+=`</tbody></table>`;
      }

      container.innerHTML=html+`
        <div class="wt-divider" style="margin:.75rem 0"></div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.75rem">
          <button class="btn-pill" onclick="event.stopPropagation();WT.toggleEditForm('${shiftId}')" id="edit-btn-${shiftId}">Bearbeiten</button>
          <button class="btn-pill green" onclick="event.stopPropagation();WT.openAddBreak('${shiftId}','${WT.toLocalISO(data.work_start).split('T')[0]}')">+ Pause</button>
        </div>

        <div id="edit-${shiftId}" style="display:none;margin-top:.5rem" onclick="event.stopPropagation()">

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem">
            <div>
              <div class="wt-label" style="margin-bottom:4px">Beginn Datum</div>
              <input id="edit-start-date-${shiftId}" type="date" value="${toLocalISO(data.work_start).split('T')[0]}"
                style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:11px;outline:none">
            </div>
            <div>
              <div class="wt-label" style="margin-bottom:4px">Beginn Zeit</div>
              <input id="edit-start-time-${shiftId}" type="time" value="${toLocalISO(data.work_start).split('T')[1]}"
                style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem">
            <div>
              <div class="wt-label" style="margin-bottom:4px">Ende Datum</div>
              <input id="edit-end-date-${shiftId}" type="date" value="${data.work_end?toLocalISO(data.work_end).split('T')[0]:''}"
                style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:11px;outline:none">
            </div>
            <div>
              <div class="wt-label" style="margin-bottom:4px">Ende Zeit</div>
              <input id="edit-end-time-${shiftId}" type="time" value="${data.work_end?toLocalISO(data.work_end).split('T')[1]:''}"
                style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none">
            </div>
          </div>

          <div style="margin-bottom:.75rem">
            <div class="wt-label" style="margin-bottom:4px">Station</div>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem" id="edit-station-${shiftId}">
              ${['Puls4','ATV/ATV2','ATV','ATV2','Puls24'].map(s=>`
                <div onclick="event.stopPropagation();WT.selectEditStation('${shiftId}','${s}')" data-val="${s}" data-active="${data.station===s?'1':''}" 
                  style="font-family:'DM Mono',monospace;font-size:11px;padding:6px 12px;border-radius:6px;border:1px solid ${data.station===s?'var(--accent-blue)':'var(--border)'};color:${data.station===s?'var(--accent-blue)':'var(--muted)'};background:${data.station===s?'rgba(0,166,237,.08)':'none'};cursor:pointer;transition:all .15s">${s}</div>
              `).join('')}
            </div>
          </div>

          <div style="margin-bottom:.75rem">
            <div class="wt-label" style="margin-bottom:4px">Schichttyp</div>
            <div style="display:flex;gap:.4rem" id="edit-type-${shiftId}">
              ${[['früh','Früh'],['nachmittag','Nachmittag'],['nacht','Nacht']].map(([v,l])=>`
                <div onclick="event.stopPropagation();WT.selectEditType('${shiftId}','${v}')" data-val="${v}" data-active="${data.shift_type===v?'1':''}"
                  style="font-family:'DM Mono',monospace;font-size:11px;padding:6px 12px;border-radius:6px;border:1px solid ${data.shift_type===v?'var(--accent-blue)':'var(--border)'};color:${data.shift_type===v?'var(--accent-blue)':'var(--muted)'};background:${data.shift_type===v?'rgba(0,166,237,.08)':'none'};cursor:pointer;transition:all .15s">${l}</div>
              `).join('')}
            </div>
          </div>

          <div style="margin-bottom:.75rem">
            <div class="wt-label" style="margin-bottom:4px">Café Puls</div>
            <div style="display:flex;gap:.4rem">
              <div onclick="event.stopPropagation();WT.selectEditCafePuls('${shiftId}',true)" id="cp-yes-${shiftId}" data-active="${data.cafe_puls?'1':''}"
                style="font-family:'DM Mono',monospace;font-size:11px;padding:6px 12px;border-radius:6px;border:1px solid ${data.cafe_puls?'var(--accent-blue)':'var(--border)'};color:${data.cafe_puls?'var(--accent-blue)':'var(--muted)'};background:${data.cafe_puls?'rgba(0,166,237,.08)':'none'};cursor:pointer;transition:all .15s">Ja</div>
              <div onclick="event.stopPropagation();WT.selectEditCafePuls('${shiftId}',false)" id="cp-no-${shiftId}" data-active="${!data.cafe_puls?'1':''}"
                style="font-family:'DM Mono',monospace;font-size:11px;padding:6px 12px;border-radius:6px;border:1px solid ${!data.cafe_puls?'var(--accent-blue)':'var(--border)'};color:${!data.cafe_puls?'var(--accent-blue)':'var(--muted)'};background:${!data.cafe_puls?'rgba(0,166,237,.08)':'none'};cursor:pointer;transition:all .15s">Nein</div>
            </div>
          </div>

          <div style="margin-bottom:1rem">
            <div class="wt-label" style="margin-bottom:4px">Anmerkung</div>
            <input id="edit-notes-${shiftId}" type="text" value="${data.notes||''}" placeholder="Optional…"
              style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:11px;outline:none">
          </div>

          <div style="display:flex;gap:.5rem;margin-top:.5rem">
            <button onclick="event.stopPropagation();WT.saveEdit('${shiftId}')"
              style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.06em;background:var(--green);color:#0a0a0b;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:500">Speichern</button>
            <button onclick="event.stopPropagation();WT.toggleEditForm('${shiftId}')"
              style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.06em;background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:8px 16px;cursor:pointer">Abbrechen</button>
            <button class="btn-pill red" style="margin-left:auto" onclick="event.stopPropagation();WT.deleteShift('${shiftId}',event)">Löschen</button>
          </div>
          <div id="edit-msg-${shiftId}" style="font-family:'DM Mono',monospace;font-size:11px;margin-top:.5rem"></div>

        </div>`;
    }catch(e){
      document.getElementById(`detail-${shiftId}`).innerHTML=
        `<div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--accent-red)">Fehler: ${e.message}</div>`;
    }
  }

  /* ── Time Input Auto-Format ── */
  function fmtTimeInput(el) {
    let v = el.value.replace(/[^0-9]/g, '');
    if(v.length >= 3) v = v.slice(0,2) + ':' + v.slice(2,4);
    el.value = v;
  }

  /* ── Edit Helpers ── */
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
    // Parse as Vienna time by appending a dummy Vienna offset string and using Date
    // We use Intl to find the actual UTC offset for this moment in Vienna
    const [date, time] = val.split('T');
    const [y,m,d] = date.split('-');
    const [h,min] = time.split(':');
    // Build a date string that JS can parse as local, then correct for Vienna tz
    // Strategy: iterate to find correct offset (handles DST)
    const approx = new Date(`${date}T${time}:00`); // parsed as local browser time
    // Get what Vienna thinks this moment is
    const viennaParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Vienna',
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', hour12:false
    }).formatToParts(approx);
    const vp = {};
    viennaParts.forEach(({type,value}) => vp[type]=value);
    const viennaISO = `${vp.year}-${vp.month}-${vp.day}T${vp.hour}:${vp.minute}`;
    // Difference between what we want and what Vienna shows = correction needed
    const wantMin = +y*525600 + (+m-1)*43800 + +d*1440 + +h*60 + +min;
    const gotMin  = parseInt(vp.year)*525600 + (parseInt(vp.month)-1)*43800 + parseInt(vp.day)*1440 + parseInt(vp.hour)*60 + parseInt(vp.minute);
    const diffMs  = (wantMin - gotMin) * 60000;
    const corrected = new Date(approx.getTime() + diffMs);
    return corrected.toISOString();
  }

  function toggleEditForm(shiftId) {
    const form = document.getElementById(`edit-${shiftId}`);
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  }

  function selectEditCafePuls(shiftId, val) {
    const yes = document.getElementById(`cp-yes-${shiftId}`);
    const no  = document.getElementById(`cp-no-${shiftId}`);
    [yes, no].forEach(el => {
      const active = (el.id.includes('yes') && val) || (el.id.includes('no') && !val);
      el.dataset.active = active ? '1' : '';
      el.style.borderColor = active ? 'var(--accent-blue)' : 'var(--border)';
      el.style.color       = active ? 'var(--accent-blue)' : 'var(--muted)';
      el.style.background  = active ? 'rgba(0,166,237,.08)' : 'none';
    });
  }

  function selectEditStation(shiftId, val) {
    document.querySelectorAll(`#edit-station-${shiftId} div`).forEach(el => {
      const active = el.dataset.val === val;
      el.dataset.active = active ? '1' : '';
      el.style.borderColor = active ? 'var(--accent-blue)' : 'var(--border)';
      el.style.color = active ? 'var(--accent-blue)' : 'var(--muted)';
      el.style.background = active ? 'rgba(0,166,237,.08)' : 'none';
    });
  }

  function selectEditType(shiftId, val) {
    document.querySelectorAll(`#edit-type-${shiftId} div`).forEach(el => {
      const active = el.dataset.val === val;
      el.dataset.active = active ? '1' : '';
      el.style.borderColor = active ? 'var(--accent-blue)' : 'var(--border)';
      el.style.color = active ? 'var(--accent-blue)' : 'var(--muted)';
      el.style.background = active ? 'rgba(0,166,237,.08)' : 'none';
    });
  }

  async function saveEdit(shiftId) {
    const startDate = document.getElementById(`edit-start-date-${shiftId}`)?.value;
    const startTime = document.getElementById(`edit-start-time-${shiftId}`)?.value;
    const endDate   = document.getElementById(`edit-end-date-${shiftId}`)?.value;
    const endTime   = document.getElementById(`edit-end-time-${shiftId}`)?.value;
    const notesVal  = document.getElementById(`edit-notes-${shiftId}`)?.value;
    const station   = document.querySelector(`#edit-station-${shiftId} div[data-active="1"]`)?.dataset.val;
    const shiftType = document.querySelector(`#edit-type-${shiftId} div[data-active="1"]`)?.dataset.val;
    const msg = document.getElementById(`edit-msg-${shiftId}`);

    const payload = { corrected_reason: 'Manuelle Korrektur' };
    if(startDate && startTime) payload.work_start = localToUTC(`${startDate}T${startTime}`);
    if(endDate && endTime) {
      // Auto-fix overnight: if end time < start time, end date = start date + 1
      let resolvedEndDate = endDate;
      if(startTime && endTime && endTime < startTime && startDate === endDate) {
        const d = new Date(endDate);
        d.setDate(d.getDate() + 1);
        resolvedEndDate = d.toISOString().split('T')[0];
      }
      payload.work_end = localToUTC(`${resolvedEndDate}T${endTime}`);
    }
    if(station)    payload.station    = station;
    if(shiftType)  payload.shift_type = shiftType;
    payload.notes = notesVal || null;
    const cpYes = document.getElementById(`cp-yes-${shiftId}`);
    if(cpYes) payload.cafe_puls = cpYes.dataset.active === '1';

    try {
      const d = await apiFetch(`/api/shift/${shiftId}/correct`, 'PATCH', payload);
      if(d.shift) {
        msg.style.color = 'var(--green)';
        msg.textContent = '✓ Gespeichert';
        setTimeout(() => { toggleEditForm(shiftId); loadShifts(); }, 800);
      } else {
        msg.style.color = 'var(--accent-red)';
        msg.textContent = d.error || 'Fehler';
      }
    } catch(e) {
      msg.style.color = 'var(--accent-red)';
      msg.textContent = 'Verbindungsfehler: ' + e.message;
    }
  }

  /* ── Add Break ── */
  function openAddBreak(shiftId, baseDate) {
    document.getElementById('break-edit-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'break-edit-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;display:flex;align-items:flex-end;justify-content:center;';
    overlay.innerHTML = `
      <div onclick="event.stopPropagation()" style="background:#161616;border:1px solid rgba(255,255,255,.12);border-radius:16px 16px 0 0;padding:1.5rem 1.25rem 2rem;width:100%;max-width:480px;">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem">Pause hinzufügen</div>

        <div style="margin-bottom:.75rem">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Datum</div>
          <input id="ab-date" type="date" value="${baseDate}"
            style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:11px;outline:none">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Von</div>
            <input id="ab-start" type="time" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none">
          </div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Bis</div>
            <input id="ab-end" type="time" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none">
          </div>
        </div>

        <div style="margin-bottom:.75rem">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Typ</div>
          <div style="display:flex;flex-wrap:wrap;gap:.4rem" id="ab-types">
            ${['Rauchen','WC','Einkaufen','Essen','Sonstiges'].map(t=>`
              <div onclick="WT.toggleAbType(this,'${t}')" data-val="${t}"
                style="font-family:'DM Mono',monospace;font-size:11px;padding:5px 11px;border-radius:6px;border:1px solid var(--border);color:var(--muted);cursor:pointer;transition:all .15s">${t}</div>
            `).join('')}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Spicy</div>
            <div style="display:flex;align-items:center;gap:.5rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 10px">
              <button onclick="WT.adjustAB('spicy',-1)" style="width:28px;height:28px;border-radius:5px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);font-size:1rem;cursor:pointer">−</button>
              <span id="ab-spicy" style="font-family:'DM Mono',monospace;font-size:1.1rem;flex:1;text-align:center">0</span>
              <button onclick="WT.adjustAB('spicy',1)" style="width:28px;height:28px;border-radius:5px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);font-size:1rem;cursor:pointer">+</button>
            </div>
          </div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Blend</div>
            <div style="display:flex;align-items:center;gap:.5rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 10px">
              <button onclick="WT.adjustAB('blend',-1)" style="width:28px;height:28px;border-radius:5px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);font-size:1rem;cursor:pointer">−</button>
              <span id="ab-blend" style="font-family:'DM Mono',monospace;font-size:1.1rem;flex:1;text-align:center">0</span>
              <button onclick="WT.adjustAB('blend',1)" style="width:28px;height:28px;border-radius:5px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);font-size:1rem;cursor:pointer">+</button>
            </div>
          </div>
        </div>

        <div style="margin-bottom:1rem">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Notiz</div>
          <input id="ab-notes" type="text" placeholder="Optional…" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none">
        </div>

        <div style="display:flex;gap:.5rem">
          <button onclick="WT.submitAddBreak('${shiftId}','${baseDate}')" style="flex:1;font-family:'DM Mono',monospace;font-size:11px;background:var(--green);color:#0a0a0b;border:none;border-radius:8px;padding:10px;cursor:pointer;font-weight:500">Hinzufügen</button>
          <button onclick="document.getElementById('break-edit-overlay').remove()" style="font-family:'DM Mono',monospace;font-size:11px;background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:10px 16px;cursor:pointer">Abbrechen</button>
        </div>
        <div id="ab-msg" style="font-family:'DM Mono',monospace;font-size:11px;margin-top:.5rem;text-align:center"></div>
      </div>`;

    overlay.addEventListener('click', () => overlay.remove());
    root.appendChild(overlay);   // im Modul-Container (nicht <body>), damit Modul-Styles greifen
  }

  function toggleAbType(el, val) {
    const active = el.dataset.active === '1';
    el.dataset.active = active ? '' : '1';
    el.style.borderColor = active ? '' : 'var(--accent-blue)';
    el.style.color = active ? '' : 'var(--accent-blue)';
    el.style.background = active ? '' : 'rgba(0,166,237,.08)';
  }

  function adjustAB(type, delta) {
    const el = document.getElementById(`ab-${type}`);
    el.textContent = Math.max(0, parseInt(el.textContent) + delta);
  }

  async function submitAddBreak(shiftId, baseDateFallback) {
    if(isSubmitting) return;
    const baseDate  = document.getElementById('ab-date')?.value || baseDateFallback;
    const startTime = document.getElementById('ab-start').value;
    const endTime   = document.getElementById('ab-end').value;
    const spicy     = parseInt(document.getElementById('ab-spicy').textContent) || 0;
    const blend     = parseInt(document.getElementById('ab-blend').textContent) || 0;
    const notes     = document.getElementById('ab-notes').value || null;
    const msg       = document.getElementById('ab-msg');

    if(!startTime) { msg.style.color='var(--accent-red)'; msg.textContent='Bitte Startzeit angeben'; return; }

    const selectedTypes = [...document.querySelectorAll('#ab-types div')]
      .filter(el => el.dataset.active === '1')
      .map(el => el.dataset.val);
    const breakType = selectedTypes.length > 0 ? selectedTypes.join(' + ') : 'Pause';
    isSubmitting = true;

    // Handle overnight: if end < start, end is next day
    let endDate = baseDate;
    if(endTime && endTime < startTime) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + 1);
      endDate = d.toISOString().split('T')[0];
    }

    const payload = {
      shift_id: shiftId,
      break_start: localToUTC(`${baseDate}T${startTime}`),
      break_end: endTime ? localToUTC(`${endDate}T${endTime}`) : null,
      break_type: breakType,
      zig_spicy: spicy,
      zig_blend: blend,
      notes,
      source: 'pwa'
    };

    try {
      const d = await apiFetch('/api/break/add', 'POST', payload);
      if(d.break) {
        msg.style.color = 'var(--green)';
        msg.textContent = '✓ Pause hinzugefügt';
        setTimeout(() => {
          document.getElementById('break-edit-overlay')?.remove();
          shiftsLoaded=false;
          loadShifts();
          loadActive();
          isSubmitting = false;
        }, 700);
      } else {
        msg.style.color = 'var(--accent-red)';
        msg.textContent = d.error || 'Fehler';
        isSubmitting = false;
      }
    } catch(e) {
      msg.style.color = 'var(--accent-red)';
      msg.textContent = 'Verbindungsfehler';
      isSubmitting = false;
    }
  }

  /* ── Pause Edit (long press) ── */
  let pressTimer = null;

  function setupBreakLongPress(el, breakId, shiftId) {
    el.addEventListener('pointerdown', () => {
      pressTimer = setTimeout(() => openBreakEdit(breakId, shiftId), 600);
    });
    ['pointerup','pointercancel','pointermove'].forEach(ev =>
      el.addEventListener(ev, () => clearTimeout(pressTimer))
    );
  }

  function openBreakEdit(breakId, shiftId) {
    // Remove existing overlay if any
    document.getElementById('break-edit-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'break-edit-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;
      display:flex;align-items:flex-end;justify-content:center;
    `;
    overlay.innerHTML = `
      <div onclick="event.stopPropagation()" style="
        background:#161616;border:1px solid rgba(255,255,255,.12);
        border-radius:16px 16px 0 0;padding:1.5rem 1.25rem 2rem;
        width:100%;max-width:480px;
      ">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem">Pause bearbeiten</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem">
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Von</div>
            <input id="be-start" type="time"
              style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none">
          </div>
          <div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Bis</div>
            <input id="be-end" type="time"
              style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none">
          </div>
        </div>
        <div style="margin-bottom:.75rem">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Spicy</div>
          <div style="display:flex;align-items:center;gap:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 12px">
            <button onclick="WT.adjustBE('spicy',-1)" style="width:32px;height:32px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);font-size:1.1rem;cursor:pointer">−</button>
            <span id="be-spicy" style="font-family:'DM Mono',monospace;font-size:1.2rem;flex:1;text-align:center">0</span>
            <button onclick="WT.adjustBE('spicy',1)" style="width:32px;height:32px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);font-size:1.1rem;cursor:pointer">+</button>
          </div>
        </div>
        <div style="margin-bottom:.75rem">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Blend</div>
          <div style="display:flex;align-items:center;gap:.75rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 12px">
            <button onclick="WT.adjustBE('blend',-1)" style="width:32px;height:32px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);font-size:1.1rem;cursor:pointer">−</button>
            <span id="be-blend" style="font-family:'DM Mono',monospace;font-size:1.2rem;flex:1;text-align:center">0</span>
            <button onclick="WT.adjustBE('blend',1)" style="width:32px;height:32px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);font-size:1.1rem;cursor:pointer">+</button>
          </div>
        </div>
        <div style="margin-bottom:.75rem">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Typ</div>
          <div style="display:flex;flex-wrap:wrap;gap:.4rem" id="be-types">
            ${['Rauchen','WC','Einkaufen','Essen','Sonstiges'].map(t=>`
              <div onclick="WT.toggleBEType(this,'${t}')" data-val="${t}"
                style="font-family:'DM Mono',monospace;font-size:11px;padding:5px 11px;border-radius:6px;border:1px solid var(--border);color:var(--muted);cursor:pointer;transition:all .15s">${t}</div>
            `).join('')}
          </div>
        </div>
        <div style="margin-bottom:1rem">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px">Notiz</div>
          <input id="be-notes" type="text" placeholder="Optional…" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none">
        </div>
        <div style="display:flex;gap:.5rem">
          <button onclick="WT.saveBreakEdit('${breakId}','${shiftId}')" style="flex:1;font-family:'DM Mono',monospace;font-size:11px;background:var(--green);color:#0a0a0b;border:none;border-radius:8px;padding:10px;cursor:pointer;font-weight:500">Speichern</button>
          <button onclick="document.getElementById('break-edit-overlay').remove()" style="font-family:'DM Mono',monospace;font-size:11px;background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:10px 16px;cursor:pointer">Abbrechen</button>
          <button class="btn-pill red" onclick="WT.deleteBreak('${breakId}','${shiftId}',event)">Löschen</button>
        </div>
        <div id="be-msg" style="font-family:'DM Mono',monospace;font-size:11px;margin-top:.5rem;text-align:center"></div>
      </div>`;
    overlay.addEventListener('click', () => overlay.remove());

    // Load current break data
    apiFetch(`/api/shift/${shiftId}`).then(data => {
      const b = (data.breaks||[]).find(x=>x.id===breakId);
      if(!b) return;
      if(b.break_start) document.getElementById('be-start').value = toLocalISO(b.break_start).split('T')[1];
      if(b.break_end)   document.getElementById('be-end').value   = toLocalISO(b.break_end).split('T')[1];
      document.getElementById('be-spicy').textContent = b.zig_spicy||0;
      document.getElementById('be-blend').textContent = b.zig_blend||0;
      document.getElementById('be-notes').value = b.notes||'';
      // Typ vorausfüllen
      if(b.break_type) {
        const types = b.break_type.split(' + ').map(t=>t.trim());
        document.querySelectorAll('#be-types div').forEach(el => {
          if(types.includes(el.dataset.val)) {
            el.dataset.active = '1';
            el.style.borderColor = 'var(--accent-blue)';
            el.style.color = 'var(--accent-blue)';
            el.style.background = 'rgba(0,166,237,.08)';
          }
        });
      }
      // Store base date for time conversion
      overlay.dataset.baseDate = toLocalISO(b.break_start).split('T')[0];
    });

    root.appendChild(overlay);   // im Modul-Container (nicht <body>), damit Modul-Styles greifen
  }

  function adjustBE(type, delta) {
    const el = document.getElementById(`be-${type}`);
    el.textContent = Math.max(0, parseInt(el.textContent)+delta);
  }

  function toggleBEType(el, val) {
    const active = el.dataset.active === '1';
    el.dataset.active = active ? '' : '1';
    el.style.borderColor = active ? '' : 'var(--accent-blue)';
    el.style.color = active ? '' : 'var(--accent-blue)';
    el.style.background = active ? '' : 'rgba(0,166,237,.08)';
  }

  async function saveBreakEdit(breakId, shiftId) {
    const overlay = document.getElementById('break-edit-overlay');
    const baseDate = overlay.dataset.baseDate || new Date().toISOString().split('T')[0];
    const startTime = document.getElementById('be-start').value;
    const endTime   = document.getElementById('be-end').value;
    const spicy     = parseInt(document.getElementById('be-spicy').textContent)||0;
    const blend     = parseInt(document.getElementById('be-blend').textContent)||0;
    const notes     = document.getElementById('be-notes').value||null;
    const msg       = document.getElementById('be-msg');

    const selectedTypes = [...document.querySelectorAll('#be-types div')]
      .filter(el => el.dataset.active === '1')
      .map(el => el.dataset.val);
    const breakType = selectedTypes.length > 0 ? selectedTypes.join(' + ') : null;

    const payload = {
      zig_spicy: spicy,
      zig_blend: blend,
      notes,
      corrected_reason: 'Manuelle Korrektur'
    };
    if(breakType) payload.break_type = breakType;
    if(startTime) payload.break_start = localToUTC(`${baseDate}T${startTime}`);
    if(endTime)   payload.break_end   = localToUTC(`${baseDate}T${endTime}`);

    try {
      const d = await apiFetch(`/api/break/${breakId}/correct`, 'PATCH', payload);
      if(d.break) {
        msg.style.color = 'var(--green)';
        msg.textContent = '✓ Gespeichert';
        setTimeout(() => { overlay.remove(); shiftsLoaded=false; loadShifts(); loadActive(); }, 700);
      } else {
        msg.style.color = 'var(--accent-red)';
        msg.textContent = d.error||'Fehler';
      }
    } catch(e) {
      msg.style.color = 'var(--accent-red)';
      msg.textContent = 'Verbindungsfehler';
    }
  }

  async function deleteShift(shiftId, event) {
    event.stopPropagation();
    if(!confirm('Schicht wirklich löschen?')) return;
    try {
      const d = await apiFetch(`/api/shift/${shiftId}`, 'DELETE');
      if(d.status === 'deleted') {
        // Remove the row from DOM directly
        const row = document.querySelector(`[data-shift-id="${shiftId}"]`);
        if(row) row.remove();
        else loadShifts();
      }
    } catch(e) {
      alert('Fehler: ' + e.message);
    }
  }

  async function deleteBreak(breakId, shiftId, event) {
    event.stopPropagation();
    if(!confirm('Pause wirklich löschen?')) return;
    try {
      const d = await apiFetch(`/api/break/${breakId}`, 'DELETE');
      if(d.status === 'deleted') {
        document.getElementById('break-edit-overlay')?.remove();
        shiftsLoaded = false;
        loadShifts();
        loadActive();
      }
    } catch(e) {
      alert('Fehler: ' + e.message);
    }
  }

  /* ── Load ── */
  async function loadActive(){
    try{
      const data=await apiFetch('/api/shift/current');
      renderActive(data);
    }catch(e){
      document.getElementById('activeContent').innerHTML=`<div class="state-msg">Verbindungsfehler<br><span style="color:var(--accent-red);font-size:11px">${e.message}</span></div>`;
    }
  }

  let shiftsLoaded=false;
  async function loadShifts(){
    const list=document.getElementById('shiftsList');
    list.innerHTML='<div class="state-msg">Schichten werden geladen…</div>';
    try{
      const data=await apiFetch('/api/shifts?limit=500');
      renderShifts(data.shifts||data);
      shiftsLoaded=true;
    }catch(e){
      list.innerHTML=`<div class="state-msg">Fehler: ${e.message}<br><button onclick="WT.loadShifts()" style="margin-top:.75rem;font-family:'DM Mono',monospace;font-size:11px;background:none;border:1px solid var(--border);color:var(--muted);padding:6px 14px;border-radius:6px;cursor:pointer">Neu laden</button></div>`;
    }
  }

  /* ── Stats ── */
  let statsLoaded=false;
  async function loadStats(){
    const container=document.getElementById('statsContent');
    container.innerHTML='<div class="state-msg">Statistik wird geladen…</div>';
    try{
      const [monthly, byType, extremes] = await Promise.all([
        apiFetch('/api/stats/monthly'),
        apiFetch('/api/stats/shift-summary'),
        apiFetch('/api/stats/extremes')
      ]);
      renderStats(monthly, byType, extremes);
      statsLoaded=true;
    }catch(e){
      container.innerHTML=`<div class="state-msg">Fehler: ${e.message}<br><button onclick="WT.loadStats()" style="margin-top:.75rem;font-family:'DM Mono',monospace;font-size:11px;background:none;border:1px solid var(--border);color:var(--muted);padding:6px 14px;border-radius:6px;cursor:pointer">Neu laden</button></div>`;
    }
  }

  function renderStats(monthly, byType, extremes){
    const container=document.getElementById('statsContent');
    if(!monthly||monthly.length===0){
      container.innerHTML='<div class="state-msg">Noch keine abgeschlossenen Schichten für Statistiken.</div>';
      return;
    }

    // ── Gesamt-Summen (aus den Monatsdaten) ──
    const totalShifts=monthly.reduce((a,m)=>a+Number(m.shift_count||0),0);
    const totalWorkMin=monthly.reduce((a,m)=>a+Number(m.total_work_minutes||0),0);
    const totalBreakMin=monthly.reduce((a,m)=>a+Number(m.total_break_minutes||0),0);
    const totalNettoMin=Math.max(0,totalWorkMin-totalBreakMin);
    const totalSpicy=monthly.reduce((a,m)=>a+Number(m.total_zig_spicy||0),0);
    const totalBlend=monthly.reduce((a,m)=>a+Number(m.total_zig_blend||0),0);
    const avgNettoPerShift=totalShifts>0?Math.round(totalNettoMin/totalShifts):0;
    const avgBreakPerShift=totalShifts>0?Math.round(totalBreakMin/totalShifts):0;

    // ── Aufteilung nach Schichttyp ──
    const typColors={'früh':'#FFB400','nachmittag':'#F96F5D','nacht':'#00A6ED'};
    const typeTotal=(byType||[]).reduce((a,t)=>a+Number(t.count||0),0);
    const typeRows=(byType||[]).map(t=>{
      const pct=typeTotal>0?Math.round(Number(t.count)/typeTotal*100):0;
      const color=typColors[t.shift_type]||'var(--muted)';
      return `
        <div class="typ-row">
          <div class="typ-row-head">
            <span class="typ-row-name">${schichtTyp(t.shift_type)}</span>
            <span class="typ-row-count">${t.count} · ${pct}%</span>
          </div>
          <div class="typ-bar-track"><div class="typ-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <div class="typ-row-meta">Ø ${fmtDuration(t.avg_duration_minutes)} Brutto · Ø ${fmtDuration(t.avg_break_minutes)} Pause · Ø ${t.avg_cigarettes||0} Zig. (${t.avg_spicy||0} Spicy)</div>
        </div>`;
    }).join('');

    // ── Verlauf: Netto-Stunden pro Monat (letzte 12) ──
    const MONTHS_SHORT=['Jän','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    const recent=monthly.slice(-12);
    const nettoByMonth=recent.map(m=>Math.max(0,Number(m.total_work_minutes||0)-Number(m.total_break_minutes||0)));
    const maxNetto=Math.max(...nettoByMonth,1);
    const chartBars=recent.map((m,i)=>{
      const d=new Date(m.month);
      const h=nettoByMonth[i]/60;
      const barPct=nettoByMonth[i]>0?Math.max(4,Math.round(nettoByMonth[i]/maxNetto*100)):0;
      const label=`${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}: ${fmtDuration(nettoByMonth[i])}`;
      return `
        <div class="stats-bar-col" title="${label}">
          <div class="stats-bar-value">${h>=10?Math.round(h):h.toFixed(1)}h</div>
          <div class="stats-bar-track"><div class="stats-bar-fill" style="height:${barPct}%"></div></div>
          <div class="stats-bar-label">${MONTHS_SHORT[d.getMonth()]}</div>
        </div>`;
    }).join('');

    // ── Extremwerte ──
    const extremeRows=[];
    if(extremes?.longest_break){
      const b=extremes.longest_break;
      extremeRows.push(`
        <div class="typ-row">
          <div class="typ-row-head"><span class="typ-row-name">Längste Pause</span><span class="typ-row-count">${fmtDuration(b.duration_minutes)}</span></div>
          <div class="typ-row-meta">${b.break_type||'Pause'} · ${fmtDate(b.break_start)} · ${b.station||'—'}</div>
        </div>`);
    }
    if(extremes?.longest_shift){
      const s=extremes.longest_shift;
      const gross=Math.round((new Date(s.work_end)-new Date(s.work_start))/60000);
      extremeRows.push(`
        <div class="typ-row">
          <div class="typ-row-head"><span class="typ-row-name">Längster Dienst (Netto)</span><span class="typ-row-count">${fmtDuration(s.netto_minutes)}</span></div>
          <div class="typ-row-meta">${schichtTyp(s.shift_type)} · ${fmtDate(s.work_start)} · ${s.station||'—'} · Brutto ${fmtDuration(gross)}</div>
        </div>`);
    }
    if(extremes?.shortest_shift){
      const s=extremes.shortest_shift;
      const gross=Math.round((new Date(s.work_end)-new Date(s.work_start))/60000);
      extremeRows.push(`
        <div class="typ-row">
          <div class="typ-row-head"><span class="typ-row-name">Kürzester Dienst (Netto)</span><span class="typ-row-count">${fmtDuration(s.netto_minutes)}</span></div>
          <div class="typ-row-meta">${schichtTyp(s.shift_type)} · ${fmtDate(s.work_start)} · ${s.station||'—'} · Brutto ${fmtDuration(gross)}</div>
        </div>`);
    }

    container.innerHTML=`
      <div class="wt-card">
        <div class="wt-label">Gesamt</div>
        <div class="wt-stats">
          <div class="wt-stat"><div class="wt-stat-val" style="color:var(--green)">${fmtDuration(totalNettoMin)}</div><div class="wt-stat-label">Netto gesamt</div></div>
          <div class="wt-stat"><div class="wt-stat-val" style="color:var(--accent-blue)">${totalShifts}</div><div class="wt-stat-label">Schichten</div></div>
          <div class="wt-stat"><div class="wt-stat-val">${fmtDuration(avgNettoPerShift)}</div><div class="wt-stat-label">Ø Netto/Schicht</div></div>
          <div class="wt-stat"><div class="wt-stat-val" style="color:var(--orange)">${avgBreakPerShift} min</div><div class="wt-stat-label">Ø Pause/Schicht</div></div>
        </div>
        <div class="wt-divider"></div>
        <div class="wt-cigs">
          <div class="wt-cig"><div class="wt-cig-num" style="color:${totalSpicy>0?'var(--orange)':'rgba(255,255,255,.15)'}">${totalSpicy}</div><div class="wt-cig-label">Spicy</div></div>
          <div class="wt-cig"><div class="wt-cig-num" style="color:${totalBlend>0?'var(--accent-blue)':'rgba(255,255,255,.15)'}">${totalBlend}</div><div class="wt-cig-label">Blend</div></div>
          <div class="wt-cig"><div class="wt-cig-num">${totalSpicy+totalBlend}</div><div class="wt-cig-label">Gesamt</div></div>
        </div>
      </div>

      <div class="wt-card" style="margin-top:1rem">
        <div class="wt-label">Nach Schichttyp</div>
        ${typeRows||'<div class="state-msg">Keine Daten</div>'}
      </div>

      <div class="wt-card" style="margin-top:1rem">
        <div class="wt-label">Netto-Stunden pro Monat</div>
        <div class="stats-chart">${chartBars}</div>
      </div>

      ${extremeRows.length?`
      <div class="wt-card" style="margin-top:1rem">
        <div class="wt-label">Extremwerte</div>
        ${extremeRows.join('')}
      </div>`:''}
    `;
  }

  /* ── Lifecycle (Gesamt-App): Timer/Listener sauber aufräumen ── */
  const timers = [];
  const onDocClick = (e) => {
    if (e.target.closest('.state-msg') && e.target.tagName !== 'BUTTON') loadActive();
  };
  function init() {
    document.addEventListener('click', onDocClick);
    timers.push(setInterval(loadActive, 30000));
    return loadActive();
  }
  function dispose() {
    document.removeEventListener('click', onDocClick);
    timers.forEach(clearInterval);
    document.getElementById('break-edit-overlay')?.remove();
  }

  window.WT = { pad, switchTab, fmtTime, fmtDuration, fmtDate, schichtTyp, pauseIcons, renderActive, renderShifts, toggleShiftDetail, fmtTimeInput, toLocalISO, localToUTC, toggleEditForm, selectEditCafePuls, selectEditStation, selectEditType, saveEdit, openAddBreak, toggleAbType, adjustAB, submitAddBreak, setupBreakLongPress, openBreakEdit, adjustBE, toggleBEType, saveBreakEdit, deleteShift, deleteBreak, loadActive, loadShifts, loadStats, renderStats, init, dispose };
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
    delete window.WT;
  },
};

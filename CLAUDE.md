# tracking — CLAUDE.md

Projekt-spezifischer Kontext. Ergänzt `~/.claude/CLAUDE.md`.
Ablageort: `~/Documents/Coding/bensn-hub/tracking/CLAUDE.md`

---

## Projekt-Basics

- **Name:** tracking (Gesamt-App: Work, Health, Food, Habits — PWA)
- **Domain:** `tracking.bensn.me`
- **Version:** v2.2.0 (Gesamt-App live im Root; Medikamente bearbeitbar, kein Text markieren; alte Habit-Seite als Rückfall unter /legacy/)
- **Status:** active
- **Stack:** Vanilla JS (PWA), kein Build-Schritt. Backend ist die geteilte hub-api (siehe `bensn-meta`-Repo, Port 5001) — dieses Repo enthält nur das Frontend.

## Zweck

Config-getriebener Habit-/Konsum-Tracker, Fokus auf Zähler-artigem Habit-Tracking: Redbull,
Zigaretten/Spicy/Ofen, Weed, Tabak, Fun. Vorrat-Tracking (Bestand statt Konsum) gibt es seit
v2.1.0 in der App nicht mehr (alte Vorrat-Einträge bleiben im Verlauf lesbar).
Medikamente werden seit v1.6.0 in `health.bensn.me` getrackt, nicht mehr hier. Keine
Item-spezifische Logik im Code — alles läuft über `tracking_categories`/`tracking_items`
(Admin-UI im "Einstellungen"-Tab), Einträge über `tracking_entries`.

---

## Lokale Struktur

```
~/Documents/Coding/bensn-hub/tracking/
├── index.html          ← Shell der Gesamt-App
├── css/app.css         ← Shell-Styles + gemeinsame Komponenten (Sheets, Verlauf …)
├── js/                 ← app.js (Router) · core.js · history.js (Verlauf) · modules/<id>.js
├── manifest.json · sw.js
├── legacy/index.html   ← alte Habit-Tracker-Einzelseite (nur Rückfall)
├── tools/              ← devserver.py, testmode.sh
├── schema.sql           ← Referenz-Schema der 3 Tracking-Tabellen (kein Migrationsrunner)
├── docs/changelogs/      ← Changelogs
└── CLAUDE.md
```

---

## Remote-Struktur

```
/var/www/tracking/         ← tracking.bensn.me Frontend (index.html, css/, js/, legacy/, manifest.json, sw.js)
```

Nginx: `bensn-meta/nginx/tracking.bensn.me` (js/css mit no-cache hinter Cookie-Auth, `/next/` → `/`).
`worktracker.bensn.me` und `health.bensn.me` leiten `/` auf die App um und behalten nur `/api/`.
Backend läuft als Teil der hub-api (`bensn-api`, Port 5001) und health-api (:5008).

---

## DB-Tabellen

`tracking_categories`, `tracking_items`, `tracking_entries` — siehe `schema.sql` in diesem Repo.
Tabellen liegen in der geteilten `bensnos`-DB (Postgres), verwaltet über die hub-api.

---

## Deploy

```bash
cd ~/Documents/Coding/bensn-hub/tracking
scp index.html manifest.json sw.js bensn:/var/www/tracking/
scp -r css js bensn:/var/www/tracking/
```

Backend-Änderungen (`/api/tracking/*`) werden im `bensn-meta`-Repo gepflegt und deployed.

---

---

## Git

- **Repo:** `https://github.com/BBBensn/tracking`
- **Remote:** `git@github.com:BBBensn/tracking.git`

---

## Auth

- Eigenes API-Key-System: `X-API-Key` Header (von Nginx injiziert, kein Key im Frontend nötig)
- KEIN `auth.bensn.me`-Cookie-Auth für `/api/*` (Legacy-Entscheidung, unverändert)

---

## Projekt-spezifische Konventionen

- **Soft-delete:** `deleted = true` (Einträge) bzw. `active = false` (Items/Kategorien) —
  nie physisch löschen, damit historische Verlaufs-Einträge (auch von längst deaktivierten
  Items) korrekt lesbar bleiben
- **Timestamps:** UTC ISO 8601 gespeichert, Anzeige in `Europe/Vienna`
- **DB-Zugriffe (im hub-api-Code):** `db_query()` / `db_insert()` Helper — kein ORM
- **Kein Item-spezifischer Code:** neue Konsum-Items/Kategorien werden ausschließlich über die
  Einstellungen-UI angelegt, nie hardcoded im Frontend
- **Nur Zähler (seit v2.1.0):** die App legt und bucht ausschließlich `zaehler`-Items. Vorrat/Bestand,
  `linked_items` (Verknüpfte Buchungen), Packungshierarchie und Presets sind aus UI und Logik
  entfernt; die DB-Spalten bleiben unangetastet (alte Einträge/Items bleiben lesbar, die
  deaktivierten Vorrat-Items stehen weiter im Verlauf). Ein Item besteht aus Name, Einheit und
  Buttons (Menge + optionale Beschriftung, negative Menge zieht ab); Slug entsteht automatisch.
  **Buchen:** Antippen eines Buttons = sofort, Gedrückthalten (450 ms) oder Stift = Eintrag-Sheet
  mit Menge, Uhrzeit, Notiz (`POST /api/tracking/entry` mit `timestamp`, `date` rechnet der Server)
- **Cross-App-Designsprache:** kleine Aktions-Buttons (Bearbeiten/Löschen) sind `.btn-pill`
  (geborderte DM-Mono-Buttons) — identische Klasse wie in `health.bensn.me` und `feed.bensn.me`,
  1:1 aus `worktracker`s Button-Stil übernommen. Kein Bare-Text-Link für Aktionen.
  `.btn-pill`/`.btn-save`/`.btn-cancel` liegen seit 2026-09-16 zentral in
  `bensn-meta/shared/bensn.css` (vorher hier lokal dupliziert, u.a. mit einem abweichenden
  `.btn-cancel`-Padding — beim Zentralisieren auf den in health/feed üblichen Wert
  angeglichen) — hier lokal NICHT mehr neu definieren. Vollständiger Style-Guide (alle
  Farben/Komponenten live + bekannte Inkonsistenzen): `bensn-meta/design-system.html`
- **Eintrag bearbeiten:** jeder Verlaufs-Eintrag hat "Bearbeiten" (Menge/Notiz/Zeitpunkt in
  einem Sheet, `openEditEntrySheet()`) und "Löschen" — Zeitpunkt-Änderung geht über
  `PATCH /api/tracking/entry/<id>` mit `timestamp` (siehe `bensn-meta` API-Endpoints), `date`
  wird dabei serverseitig aus `Europe/Vienna` neu berechnet, damit Tages-Summen/-Filter stimmen

---

## Gesamt-App (Umbau 2026-10-03, live seit 2026-10-04)

**Entscheidung:** `tracking.bensn.me` wird die eine App für Arbeit, Gesundheit, Essen, Habits
und Sport (untere Tab-Leiste, oben je Tracker die bisherigen Sub-Tabs). **Außen vor bleiben**
feed, location (OwnTracks-Ingest), library, stream, landing. Backends bleiben getrennte
Services (bensn-api :5001, health-api :5008) — nur das Frontend wird zusammengeführt.

**Datensicherheit (Regeln für alle Schritte dieses Umbaus):**
- Vor jedem Schritt mit Schema-/Datenänderung: `pg_dump` (nächtlich per Cron nach
  `/root/backups/`, 14 Tage; manuelle Kopie in `~/Documents/Coding/bensn-backups/`)
- Nur additive Schema-Änderungen (neue Tabellen/Spalten), nichts löschen oder umbenennen,
  solange die Alt-Apps noch laufen. Migrationen als Kopie, nicht als Verschiebung
- Rückfall nach dem Cutover (2026-10-04): alte Seiten sind im Repo (`legacy/`, `worktracker/`,
  `health/`), Nginx-Originale liegen auf dem Server unter `/root/nginx-backup-20261004/`; die
  Gesamt-App liest/schreibt dieselbe DB wie früher
- `worktracker.bensn.me` bleibt auch nach dem Cutover erreichbar (iOS-Kurzbefehle +
  OwnTracks hängen an `/api/` dort), ebenso `health.bensn.me/api/oura/callback`

**Architektur** (Root von `tracking/`): `index.html` (Shell) · `css/app.css` ·
`js/core.js` (api, Zeit, Fehlerbanner) · `js/app.js` (Router) · `js/modules/<id>.js`.
- Immer **genau ein Modul gemountet** (`mount(root, core)` / `unmount()`), Wechsel lädt
  frisch. Grund: die Alt-Apps teilen Element-IDs (`tab-verlauf`, …) und globale Namen
- Inline-`onclick` läuft über einen Namespace pro Modul (`window.HL` für health), der nur
  während des Mountens existiert. Neue Module: gleiches Muster oder `addEventListener`
- Modul-CSS steht als `.m-<id> { … }` (natives CSS-Nesting). Gemeinsames gehört nach
  `/shared/bensn.css`, nicht in ein Modul
- **Sub-Navigation:** jedes Modul legt seine Tabs in `<div class="subnav"><div class="tabs">…`.
  `.subnav` (app.css) ist sticky mit Blur + Auslauf; Inhalte scrollen darunter durch. Die
  Module bringen nur das Aussehen der einzelnen `.tab`-Buttons mit, nicht `.tabs`
- Module mit Timern/Listenern/Overlays an `<body>` liefern `dispose()` und rufen es in
  `unmount()` auf (siehe `work.js`)
- **Gemeinsame Komponenten** liegen in `app.css`: Sheets (`.overlay`/`.overlay-sheet`),
  Formularfelder (`.input-row`, `.note-input`), Tags (`.tag-btn`), `.btn-icon`, `.day-header`,
  `.tag-pill`, `.empty-state`, `.section-label`, Sub-Nav-Tabs. Neue Module nutzen diese statt eigener
  Kopien; `core.esc()` für alles, was Nutzertext enthält
- **Interaktion app-weit** (`css/app.css`): `touch-action: manipulation` (kein Doppeltipp-Zoom) und `user-select: none` + `-webkit-touch-callout: none` auf `html, body`; `input, textarea, [contenteditable]` setzen `user-select: text` ausdrücklich zurück (auf iOS sind Eingabefelder mit `none` sonst nicht bedienbar). Neue Elemente mit Langdruck-Funktion brauchen nichts Eigenes
- **Verlauf** (`js/history.js`) ist für ALLE Tracker gleich: ein Modul liefert nur `setData(Map tag → {count, marks})` und `renderDay(tag) → {extra?, body: String|Node|Node[]}`; Monatsköpfe, Tagesköpfe, Liste/Kalender-Umschalter und das Merken der Ansicht (`localStorage bensn.hx.<key>`) macht die Komponente. Klicks innerhalb der Tagesinhalte bleiben im Modul. `renderDay` darf keine beim Erzeugen eingefrorene Datenstruktur nutzen (immer Variablen im Modul-Scope lesen, die bei jedem Laden neu gesetzt werden)
- **Food** (neu geschrieben, kein Konverter-Port): Delegation über `data-act`, Sheets werden
  dynamisch in `#fdSheets` gerendert. Eingaben im offenen Sheet vor jedem Neu-Rendern in
  `st.draft` sichern (`captureDraft`). Doppel-Tap-Schutz über `guard()`. Richtwerte (Zucker 50 g/
  25 g WHO, Koffein 400 mg EFSA) stehen als `LIMITS` oben in `food.js` und werden in der App
  mit Quelle angezeigt; ein kcal-Tagesziel gibt es bewusst noch nicht
- **Red Bull, Holy, Kaffee** gehören seit 2026-10-03 zu Food, nicht mehr zu Habits: die
  Tracking-Items sind deaktiviert (verschwinden aus Alt-App und Modul), die Historie wurde nach
  Food kopiert (Details und Rückweg: `health/migrations/`, `health/CLAUDE.md`)
- **Overlays/Sheets gehören IN den Modul-Container** (`root.appendChild`), nie an `<body>`: das
  Modul-CSS steht als `.m-<id> { … }` und greift nur innerhalb. Wer ein Sheet per
  `document.body.appendChild` einhängt, bekommt ungestylte Felder (so geschehen im Habits-
  Bearbeiten-Sheet). `build(core, root)` reicht den Container durch
- **Arbeits-Zigaretten** in Habits kommen aus `GET /api/smoke-breaks` (eine Abfrage, je Pause mit
  Zeitstempel) und stehen im Verlauf chronologisch zwischen den eigenen Einträgen. NIE wieder
  "Schichtliste + je Schicht Details" laden (waren 101 Requests, die Ladezeit)
- **Jeder Tracker hat seinen eigenen Verlauf, im Feed läuft alles zusammen**: Mahlzeiten und
  Getränke leben nur in Food (Health zeigt sie nicht mehr)
- **Habits** (`habits.js`, Konverter-Port aus der Alt-App): Namespace `window.HB`, `dispose()`
  entfernt den Tastatur-Listener, den Toast-Timer und das an `<body>` gehängte Sheet
  (`#sheet-edit-overlay`). Der frühere Client-seitige API-Key entfällt (Cookie-Auth über
  `core.api`). Leere Kategorien (lebensmittel, Medikamente) erscheinen nicht in "Heute", wohl
  aber in den Einstellungen — dort bei Bedarf löschen
- Tab-Labels der Leiste bewusst kurz und englisch (Work, Health, Food, Habits, Sport)
- API immer über `core.api()` / `core.apiHealth()` — nie rohes `fetch`. Die Wrapper
  erkennen abgelaufene Sessions (`redirect: "manual"` → opaqueredirect) und zeigen das
  Fehlerbanner. `/hapi/…` → health-api `/api/…` (eigener Prefix, weil bensn-api schon
  `/api/health/…` belegt)
- Sheets (`z-index: 100`) liegen über der Tab-Leiste (50), Banner (200) über allem.
  `.view` hat bewusst kein `z-index` (sonst Stacking-Context). Sticky Leisten unten
  nutzen `bottom: calc(var(--nav-clear) + …)`

**Arbeitsweise (lokal gegen echte Daten, ohne Deploy):**
```bash
ssh -f -N -L 8125:127.0.0.1:5001 bensn; ssh -f -N -L 8123:127.0.0.1:5008 bensn
API_KEY=$(ssh bensn "grep -o '[a-f0-9]\{64\}' /etc/nginx/sites-enabled/tracking.bensn.me | head -1") \
  python3 tracking/tools/devserver.py 9300      # → http://127.0.0.1:9300/
```
Achtung: das ist die **echte Datenbank** — Testeinträge sofort wieder löschen. Schreibpfade
gefahrlos testen: `ssh bensn 'bash -s up' < tracking/tools/testmode.sh` legt eine DB-Kopie + Test-APIs an
(Ports 5011/5018; Tunnel 8126/8128, Dev-Server mit `API_UPSTREAM=8126 HAPI_UPSTREAM=8128`), `… down` räumt auf.

**Phasen:** ✅ 0 Backup-Cron · ✅ 1 Shell + Health · ✅ 2 Food (offen: Katalogwerte vom Nutzer prüfen lassen, Backfill der Alt-Mahlzeiten, Zutaten-basierte Gerichte mit Gramm-Angaben + Basis-Gemüse/Obst-Katalog + Scan von Packungswerten) · ✅ 3 Habits · ✅ 3b Einheitlicher Verlauf · ✅ 4 Work (inkl. Tab Eingabe; Schreib-Flows gegen DB-Kopie geprüft, am echten Dienst noch vom Nutzer zu testen) · ✅ 5 Cutover (2026-10-04) ·
⬜ 6 Sport · ⬜ Wisch-Gesten zwischen den Sub-Tabs eines Trackers (Randbereiche und horizontal scrollbare Elemente ausnehmen) · ⬜ Kurzbefehle/Quick-Log-API mit eigenen Tokens · ⬜ Alt-Seiten `worktracker/`, `health/` und `legacy/` nach einer Bewährungszeit aus den Repos/vom Server entfernen

## Roadmap

| Version | Feature | Status |
|---------|---------|--------|
| v1.1.0–v1.2.4 | Frühe Iterationen | ✅ deployed |
| v1.3.0–v1.3.5 | Config-getriebene Tracking-Engine (Kategorien/Items/Einträge) | ✅ deployed |
| v1.4.0–v1.4.3 | Bestand + Zähler, `linked_items` Cross-Deduction | ✅ deployed |
| v1.5.0 | PWA: manifest.json + Service Worker | ✅ deployed |
| v1.6.0 | Habit-Tracker-Fokus: Medikamente/Papes/Filter/Endless-Pape/Hybrid-Filter entfernt (Medikamente jetzt in `health.bensn.me`), Weed + Tabak von Vorrat auf Konsum-Tracker (Zähler) umgestellt, verwaiste `linked_items` bei Zigarette/Spicy/Ofen geleert, verbleibende Vorrat-Items (Kaffee) visuell zurückgestuft, jeder Verlaufs-Eintrag editierbar (Menge/Notiz/Zeitpunkt), `.btn-pill`-Design­sprache übernommen | ✅ deployed |
| v1.6.1 | `.btn-pill`/`.btn-save`/`.btn-cancel` aus lokalem CSS entfernt, kommen jetzt zentral aus `bensn-meta/shared/bensn.css` (dabei `.btn-cancel`-Padding-Abweichung auf den Standardwert angeglichen) — keine sichtbare Änderung außer diesem 2px-Fix | ✅ deployed (2026-09-16) |
| v1.6.2 | `.btn-danger` entfernt, Kategorie-/Item-Löschen in den Einstellungen-Sheets nutzt jetzt `.btn-pill.red` — konvergiert mit health.bensn.mes Löschen-Buttons in Sheets | ✅ deployed (2026-09-16) |
| v1.6.3 | Bugfix: Service Worker konnte auf Safari/Mobilfunk komplett ausfallen ("FetchEvent.respondWith received an error: Returned response is null") — `fetch(...).catch(() => caches.match(...))` resolvte bei Netzwerkfehler + Cache-Miss zu `undefined`, was WebKit als fatalen Fehler wertet (Chromium verzeiht das). Cache-Fallback gibt jetzt immer ein echtes Response-Objekt zurück, notfalls eine 503-Antwort. Gleicher Fix in `health`/`feed` (identischer sw.js-Code in allen drei Apps) | ✅ deployed (2026-09-19) |
| v1.7.0 | Gesamt-App-Vorschau unter `/next/`: Shell mit schwebender unterer Tab-Leiste, Fehlerbanner statt Status-Anzeige, Router, Modul Gesundheit (aus health.bensn.me übernommen, noch ohne Änderungen am Verhalten). Neue Nginx-Routen `/next/` und `/hapi/`; täglicher DB-Backup-Cron | ✅ deployed (2026-10-03) |
| v1.8.0 | Gesamt-App-Vorschau: Modul **Work** (aus worktracker.bensn.me übernommen; Pausen-Overlay/Intervalle werden beim Verlassen aufgeräumt, `--orange` nur im Modul pink-rot), sticky Sub-Navigation mit Blur, kürzere Tab-Labels | ✅ deployed (2026-10-03) |
| v1.9.0 | Gesamt-App-Vorschau: Modul **Food** (Katalog, Vorlagen, Mahlzeiten mit Nährwerten, Tagessummen mit Zucker-/Koffein-Richtwerten, Warenkorb-Eintragen, Bearbeiten, Katalog-/Vorlagen-Editor); gemeinsame Sheet-/Formular-Komponenten nach `app.css`; `core` um `esc`/`dayLabel`/`fmtClock` erweitert | ✅ deployed (2026-10-03) |
| v1.10.0 | Gesamt-App-Vorschau: Modul **Habits** (aus tracking.bensn.me übernommen: Zähler, Vorrat, Verlauf, Einstellungen, Arbeits-Verknüpfung); Red Bull/Holy/Kaffee nach Food migriert; Sub-Nav-Abstand oben wieder 1,25 rem (war beim Umbau auf sticky versehentlich auf 0,5 rem geschrumpft) | ✅ deployed (2026-10-03) |
| v1.11.0 | Gesamt-App-Vorschau: Mahlzeiten aus dem Health-Modul entfernt (Heute-Button, Verlauf, Dashboard-Kachel, Bearbeiten) — Food/Getränke nur noch in Food; Habits lädt mit 3 statt 104 Requests (`/api/smoke-breaks`, ~0,3 s); Arbeits-Zigaretten stehen je Pause chronologisch im Habits-Verlauf; Habits-Bearbeiten-Sheet war ungestylt (Overlay hing an `<body>` außerhalb des Modul-CSS), Work-Overlays ebenfalls in den Modul-Container verlegt | ✅ deployed (2026-10-04) |
| v2.0.0 | **Cutover:** Gesamt-App im Root von tracking.bensn.me (Work, Health, Food, Habits), alte Vhosts worktracker./health. leiten um (APIs bleiben), neuer Service Worker, einheitlicher Verlauf mit Kalenderansicht in allen Trackern, Work-Tab Eingabe, Medikamente in Tropfen, Food-Sheet-Layout | ✅ deployed (2026-10-04) |
| v2.1.0 | Habits: Eintrag-Stift war kaputt (`_overlayVorratMode` fehlte) → neues Eintrag-Sheet mit Uhrzeit; Gedrückthalten eines Buttons öffnet es; Item-Editor auf Name/Einheit/Button-Liste reduziert (kein Vorrat, keine Verknüpfungen, keine Packungen/Presets); Health: Medikamente mit Wirkstoffmenge in mg/µg/g/IE bzw. mg/ml, µg/ml, IE/ml und üblicher Menge je Einnahme; app-weit kein Doppeltipp-Zoom (`touch-action: manipulation`) | ✅ deployed (2026-10-04) |
| v2.2.0 | Health: Medikamenten-Profile bearbeitbar, alle Medikamente gemeinsam mit einer Uhrzeit eintragbar (Menge nur bei einem einzelnen PRN änderbar, sonst übliche Menge; Anzeige „14400 IE/ml × 5"); app-weit kein Text markieren außer in Eingabefeldern; Projekt-Doku `docs/Tracking.md` | ✅ deployed (2026-10-04) |

Details zur vollständigen Versionshistorie: `docs/changelogs/CHANGELOG.md`.

---

## Projekt-Doku

- Projekt-MD: `docs/Tracking.md` (lokal im Repo, enthält auch den Umbau-Verlauf) — Claude Code pflegt sie nach jeder Version
  (Module, Bedienung, Datenmodelle, Betrieb, Umbau-Tabelle, offene Todos). Der Nutzer kopiert sie bei Bedarf in den Vault;
  Claude schreibt NIE direkt in den Vault
- Vault-Ziel: `03_Projects/Coding PC/Bensn-Hub/Tracking/Tracking.md`, Changelogs: `…/Tracking/Changelogs/`
- Changelogs bleiben je Repo und Version eine Datei (der Vault bindet sie per Dataview ordnerweise ein)

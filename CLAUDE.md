# tracking — CLAUDE.md

Projekt-spezifischer Kontext. Ergänzt `~/.claude/CLAUDE.md`.
Ablageort: `~/Documents/Coding/bensn-hub/tracking/CLAUDE.md`

---

## Projekt-Basics

- **Name:** tracking (Habit-/Verbrauchstracker PWA)
- **Domain:** `tracking.bensn.me`
- **Version:** v1.6.2
- **Status:** active
- **Stack:** Vanilla JS (PWA), kein Build-Schritt. Backend ist die geteilte hub-api (siehe `bensn-meta`-Repo, Port 5001) — dieses Repo enthält nur das Frontend.

## Zweck

Config-getriebener Habit-/Konsum-Tracker, Fokus auf Zähler-artigem Habit-Tracking: Redbull,
Zigaretten/Spicy/Ofen, Weed, Tabak, Fun. Vorrat-Tracking (Bestand statt Konsum) ist seit v1.6.0
bewusst Nebensache und nur noch für Kaffee aktiv — visuell zurückgestuft (siehe Konventionen).
Medikamente werden seit v1.6.0 in `health.bensn.me` getrackt, nicht mehr hier. Keine
Item-spezifische Logik im Code — alles läuft über `tracking_categories`/`tracking_items`
(Admin-UI im "Einstellungen"-Tab), Einträge über `tracking_entries`.

---

## Lokale Struktur

```
~/Documents/Coding/bensn-hub/tracking/
├── index.html          ← aktuelle PWA (Tabs: Heute / Verlauf / Einstellungen)
├── manifest.json
├── sw.js
├── schema.sql           ← Referenz-Schema der 3 Tracking-Tabellen (kein Migrationsrunner)
├── docs/changelogs/      ← Changelogs
└── CLAUDE.md
```

---

## Remote-Struktur

```
/var/www/tracking/         ← tracking.bensn.me Frontend (index.html, manifest.json, sw.js)
```

Backend läuft als Teil der hub-api (`bensn-api`, Port 5001) — siehe `bensn-meta`-Repo für
API-Code, Deploy und Docker-Compose.

---

## DB-Tabellen

`tracking_categories`, `tracking_items`, `tracking_entries` — siehe `schema.sql` in diesem Repo.
Tabellen liegen in der geteilten `bensnos`-DB (Postgres), verwaltet über die hub-api.

---

## Deploy

```bash
scp ~/Documents/Coding/bensn-hub/tracking/index.html bensn:/var/www/tracking/index.html
scp ~/Documents/Coding/bensn-hub/tracking/manifest.json bensn:/var/www/tracking/manifest.json
scp ~/Documents/Coding/bensn-hub/tracking/sw.js bensn:/var/www/tracking/sw.js
```

Backend-Änderungen (`/api/tracking/*`) werden im `bensn-meta`-Repo gepflegt und deployed.

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
- **`vorrat` vs. `zaehler`:** beide Tracking-Modi bleiben als Mechanismus bestehen (inkl.
  `linked_items` Cross-Deduction), aber der Habit-Tracker-Fokus liegt seit v1.6.0 auf `zaehler`
  (Konsum-Events zählen/summieren). `vorrat`-Items (Bestand, der schrumpft) werden in der
  Heute-Ansicht bewusst ans Ende ihrer Kategorie sortiert und mit `.item-card-vorrat`
  (reduzierte Opazität) visuell zurückgestuft — aktuell nur noch Kaffee
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

Details zur vollständigen Versionshistorie: `docs/changelogs/CHANGELOG.md`.

---

## Obsidian-Doku

- Projekt-MD: `03_Projects/Coding PC/Bensn-Hub/Tracking/Tracking.md`
- Changelogs: `03_Projects/Coding PC/Bensn-Hub/Tracking/Changelogs/`

# tracking — CLAUDE.md

Projekt-spezifischer Kontext. Ergänzt `~/.claude/CLAUDE.md`.
Ablageort: `~/Documents/Coding/bensn-hub/tracking/CLAUDE.md`

---

## Projekt-Basics

- **Name:** tracking (Habit-/Verbrauchstracker PWA)
- **Domain:** `tracking.bensn.me`
- **Version:** v1.5.0
- **Status:** active
- **Stack:** Vanilla JS (PWA), kein Build-Schritt. Backend ist die geteilte hub-api (siehe `bensn-meta`-Repo, Port 5001) — dieses Repo enthält nur das Frontend.

## Zweck

Config-getriebener Konsum-/Gewohnheits-Tracker: Redbull, Zigaretten, Weed, Kaffee, Papers/Filter.
Keine Item-spezifische Logik im Code — alles läuft über `tracking_categories`/`tracking_items`
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

- **Soft-delete:** `deleted = true` Spalte — nie physisch löschen
- **Timestamps:** UTC ISO 8601 gespeichert, Anzeige in `Europe/Vienna`
- **DB-Zugriffe (im hub-api-Code):** `db_query()` / `db_insert()` Helper — kein ORM
- **Kein Item-spezifischer Code:** neue Konsum-Items/Kategorien werden ausschließlich über die
  Einstellungen-UI angelegt, nie hardcoded im Frontend

---

## Roadmap

| Version | Feature | Status |
|---------|---------|--------|
| v1.1.0–v1.2.4 | Frühe Iterationen | ✅ deployed |
| v1.3.0–v1.3.5 | Config-getriebene Tracking-Engine (Kategorien/Items/Einträge) | ✅ deployed |
| v1.4.0–v1.4.3 | Bestand + Zähler, `linked_items` Cross-Deduction | ✅ deployed |
| v1.5.0 | PWA: manifest.json + Service Worker | ✅ deployed |
| — | Visuelle Politur der Kategorien-Gruppierung (rauchen/redbull) | ⬜ geplant |

Details zur vollständigen Versionshistorie: `docs/changelogs/CHANGELOG.md`.

---

## Obsidian-Doku

- Projekt-MD: `03_Projects/Coding PC/Bensn-Hub/Tracking/Tracking.md`
- Changelogs: `03_Projects/Coding PC/Bensn-Hub/Tracking/Changelogs/`

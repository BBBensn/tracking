---
date_created: 2026-04-21 10:58:32
type: project
status: active
bereich: coding
tags:
  - project
date_modified: 2026-10-04 02:10:00
---

# Tracking

Die eine Tracking-App unter `tracking.bensn.me`: **Work, Health, Food, Habits** (Sport folgt). Teil des [[Bensn-Hub]].
Ersetzt seit 2026-10-04 die früher getrennten Seiten `worktracker.bensn.me`, `health.bensn.me` und den alten Habit-Tracker.

> tracking.bensn.me · Nginx (Cookie-Auth `auth.bensn.me`) → bensn-api :5001 (`/api/`) und health-api :5008 (`/hapi/`) · PostgreSQL `bensnos`

## Was ist das Projekt?

Persönliche Tracking-App als PWA (iPhone-Homescreen): Arbeitszeiten, Gesundheit (Medikamente, Blutdruck, Gewicht, Oura), Essen/Trinken mit Nährwerten und Konsum-Gewohnheiten. Vanilla JS ohne Build-Schritt, reines Frontend — die Backends sind die geteilten Services `bensn-api` und `health-api`. Alles läuft zusätzlich in den [[Feed]] (liest direkt aus Postgres).

## Scope

- **Drin:** die fünf Tracker (Work, Health, Food, Habits, Sport), je mit eigenem Verlauf (Liste/Kalender)
- **Außen vor (eigene Seiten):** [[Feed]], [[Location]] (OwnTracks-Ingest), Library, Stream, Landing
- **Bleibt erreichbar:** `worktracker.bensn.me/api/` (iOS-Kurzbefehle, OwnTracks, ohne Cookie), `health.bensn.me/api/` (Oura-Callback)

## Services

| Service | Adresse | Status |
| --- | --- | --- |
| App (Frontend) | `tracking.bensn.me` → `/var/www/tracking/` | ✅ live (v2.4.0) |
| bensn-api | Docker `bensn-api` :5001 (`/api/…`) | ✅ live |
| health-api | Docker `bensn-health-api` :5008 (`/hapi/…`, intern `/api/…`) | ✅ live |
| Alte Seiten | `worktracker.` / `health.` leiten `/` auf die App um; `/legacy/` = alter Habit-Tracker (Rückfall) | ✅ |

## Module

| Tab | Inhalt | Backend |
| --- | --- | --- |
| **Work** | Aktiv (laufender Dienst), Schichten (Verlauf), Statistik, Eingabe (Dienst/Pause/Sender/Ende mit nachträglichen Zeiten) | bensn-api |
| **Health** | Heute (Medikamente abhaken, Blutdruck, Gewicht), Verlauf, Dashboard, Medikamente (Profile), Oura | health-api |
| **Food** | Heute (Favoriten, Vorlagen, Warenkorb, Zucker-/Koffein-Richtwerte), Verlauf, Katalog (Essen, Getränke, Vorlagen) | health-api |
| **Habits** | Heute (Zähler mit Buttons), Verlauf (inkl. Arbeits-Zigaretten), Einstellungen (Kategorien, Items) | bensn-api |
| **Sport** | geplant | — |

### Bedienung (app-weit)

- Untere schwebende Tab-Leiste, oben je Tracker sticky Sub-Navigation mit Blur; Fehlerbanner statt Live-Status
- **Verlauf** überall gleich (`js/history.js`): Monate einklappbar (aktueller offen), Umschalter Liste/Kalender (Tagesmarker, Tipp auf Tag zeigt Einträge)
- Kein Doppeltipp-Zoom (`touch-action: manipulation`), kein Text markieren außer in Eingabefeldern (`user-select: none`, damit Langdruck auf Buttons nicht markiert)
- **Habits:** Button antippen = sofort buchen, **gedrückt halten** (oder Stift) = Sheet mit Menge, Uhrzeit, Notiz
- **Wischen:** horizontal wischen wechselt den Tab (Heute/Verlauf/…); im Kalender wischt man Monate, auf den Einträgen darunter wieder Tabs
- **Food, Suche:** Suchfeld im Katalog und bei den Favoriten (ohne Groß-/Kleinschreibung und Akzente, alle Wörter müssen vorkommen; Gerichte werden auch über ihre Zutaten gefunden)
- **Food:** Lebensmittel mit Nährwerten pro 100 g/ml werden in Gramm erfasst (z.B. 200 g von einer 250-g-Packung, Schnellwahl ¼ ½ ¾ 1); gleiches gilt für Zutaten in Gerichten; "Eigener Posten" nimmt alle Nährwerte
- **Health:** alle Medikamente lassen sich gemeinsam mit einer Uhrzeit eintragen; die Menge ist nur bei genau einem Bedarfsmedikament (PRN) änderbar, sonst gilt die übliche Menge des Medikaments

## Datenmodelle (Kurzfassung)

- **Habits:** `tracking_categories` → `tracking_items` (Name, Einheit, Buttons als JSON) → `tracking_entries` (nur `zaehler`; alte Vorrat-Typen bleiben lesbar). Verknüpfte Buchungen, Vorrat und Packungen gibt es seit v2.1.0 nicht mehr
- **Food:** Katalog `health_foods` (Werte je Portion oder je 100 g/ml, `basis`/`portion_g`) → Mahlzeit `health_meals` → Zeilen `health_meal_items` (Snapshot der Nährwerte); Vorlagen (Bundles) klappen in Zeilen auf. Richtwerte Zucker 50/25 g (WHO), Koffein 400 mg (EFSA) stehen in `food.js`
- **Medikamente:** Profil `health_medications` (Name, Form `tablet`/`drops`, Wirkstoffmenge `dose_mg` in `dose_unit` [mg, µg, g, IE, mg/ml, µg/ml, IE/ml], übliche Menge `default_count`, PRN, gültig von/bis) → Einnahmen `health_medication_logs` (`count` = Tabletten oder Tropfen)
- Zeitzone: gespeichert UTC, Tageslogik immer `Europe/Vienna`

## Architektur

`index.html` (Shell) · `css/app.css` (Shell + gemeinsame Komponenten) · `js/core.js` (api, Zeit, Fehlerbanner) · `js/app.js` (Router `#/<modul>`, SW-Registrierung) · `js/history.js` (Verlauf) · `js/modules/<id>.js`.

- Immer **genau ein Modul gemountet**; Inline-`onclick` über Namespaces (`window.HL/WT/HB/WI`), nur solange gemountet; Modul-CSS als `.m-<id> { … }`; Sheets gehören in den Modul-Container
- API immer über `core.api()` / `core.apiHealth()` (Session-Ablauf → Banner)
- Nginx: `/js/`, `/css/`, `/` mit `no-cache` hinter Cookie-Auth; `sw.js` und `manifest.json` öffentlich (Safari-Update-Check); `/hapi/` → health-api; `/next/` → `/`
- Service Worker ohne Offline-Cache (nur Installierbarkeit); gibt immer ein echtes `Response` zurück (WebKit)

## Betrieb

```bash
cd ~/Documents/Coding/bensn-hub/tracking
scp index.html manifest.json sw.js bensn:/var/www/tracking/
scp -r css js bensn:/var/www/tracking/
```

- **Test ohne Risiko:** `ssh bensn 'bash -s up' < tools/testmode.sh` kopiert die DB und startet Test-APIs (5011/5018); lokal Tunnel + `tools/devserver.py` mit `API_UPSTREAM`/`HAPI_UPSTREAM`; danach `… down`
- **Backups:** nächtlicher `pg_dump` nach `/root/backups/` (14 Tage), vor Migrationen zusätzlich manuell
- **Rückfall:** Nginx-Originale `/root/nginx-backup-20261004/`, alte Seiten in den Repos (`legacy/`, `worktracker/`, `health/`)

## Umbau zur Gesamt-App (2026-10-03 bis 04)

Entscheidung: die getrennten Tracker (Work, Health, Habits) und der neue Essens-Tracker werden **eine** App; Planung und Umsetzung vollständig bei Claude, Datensicherheit vor allem anderen (nur additive DB-Änderungen, Backup vor Schritten, Alt-Apps bis zum Cutover live).

| Version | Schritt |
| --- | --- |
| v1.7.0 | Shell, Tab-Leiste, Fehlerbanner, Router; Modul Health (Vorschau `/next/`); `/hapi/`; Backup-Cron |
| v1.8.0 | Modul Work, sticky Sub-Navigation mit Blur |
| v1.9.0 | Modul Food (neu geschrieben), gemeinsame Sheet-/Formular-Komponenten |
| v1.10.0 | Modul Habits; Red Bull/Holy/Kaffee nach Food migriert (mit Protokoll und Rückweg) |
| v1.11.0 | Mahlzeiten nur noch in Food, Habits lädt mit 3 statt 104 Requests, Arbeits-Zigaretten chronologisch |
| **v2.0.0** | **Cutover:** App im Root, alte Vhosts leiten um, neuer Service Worker, einheitlicher Verlauf mit Kalender, Work-Tab Eingabe, Medikamente in Tropfen |
| v2.1.0 | Habits nur Zähler + Gedrückthalten, Medikamente mit Einheiten, kein Doppeltipp-Zoom |
| v2.2.0 | Medikamente bearbeiten, alle Medikamente gemeinsam eintragbar (Menge nur bei einzelnem PRN änderbar), kein Text markieren |
| v2.3.0 | Wischgesten zwischen Sub-Tabs (Kalender: Monate), Food mit Gramm-Mengen (Nährwerte pro 100 g) und Gerichten aus Zutaten |
| v2.4.0 | Food: Suche (Katalog und Favoriten), Salat-Klassiker aus echten Packungswerten, Back-Emmentaler-Einträge vereinheitlicht |

Wichtige Erkenntnisse unterwegs: ein defekter Service Worker (`respondWith(undefined)`) legte Safari komplett lahm → immer echtes `Response`, `sw.js` öffentlich; UTC-vs-Wien-Datum in der health-api; Overlays an `<body>` verlieren das Modul-CSS; `user-select: none` darf Eingabefelder nicht treffen.

## Offene Todos
```dataview
TASK
FROM "03_Projects/Coding PC/Bensn-Hub/Tracking"
WHERE !completed
SORT file.name ASC
```

Offen (Stand 2026-10-04):
- Sport-Tracker
- Kurzbefehle/Quick-Log-API mit eigenen eingeschränkten Tokens
- Food: Namen der unbenannten Produkte prüfen (Saft, Dressing, Sriracha-Varianten), Schätzwerte im Salat-Klassiker (Gramm) anpassen, übrige Altwerte durch Packungswerte ersetzen, 30 Alt-Mahlzeiten nachtragen
- Alt-Seiten (`worktracker/`, `health/`, `legacy/`) nach Bewährungszeit entfernen

## Notizen

Verwandt: [[Bensn-Hub]] · [[Feed]] · [[Health]] · [[Location]] · [[Worktracker]]
Technische Details: `tracking/CLAUDE.md` (Konventionen), [[Bensn Hub Technical Overview]]

## Changelog
```dataviewjs
const pages = dv.pages('"03_Projects/Coding PC/Bensn-Hub/Tracking/Changelogs" and #changelog')
  .sort(p => p.file.name, 'asc');

for (let p of pages) {
  dv.header(2, p.file.name);
  dv.paragraph(`![[${p.file.path}#Changes]]`);
}
```

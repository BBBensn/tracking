---
date_created: 2026-10-04 00:52:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-10-04 00:52:00
---

# v2.0.0 — Gesamt-App live: Work, Health, Food, Habits unter tracking.bensn.me (2026-10-04)
- **Cutover:** die Gesamt-App liegt jetzt im Root von `tracking.bensn.me` (`index.html`, `css/`, `js/`),
  die Vorschau unter `/next/` entfällt (leitet auf `/` um). Die alte Habit-Tracker-Einzelseite
  bleibt als Rückfall unter `/legacy/` (nicht verlinkt).
- **Alte Seiten leiten um:** `worktracker.bensn.me/` → `tracking.bensn.me/#/work`,
  `health.bensn.me/` → `tracking.bensn.me/#/health`. Ihre `/api/`-Routen bleiben unverändert
  (iOS-Kurzbefehle, OwnTracks, Oura-Callback).
- **PWA:** `manifest.json` mit `start_url`/`scope` `/`; neuer `sw.js` ohne Offline-Cache (löscht
  Caches der Vorgänger-Version, immer echte Response), Registrierung in `app.js`.
- **Einheitlicher Verlauf** (`js/history.js`) in Work (Tab Schichten), Health, Food und Habits:
  Monate einklappbar (aktueller offen), Umschalter Liste/Kalender (Tagesmarker je Eintragsart, Tipp
  auf einen Tag zeigt dessen Einträge), Auswahl wird je Tracker gemerkt. Habits: Datums-Pills entfallen.
  Verlauf lädt mehr Historie (Health 500 je Typ, Habits 1000 Einträge).
- **Work:** Tab „Eingabe" (Dienst starten, Pause, Sender wechseln, Beenden mit nachträglicher Uhrzeit)
  statt Link auf die alte Seite; alle Bearbeiten-Wege bleiben jetzt in der App.
- **Health:** Medikamente mit Einheit „Tropfen" statt Tabletten anlegbar (Eingabe mit Tropfenzahl,
  Anzeige „25 Tropfen · 0.5 mg/Tropfen").
- **Food:** Sheets (neue Vorlage, neues Gericht, Eigener Posten …) laufen nicht mehr seitlich über,
  Felder sind beschriftet (Kalorien, Eiweiß, Kohlenhydrate, Fett, Zucker, Koffein).
- Entwicklung: `tools/testmode.sh` (Test-Stack gegen DB-Kopie), `tools/devserver.py` serviert die App
  jetzt im Root und kann per `API_UPSTREAM`/`HAPI_UPSTREAM` auf die Test-APIs zeigen.

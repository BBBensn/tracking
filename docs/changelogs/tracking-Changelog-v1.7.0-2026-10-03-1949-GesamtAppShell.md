---
date_created: 2026-10-03 19:49:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-10-03 19:49:00
---

# v1.7.0 — Gesamt-App: Shell + Modul Gesundheit als Vorschau (2026-10-03)
- Auftakt des Umbaus von fünf Einzel-Apps zu einer App unter `tracking.bensn.me`
  (Arbeit, Gesundheit, Essen, Habits, Sport). Vorschau unter `/next/` — die bisherige
  tracking-App unter `/` und alle anderen Apps laufen unverändert weiter
- **Shell:** schwebende untere Tab-Leiste (5 Tracker, Material-Icons, aktiver Tab mit
  gefülltem Icon, Safe-Area für den Home-Indikator), oben keine "bensn.me / …"-Zeile und
  keine Live-Anzeige mehr. Stattdessen **Fehlerbanner**, der nur bei Problemen erscheint
- **API-Wrapper** (`core.api`) erkennt abgelaufene Sessions eindeutig (`redirect: "manual"`)
  und bietet "Neu anmelden" an — vorher hätte ein Session-Ablauf als unverständlicher
  "Load failed"-Fehler geendet
- **Modul Gesundheit:** 1:1 aus health.bensn.me übernommen (mechanisch konvertiert, kein
  Verhaltensunterschied), Sub-Tabs oben bleiben wie gewohnt. Sticky Bestätigungsleiste
  sitzt über der Tab-Leiste, Sheets überdecken sie
- Nicht-fertige Tracker zeigen in der Vorschau einen Platzhalter
- **Nginx:** neue Routen `/next/` (no-cache, Cookie-Auth) und `/hapi/` (→ health-api,
  Cookie-Auth) im tracking-Vhost
- **Datensicherheit:** erstes Backup erstellt (es gab bis dahin keines) und täglicher
  `pg_dump`-Cron um 03:15 mit 14 Tagen Aufbewahrung eingerichtet
- `tools/devserver.py`: lokaler Nachbau des Vhosts zum Testen gegen die echten Daten über
  SSH-Tunnel

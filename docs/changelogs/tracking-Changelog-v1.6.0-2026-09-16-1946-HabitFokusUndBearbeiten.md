---
date_created: 2026-09-16 19:46:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-09-16 19:46:00
---

# v1.6.0 — Habit-Tracker-Fokus, Konsum statt Vorrat, Eintrag bearbeiten (2026-09-16)
- **Aufräumen (deaktiviert, nicht gelöscht):** Medikamente (werden seit v1.6.0 in
  `health.bensn.me` getrackt), Papes (Marie Fine), Filter (Swan), Endless Pape, Hybrid Filter —
  historische Verlaufs-Einträge dazu bleiben erhalten und lesbar, nur die aktive Nutzung endet
- Verwaiste `linked_items` bei Zigarette/Spicy/Ofen geleert (zeigten auf jetzt deaktivierte
  Filter/Papes-Items) — die Verknüpfungs-Mechanik selbst bleibt im Code bestehen, wird aber
  aktuell nirgends mehr konfiguriert
- Weed (Marc/Lubo) und Tabak (Pueblo Blau) von `vorrat` (Bestand, der schrumpft) auf `zaehler`
  (Konsum-Events werden gezählt/summiert) umgestellt — Menge- und Zähler-Logik bleiben wie
  gehabt, nur der Tracking-Modus wechselt. Neue Quick-Buttons/Presets auf realistische
  Konsum-Mengen umgestellt (z.B. Weed: +0.3g/+0.5g/+1g statt +1 Dag/-1 Dag)
- **Habit-Tracker-Fokus:** Zähler-Items sind jetzt der visuelle Vordergrund, verbleibende
  `vorrat`-Items (aktuell nur noch Kaffee) sortieren innerhalb ihrer Kategorie ans Ende und
  werden mit reduzierter Opazität (`.item-card-vorrat`) zurückgestuft
- **Jeder Verlaufs-Eintrag ist jetzt bearbeitbar:** neues "Bearbeiten"-Sheet
  (`openEditEntrySheet()`) für Menge, Notiz und vor allem den Zeitpunkt — bisher gab es nur
  Löschen. Dafür `PATCH /api/tracking/entry/<id>` im `bensn-meta`-Repo um ein `timestamp`-Feld
  erweitert; `date` (für Tages-Gruppierung/-Summen) wird serverseitig aus `Europe/Vienna`
  neu berechnet, wenn sich der Zeitpunkt ändert
- **Design-Angleichung:** Verlaufs-Zeilen zeigen jetzt "Bearbeiten"/"Löschen" als `.btn-pill`
  (geborderte DM-Mono-Buttons, exakt wie in `health.bensn.me`/`feed.bensn.me`/`worktracker`)
  statt eines reinen "×"-Icon-Links — Teil der einheitlichen, theme-fähigen Designsprache über
  alle bensn.me-Frontends hinweg

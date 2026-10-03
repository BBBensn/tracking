---
date_created: 2026-10-03 22:57:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-10-03 22:57:00
---

# v1.8.0 — Modul Work, sticky Sub-Navigation (2026-10-03)
- **Tab-Labels** der unteren Leiste jetzt kurz: Work, Health, Food, Habits, Sport
  ("Gesundheit" sprengte die Breite)
- **Sticky Sub-Navigation** (`.subnav`): die Tabs eines Trackers bleiben oben stehen, der
  Inhalt scrollt darunter durch und verschwimmt im Blur (backdrop-filter + weicher Auslauf),
  inkl. Statusleisten-Safe-Area. Gemeinsame Komponente in `app.css`, von allen Modulen genutzt
- **Modul Work** (Arbeit) aus worktracker.bensn.me übernommen: Aktiv, Schichten, Stats
  unverändert. Anpassungen: Kopfzeile/Status/Footer entfallen, `apiFetch` läuft über
  `core.api`, "+ Eingabe" verlinkt vorerst auf `worktracker.bensn.me/eingabe`
- Aufräumen beim Verlassen des Moduls: 30s-Intervall, Dokument-Listener und das an `<body>`
  gehängte Pausen-Overlay werden entfernt (verifiziert: 1 Intervall im Modul, 0 danach)
- Der Worktracker überschrieb global `--orange` auf Pink-Rot — in der Gesamt-App gilt das
  nur noch innerhalb von Work, global bleibt Orange (Health nutzt es für Gewicht)
- Schichten werden weiter per iOS-Kurzbefehl gestartet/beendet (worktracker.bensn.me/api,
  unverändert). Die Schreib-Flows des Moduls (Pause bearbeiten, Schicht korrigieren) sind
  noch nicht an einer echten laufenden Schicht geprüft — die alte App bleibt parallel live

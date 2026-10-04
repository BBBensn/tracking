---
date_created: 2026-10-04 02:10:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-10-04 02:10:00
---

# v2.2.0 — Medikamente bearbeiten, gemeinsames Eintragen, kein Text markieren (2026-10-04)
- **Health, Medikamente bearbeiten:** am Profil neuer Button „Bearbeiten" (öffnet das Anlegen-Sheet vorbelegt:
  Name, Form, Wirkstoffmenge + Einheit, Menge pro Einnahme, PRN, Gültigkeit, Notiz). Eine echte Dosisänderung
  im Alltag bleibt besser ein neues Profil (Historie).
- **Health, Heute:** alle Medikamente lassen sich wieder gemeinsam auswählen und mit einer Uhrzeit eintragen
  (auch Tropfen und Tabletten gemischt). Die Mengenänderung (Stepper bzw. Tropfenfeld) erscheint nur bei genau einem
  ausgewählten Bedarfsmedikament (PRN); sonst gilt die übliche Menge des Medikaments. Anzeige im Eintrag: „14400 IE/ml × 5"
  (Tropfen immer, Tabletten ab 2). Die Auswahl wird nach dem Eintragen geleert.
- **Global:** Text lässt sich nur noch in Eingabefeldern markieren (`user-select: none`, `-webkit-touch-callout: none`
  auf der ganzen App; Felder setzen `user-select: text` zurück) — Gedrückthalten auf Buttons markiert keinen Text mehr.
- Neu: Projekt-Dokumentation `docs/Tracking.md` (Module, Bedienung, Datenmodelle, Betrieb, Umbau-Verlauf).

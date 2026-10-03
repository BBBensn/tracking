---
date_created: 2026-10-04 01:30:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-10-04 01:30:00
---

# v2.1.0 — Habits vereinfacht, Gedrückthalten für Nachträge, Medikamente mit Einheiten, kein Doppeltipp-Zoom (2026-10-04)
- **Habits, Stift auf „Heute":** war wirkungslos (`_overlayVorratMode` fehlte nach dem Port, der Klick brach
  mit einem Fehler ab). Das Eintrag-Sheet ist neu: Menge, Uhrzeit (Standard jetzt), Notiz.
- **Gedrückthalten:** Antippen eines Buttons bucht sofort wie bisher, 450 ms halten öffnet das
  Eintrag-Sheet mit der Menge des Buttons und frei wählbarer Uhrzeit (kein Text-Select/Callout auf den Buttons).
- **Nur noch Zähler:** Item-Editor besteht aus Name, Einheit und Button-Liste (Menge + optionale
  Beschriftung, negative Menge zieht ab). Vorrat/Bestand, Verknüpfte Buchungen, Packungshierarchie,
  Presets, Richtung und Slug-Feld sind aus UI und Logik entfernt (DB-Spalten unverändert, alte
  Einträge bleiben im Verlauf lesbar).
- **Health:** neues Medikament mit Wirkstoffmenge in mg, µg, g, IE (je Tablette) bzw. IE/ml, mg/ml, µg/ml, mg,
  µg, IE (Tropfen) und „Menge pro Einnahme" (Standard 1, z.B. 5 Tropfen), die bei der Einnahme vorbelegt wird.
  Anzeige z.B. „20000 IE/ml", „7 Tropfen · 20000 IE/ml". Backend siehe health v1.10.0.
- **Global:** `touch-action: manipulation` auf allen Elementen verhindert den Doppeltipp-Zoom auf
  Buttons und Text (Pinch-Zoom und Scrollen bleiben).
- Work: Absturz beim Verlassen des Moduls während eines laufenden Ladevorgangs (`loadActive`) behoben.

---
date_created: 2026-10-04 00:10:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-10-04 00:10:00
---

# v1.11.0 — Verlauf-Fixes: Mahlzeiten nur in Food, Habits schnell + chronologisch (2026-10-04)
- **Health ohne Mahlzeiten:** Schnell-Button, Mahlzeit-Sheet, Verlaufszeilen, Bearbeiten-Typ,
  Dashboard-Kachel und deren History-Konfiguration sind aus dem Health-Modul entfernt.
  Leitlinie: jeder Tracker hat seinen eigenen Verlauf (Essen und Getränke in Food, Gesundheits-
  daten in Health), im Feed läuft alles zusammen. (Die Alt-App health.bensn.me bleibt bis zur
  Umstellung unverändert)
- **Habits lädt schnell:** statt der Schichtliste plus je Schicht ein Detail-Request (101
  Requests, jeweils mit Auth-Prüfung) jetzt eine einzige Abfrage `/api/smoke-breaks`
  (bensn-meta v1.0.11). Insgesamt 3 Requests, ~0,3 s
- **Arbeits-Zigaretten chronologisch:** im Habits-Verlauf steht jede Pause mit Uhrzeit,
  Sorte (Spicy/Zigarette), Menge und Station zwischen den eigenen Einträgen (vorher als Summe
  am Tagesende). Pausen nach Mitternacht in Nachtdiensten zählen zum Kalendertag der Pause
- **Habits-Bearbeiten-Sheet repariert:** das Sheet wurde per `document.body.appendChild`
  außerhalb des Modul-Containers eingehängt, das auf das Modul begrenzte CSS griff nicht —
  Felder erschienen weiß und unformatiert. Sheet liegt jetzt im Modul-Container; dasselbe für
  die Pausen-Overlays im Work-Modul (dort nur vorsorglich, sie nutzen Inline-Styles)

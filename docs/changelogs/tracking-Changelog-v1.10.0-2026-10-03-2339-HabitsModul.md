---
date_created: 2026-10-03 23:39:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-10-03 23:39:00
---

# v1.10.0 — Modul Habits, Getränke nach Food (2026-10-03)
- **Modul Habits** in der Gesamt-App-Vorschau (`/next/#/habits`): das bisherige tracking —
  Zähler (Weed, Zigarette, Spicy, Ofen, Tabak, Fun …), Vorrat, Verlauf mit Arbeits-Zeilen,
  Einstellungen (Kategorien/Items) — mechanisch übernommen, kein Verhaltensunterschied
- Anpassungen: Kopfzeile/Status/Footer entfallen, API über `core.api` (der Client-seitige
  API-Key im JS entfällt, Cookie-Auth reicht), Service-Worker-Registrierung macht die Shell.
  Beim Verlassen werden Tastatur-Listener, Toast-Timer und das an `<body>` gehängte Sheet
  aufgeräumt (verifiziert)
- **Red Bull, Holy und Kaffee sind jetzt Teil von Food**, nicht mehr von Habits: Historie nach
  Food kopiert (siehe health v1.8.1), Tracking-Items deaktiviert, Original-Einträge
  soft-gelöscht. Der Tracking-"Kaffee" war ein Vorrat (keine Tassen)
- **Fix Sub-Navigation:** der Abstand der Tab-Leiste nach oben war beim Umbau auf die sticky
  Variante von 1,25 rem auf 0,5 rem geschrumpft (Leiste rutschte nach oben in den Blur);
  jetzt wieder 1,25 rem
- Food: Sonderfälle für das frühere Tracking-Mapping entfernt (Kacheln/Auswahl enthalten jetzt
  auch Red Bull, Holy, Kaffee; der Hinweistext entfällt)
- Getestet gegen die echten Daten bei Handy-Breite: Heute, +1-Tap (Schreibpfad, Testeintrag
  danach hart entfernt, Zähler unverändert), Verlauf, Einstellungen, Bearbeiten-Sheet über der
  Tab-Leiste, sauberes Verlassen und Wiedereintreten

---
date_created: 2026-10-03 23:11:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-10-03 23:11:00
---

# v1.9.0 — Modul Food (2026-10-03)
- Neues Modul **Food** in der Gesamt-App-Vorschau (`/next/#/food`), Backend siehe
  health v1.8.0. Drei Sub-Tabs: Heute, Verlauf, Katalog
- **Heute:** Tagessumme (kcal, Eiweiß, Kohlenhydrate, Fett) und zwei Anzeigen mit Richtwert:
  **Zucker** (WHO: unter 10 % der Energie, besser unter 5 % ≈ 50 g bzw. 25 g, mit Markierung
  bei 25 g) und **Koffein** (EFSA: 400 mg/Tag, höchstens 200 mg auf einmal) — Balken wird
  orange ab 75 %, rot über dem Limit, die Quelle steht darunter
- **Eintragen:** Kacheln für Favoriten (nach Häufigkeit sortiert, Filter Essen/Getränke) —
  antippen legt in den Warenkorb, Minus nimmt zurück, halbe Portionen möglich. Vorlagen (z.B.
  Salat-Klassiker) klappen in einzeln anpassbare Posten auf. Die Leiste über der Tab-Leiste
  hat "Eintragen" (sofort, jetzt) und ein Sheet für Zeitpunkt, Label, Notiz und eigene Posten
- **Verlauf:** nach Tagen gruppiert, im Tages-Header die Summen (kcal, Zucker, Koffein);
  Mahlzeiten als Karten mit Zeilen und Notiz; Alt-Einträge ohne Zeilen sind als solche
  gekennzeichnet. Bearbeiten: Zeitpunkt, Label, Notiz, Mengen, Posten hinzufügen/entfernen,
  Löschen
- **Katalog:** Einträge und Vorlagen anlegen, ändern, entfernen; Werte mit Quelle
  (geschätzt/Packung/manuell), Dezimalkomma wird verstanden
- Red Bull bleibt vorerst im Tracking und wird in den Tagessummen mitgezählt (Zucker und Koffein
  stimmen damit schon heute); es erscheint hier bewusst nicht als Kachel, um Doppelzählung zu
  vermeiden
- Gemeinsame Sheet-/Formular-/Tag-/Tages-Header-Komponenten und die Sub-Nav-Tabs liegen jetzt
  in `app.css`; `core.js` bekam `esc` (HTML-Escaping), `dayLabel`, `fmtClock`,
  `isoToDatetimeLocal`
- Getestet gegen die echten Daten bei Handy-Breite (Warenkorb-Rechnung, Eintragen, Bearbeiten,
  Katalog-/Vorlagen-Editor, Fehlerfälle der API); alle Testeinträge danach restlos entfernt

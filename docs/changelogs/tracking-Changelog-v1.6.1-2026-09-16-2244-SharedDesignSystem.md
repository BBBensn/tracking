---
date_created: 2026-09-16 22:44:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-09-16 22:44:00
---

# v1.6.1 — Design-System zentralisiert (2026-09-16)
- `.btn-pill`, `.btn-save`, `.btn-cancel` aus dem lokalen `<style>`-Block entfernt — kommen
  jetzt aus dem neu versionierten `bensn-meta/shared/bensn.css`, das identisch von
  health/feed eingebunden wird
- Dabei einen kleinen echten Unterschied gefunden und behoben: `.btn-cancel` hatte hier
  18px horizontales Padding statt der 16px, die health/feed schon immer verwendet haben —
  beim Zentralisieren auf den in zwei von drei Apps üblichen Wert angeglichen (2px, nicht
  sichtbar relevant)

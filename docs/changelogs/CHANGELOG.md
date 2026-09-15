# tracking — Changelog (Archiv-Zusammenfassung v1.1.0–v1.5.0)

> Diese Versionen existierten vorher als volle Datei-Snapshots (`tracking_X.X.X/`-Ordner).
> Im Zuge des Repo-Restructures (siehe `docs/changelogs/` ab hier) wurden sie zu dieser
> Zusammenfassung konsolidiert — die vollständigen historischen Dateien bleiben über die
> Git-Historie des "Initial commit" abrufbar, falls nötig.

## v1.5.0 (2026-04-26)
- PWA: `manifest.json` + `sw.js` (Service Worker, network-first mit Cache-Fallback, `/api/` ausgeschlossen)

## v1.4.0–v1.4.3 (2026-04-21)
- `tracking_items.linked_items` JSONB — cross-item Deduction (z.B. Zigaretten → Tabak-Verbrauch)
- Diverse UI-Fixes an `index.html`

## v1.3.0–v1.3.5 (2026-04-21)
- Config-getriebene Tracking-Engine eingeführt: `tracking_categories` → `tracking_items` → `tracking_entries`
- `tracking_mode`: `bestand` / `zaehler` / `vorrat`
- `counter_direction`, `pack_unit`, `pack_size` an `tracking_items`
- `entry_type` erweitert: `bestand` / `zaehler` / `auffuellung` / `entnahme` / `delta`

## v1.2.0–v1.2.4 (2026-04-21)
- Frühe Iterationen der Tracking-UI vor der config-getriebenen Engine

## v1.1.0 (2026-04-21)
- Initiale Version

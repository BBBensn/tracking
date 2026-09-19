---
date_created: 2026-09-19 18:04:00
type: changelog
tags:
  - project
  - changelog
date_modified: 2026-09-19 18:04:00
---

# v1.6.3 — Service-Worker-Bug auf Safari/Mobilfunk behoben (2026-09-19)
- Gleicher Bug wie in `feed`/`health` (siehe dortige Changelogs): `sw.js`s Fetch-Handler
  konnte auf Safari/Mobilfunk mit "FetchEvent.respondWith received an error: Returned
  response is null" komplett ausfallen, weil `fetch(...).catch(() =>
  caches.match(...))` bei Netzwerkfehler + Cache-Miss zu `undefined` resolved —
  `respondWith` braucht aber immer ein echtes Response-Objekt
- Cache-Fallback gibt jetzt immer ein echtes `Response`-Objekt zurück (im Worst-Case
  eine 503-Antwort statt `undefined`), `CACHE`-Version auf `v2` erhöht
- tracking blendet `/api/`-Requests vom Service Worker ohnehin schon aus, betroffen war
  hier also "nur" das Laden der Seite/Assets selbst auf wackligem Mobilfunk — reicht
  aber schon, um die komplette Webapp unbenutzbar zu machen (genau das vom User
  gemeldete "am Handy geht auch beim Tracker nichts")

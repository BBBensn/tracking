// Service Worker der Gesamt-App. Cacht bewusst NICHTS (Module/CSS werden bei jedem Aufruf per
// Netzwerk revalidiert, siehe nginx "no-cache") — er existiert für die Installierbarkeit als PWA.
// Alte Caches der Vorgänger-Version (bensn-tracking-v2 u.a.) werden beim Aktivieren gelöscht.
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/hapi/")) return;
  // respondWith MUSS immer ein echtes Response-Objekt bekommen (WebKit wirft sonst
  // "Returned response is null" und die Seite sieht einen kompletten Fetch-Fehler).
  e.respondWith(
    fetch(e.request).catch(() => new Response("Offline", { status: 503, statusText: "Offline" }))
  );
});

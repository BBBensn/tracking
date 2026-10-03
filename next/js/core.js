// core.js — geteilte Grundlagen für alle Module (API, Zeit, Fehlerbanner).
// Module importieren NICHT selbst fetch/Zeitlogik, sondern nutzen diese Helfer, damit
// Fehlerbehandlung und Zeitzone überall identisch sind.

export const TZ = "Europe/Vienna";

/* ── Zeit ── */
export function dayKey(isoOrDate) {
  return new Date(isoOrDate).toLocaleDateString("en-CA", { timeZone: TZ });
}
export function todayKey() { return dayKey(new Date()); }
export function nowForDatetimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
export function toIsoOrNull(datetimeLocalValue) {
  return datetimeLocalValue ? new Date(datetimeLocalValue).toISOString() : null;
}

/* ── Fehlerbanner ── */
const banner = () => document.getElementById("errBanner");
let bannerTimer = null;

export function showError(message, { link, sticky = false } = {}) {
  const el = banner();
  if (!el) return;
  el.innerHTML = "";
  const msg = document.createElement("span");
  msg.className = "err-msg";
  msg.textContent = message;
  el.append(msg);
  if (link) {
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    el.append(a);
  }
  const close = document.createElement("button");
  close.textContent = "OK";
  close.onclick = clearError;
  el.append(close);
  el.classList.add("show");
  clearTimeout(bannerTimer);
  if (!sticky) bannerTimer = setTimeout(clearError, 8000);
}
export function clearError() {
  clearTimeout(bannerTimer);
  banner()?.classList.remove("show");
}

/* ── API ──
   Alle Backends hängen unter derselben Origin (Cookie-Auth via nginx):
     /api/...   → bensn-api   (Habits, Arbeit)
     /hapi/...  → health-api  (Gesundheit, Essen)
   `redirect: "manual"`: läuft die Sitzung ab, antwortet nginx mit 302 auf auth.bensn.me.
   Ein normales fetch() würde diesem Redirect folgen und an CORS scheitern (unverständlicher
   "Load failed"-Fehler); mit "manual" erkennen wir den Fall eindeutig als opaqueredirect. */
export async function api(path, { method = "GET", body = null } = {}) {
  let r;
  try {
    r = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      redirect: "manual",
    });
  } catch (e) {
    showError("Keine Verbindung zum Server.");
    throw new Error("Netzwerkfehler");
  }
  if (r.type === "opaqueredirect") {
    showError("Sitzung abgelaufen.", {
      sticky: true,
      link: { href: "https://auth.bensn.me/auth/login?next=" + encodeURIComponent(location.href), label: "Neu anmelden" },
    });
    throw new Error("Sitzung abgelaufen");
  }
  if (!r.ok) {
    let msg = r.status + " " + r.statusText;
    try { msg = (await r.json()).error || msg; } catch (_) { /* keine JSON-Fehlerantwort */ }
    if (r.status >= 500) showError("Serverfehler: " + msg);
    throw new Error(msg);
  }
  try {
    return await r.json();
  } catch (e) {
    showError("Unerwartete Antwort vom Server.");
    throw new Error("Ungültige Antwort");
  }
}

/* Health-API: Module schreiben weiter "/api/medications" etc.; hier wird der Pfad auf den
   /hapi/-Prefix der Gesamt-App umgeschrieben (nginx rewritet zurück auf /api/ des Backends). */
export function apiHealth(path, opts) {
  return api(path.replace(/^\/api\//, "/hapi/"), opts);
}

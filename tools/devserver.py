"""Dev-Server der Gesamt-App. Start: siehe tracking/CLAUDE.md ("Arbeitsweise").
Local stand-in for the tracking.bensn.me nginx vhost, for testing the unified app against
live data through SSH tunnels. Same-origin like production: static files + /api -> bensn-api
(tunnel :8125) + /hapi -> health-api (tunnel :8123, rewritten to /api). Injects X-API-Key from
the environment (nginx does this in production)."""
import os, sys, mimetypes, urllib.request, urllib.error
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))  # bensn-hub/
API_KEY = os.environ["API_KEY"]
# Standard: Tunnel auf die ECHTEN APIs (8125 -> bensn-api, 8123 -> health-api). Für gefahrloses
# Testen von Schreibpfaden gegen die DB-Kopie: tools/testmode.sh und API_UPSTREAM=8126 HAPI_UPSTREAM=8128.
API_UP = os.environ.get("API_UPSTREAM", "8125")
HAPI_UP = os.environ.get("HAPI_UPSTREAM", "8123")
STATIC = [
    ("/js/", f"{REPO}/tracking/js/"),
    ("/css/", f"{REPO}/tracking/css/"),
    ("/shared/", f"{REPO}/bensn-meta/shared/"),
    ("/icons/", f"{REPO}/tracking/icons/"),
    ("/legacy/", f"{REPO}/tracking/legacy/"),
    ("/", f"{REPO}/tracking/"),        # index.html, manifest.json, sw.js (muss zuletzt stehen)
]
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9300

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _proxy(self, base, path):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else None
        req = urllib.request.Request(base + path, data=body, method=self.command)
        req.add_header("Content-Type", self.headers.get("Content-Type", "application/json"))
        req.add_header("X-API-Key", API_KEY)
        try:
            r = urllib.request.urlopen(req, timeout=30)
        except urllib.error.HTTPError as e:
            r = e
        data = r.read()
        self.send_response(r.status if hasattr(r, "status") else r.code)
        self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def do_ANY(self):
        p = self.path
        if p.startswith("/hapi/"):
            return self._proxy(f"http://127.0.0.1:{HAPI_UP}", "/api/" + p[len("/hapi/"):])
        if p.startswith("/api/"):
            return self._proxy(f"http://127.0.0.1:{API_UP}", p)
        if self.command == "GET":
            path = p.split("?")[0]
            for prefix, root in STATIC:
                if path.startswith(prefix) or path + "/" == prefix:
                    rel = path[len(prefix):] or "index.html"
                    if rel.endswith("/"): rel += "index.html"
                    f = os.path.join(root, rel)
                    if os.path.isfile(f):
                        data = open(f, "rb").read()
                        self.send_response(200)
                        self.send_header("Content-Type", mimetypes.guess_type(f)[0] or "application/octet-stream")
                        self.send_header("Content-Length", str(len(data)))
                        self.send_header("Cache-Control", "no-cache")
                        self.end_headers()
                        self.wfile.write(data)
                        return
        self.send_response(404); self.end_headers()

    do_GET = do_POST = do_PATCH = do_DELETE = do_ANY

ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

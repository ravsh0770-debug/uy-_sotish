"""Toshkent uy narxlari — backend server.

Ishga tushirish:  python3 backend/server.py
Keyin brauzerda:   http://localhost:8000
"""
import json
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import database as db  # noqa: E402

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
PORT = int(os.environ.get("PORT", 8000))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    # --- yordamchi metodlar ---
    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > 100_000:
            raise ValueError("So'rov juda katta")
        raw = self.rfile.read(length) if length else b"{}"
        data = json.loads(raw or b"{}")
        if not isinstance(data, dict):
            raise ValueError("JSON obyekt kutilgan")
        return data

    # --- HTTP metodlar ---
    def do_GET(self):
        url = urlparse(self.path)
        if url.path.startswith("/api/"):
            return self.handle_api("GET", url)
        return super().do_GET()

    def do_POST(self):
        self.handle_api("POST", urlparse(self.path))

    def do_DELETE(self):
        self.handle_api("DELETE", urlparse(self.path))

    # --- API marshrutlari ---
    def handle_api(self, method, url):
        path = url.path.rstrip("/")
        query = {k: v[0] for k, v in parse_qs(url.query).items()}
        item_match = re.fullmatch(r"/api/listings/(\d+)", path)

        try:
            if method == "GET" and path == "/api/meta":
                return self.send_json({
                    "districts": db.DISTRICTS,
                    "building_types": db.BUILDING_TYPES,
                    "renovations": db.RENOVATIONS,
                })

            if method == "GET" and path == "/api/listings":
                return self.send_json(db.list_listings(query))

            if method == "POST" and path == "/api/listings":
                data, errors = db.validate_listing(self.read_json())
                if errors:
                    return self.send_json({"error": "Ma'lumotlar noto'g'ri", "fields": errors}, 400)
                return self.send_json(db.create_listing(data), 201)

            if item_match and method == "GET":
                item = db.get_listing(int(item_match.group(1)))
                return self.send_json(item) if item else self.send_json({"error": "E'lon topilmadi"}, 404)

            if item_match and method == "DELETE":
                if db.delete_listing(int(item_match.group(1))):
                    return self.send_json({"ok": True})
                return self.send_json({"error": "E'lon topilmadi"}, 404)

            if method == "GET" and path == "/api/stats":
                return self.send_json(db.stats())

            if method == "GET" and path == "/api/compare":
                ids = [int(x) for x in query.get("ids", "").split(",") if x.strip()][:4]
                return self.send_json(db.compare(ids))

            return self.send_json({"error": "Manzil topilmadi"}, 404)

        except (ValueError, json.JSONDecodeError) as e:
            return self.send_json({"error": f"Noto'g'ri so'rov: {e}"}, 400)
        except Exception as e:  # kutilmagan xatolar
            self.log_error("Server xatosi: %r", e)
            return self.send_json({"error": "Serverda xatolik yuz berdi"}, 500)


def main():
    db.init_db()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Server ishga tushdi: http://localhost:{PORT}  (to'xtatish: Ctrl+C)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer to'xtatildi.")


if __name__ == "__main__":
    main()

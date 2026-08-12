#!/usr/bin/env python3
"""Google Calendar API 用の refresh token を対話的に取得して保存する (1回だけ実行)。

前提: ~/.local/state/ags/gcal-oauth.json に {"client_id":..., "client_secret":...}
      (GCP コンソールで作成した「デスクトップアプリ」の OAuth クライアント)
使い方: 実行すると認可 URL を表示して localhost:8765 で待つ。URL をブラウザで
        開いて対象アカウントで承認すると refresh_token を追記して終了する。
"""
import json
import secrets
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

CFG_FILE = Path.home() / ".local/state/ags/gcal-oauth.json"
PORT = 8765
SCOPE = "https://www.googleapis.com/auth/calendar.readonly"


def main():
    cfg = json.loads(CFG_FILE.read_text())
    state = secrets.token_urlsafe(16)
    redirect = f"http://localhost:{PORT}/"

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cfg["client_id"],
        "redirect_uri": redirect,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    })
    print("OPEN THIS URL IN BROWSER:")
    print(auth_url, flush=True)

    holder = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if q.get("state", [""])[0] != state or "code" not in q:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"bad request")
                return
            holder["code"] = q["code"][0]
            self.send_response(200)
            self.end_headers()
            self.wfile.write("AUTH OK - このタブは閉じて構いません".encode())

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", PORT), Handler)
    while "code" not in holder:
        server.handle_request()

    body = urllib.parse.urlencode({
        "code": holder["code"],
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "redirect_uri": redirect,
        "grant_type": "authorization_code",
    }).encode()
    resp = json.loads(urllib.request.urlopen("https://oauth2.googleapis.com/token", body).read())
    cfg["refresh_token"] = resp["refresh_token"]
    CFG_FILE.write_text(json.dumps(cfg))
    CFG_FILE.chmod(0o600)
    print("refresh_token saved")


if __name__ == "__main__":
    main()

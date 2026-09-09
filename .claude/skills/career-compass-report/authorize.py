"""One-time Google OAuth authorization for the Career Compass Drive uploader.

Run once per person, per machine:

    python authorize.py

Reads google_oauth_client_id / google_oauth_client_secret from the credentials
file (see cc_config.py), opens a consent URL, catches the redirect on a loopback
port, exchanges the code, and PRINTS the refresh token.

It deliberately does not write the token anywhere. A script that edits the
credentials file can clobber a working token on a re-run, and the refresh token
is the one value that is genuinely annoying to recreate quietly. Paste it in
yourself.

Scope is drive.file — per-file access, limited to files this app creates.
"""
import http.server
import secrets
import socket
import sys
import threading
import time
import urllib.parse

import cc_config as cfgmod

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
WAIT_SECONDS = 300

_result = {}


class _Catcher(http.server.BaseHTTPRequestHandler):
    """Single-shot handler: records the query string, then tells the browser."""

    def do_GET(self):  # noqa: N802 - stdlib naming
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        _result.update({k: v[0] for k, v in query.items()})
        ok = "code" in _result
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        message = ("Authorized. Return to your terminal — the refresh token is printed there."
                   if ok else
                   f"Authorization failed: {_result.get('error', 'no code returned')}")
        self.wfile.write(f"<html><body style='font:16px system-ui;padding:3rem'>"
                         f"<p>{message}</p></body></html>".encode())

    def log_message(self, *_args):
        pass  # keep the terminal readable


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main():
    # Only the client pair is needed here — the refresh token is what we are
    # about to create, and the folder id is not required until upload time.
    cfg = cfgmod.load_google(require=("google_oauth_client_id",
                                      "google_oauth_client_secret"))

    # Desktop OAuth clients accept a loopback redirect on ANY port, so the port
    # is chosen at runtime rather than registered. A mistake here surfaces as
    # redirect_uri_mismatch on Google's consent page, before anything is issued.
    port = free_port()
    redirect_uri = f"http://127.0.0.1:{port}"
    state = secrets.token_urlsafe(24)

    params = {
        "client_id": cfg["google_oauth_client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": cfgmod.SCOPE,
        # offline + consent together are what actually produce a refresh token.
        # Without prompt=consent a repeat authorization returns an access token
        # and NO refresh token — which looks like success and fails later.
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"

    server = http.server.HTTPServer(("127.0.0.1", port), _Catcher)
    threading.Thread(target=server.handle_request, daemon=True).start()

    print("Open this URL in your browser and approve access:\n")
    print(f"  {url}\n")
    print(f"Listening on {redirect_uri} for the redirect ...")

    for _ in range(WAIT_SECONDS):
        if _result:
            break
        time.sleep(1)
    server.server_close()

    if not _result:
        cfgmod.die(f"timed out after {WAIT_SECONDS // 60} minutes waiting for the redirect",
                   code=3)
    if _result.get("state") != state:
        cfgmod.die("state mismatch on the redirect — aborting", code=3)
    if "code" not in _result:
        cfgmod.die(f"authorization failed: {_result.get('error', 'no code returned')}", code=3)

    payload = urllib.parse.urlencode({
        "code": _result["code"],
        "client_id": cfg["google_oauth_client_id"],
        "client_secret": cfg["google_oauth_client_secret"],
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }).encode()
    status, data = cfgmod.http_json(cfgmod.TOKEN_URL, method="POST", raw_body=payload,
                                    content_type="application/x-www-form-urlencoded")
    if status != 200 or not isinstance(data, dict):
        cfgmod.die(f"code exchange failed (HTTP {status}): {data}", code=3)

    refresh = data.get("refresh_token")
    if not refresh:
        cfgmod.die("Google returned no refresh_token. This happens when the app was "
                   "already authorized without prompt=consent. Revoke access at "
                   "https://myaccount.google.com/permissions and run this again.", code=3)

    print("\nAuthorization complete.\n")
    print("Set this in your credentials file "
          f"({cfgmod.config_path()}) as google_oauth_refresh_token:\n")
    print(f"  {refresh}\n")
    print("This value is not written anywhere by this script — paste it in yourself.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

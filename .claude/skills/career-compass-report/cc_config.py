"""Credential loading and Google token minting for the Career Compass uploader.

Two credential sources, deliberately separate:

  * Google OAuth (client id/secret, refresh token) and the Drive folder id live
    OUTSIDE the repo, at ~/.config/career-compass/credentials.json (override with
    CAREER_COMPASS_CONFIG). Gitignored is not the same as protected — a long-lived
    credential should not sit in a directory that might be copied or shared.
  * Supabase URL + service-role key stay in intake-app/.env.local, which is where
    the Next.js app already reads them in local dev. Moving those is a change to
    how the app loads config, which is a different change from adding an uploader.

Zero new dependencies: stdlib only.

Exit codes shared by every script here:
    0 success
    1 precondition / validation failure
    2 uploaded to Drive but NOT recorded in Supabase (see upload_report.py)
    3 auth failure
"""
import json
import os
import stat
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPE = "https://www.googleapis.com/auth/drive.file"

# <repo>/.claude/skills/career-compass-report/cc_config.py -> parents[3] is the repo root.
REPO_ROOT = Path(__file__).resolve().parents[3]
ENV_LOCAL = REPO_ROOT / "intake-app" / ".env.local"

GOOGLE_KEYS = (
    "google_oauth_client_id",
    "google_oauth_client_secret",
    "google_oauth_refresh_token",
    "drive_reports_folder_id",
)


def die(message, code=1):
    """Fail loudly. Never degrade, never continue on a missing precondition."""
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(code)


def config_path():
    override = os.environ.get("CAREER_COMPASS_CONFIG")
    if override:
        return Path(override).expanduser()
    return Path.home() / ".config" / "career-compass" / "credentials.json"


def load_google(require=GOOGLE_KEYS):
    """Read the out-of-repo credentials file, refusing loose file permissions.

    `require` lists the keys that must be present and non-empty. authorize.py
    needs only the client pair; the uploader needs the refresh token and folder
    id too, so each caller states what it actually needs rather than every
    script demanding a fully-populated file.
    """
    path = config_path()
    if not path.exists():
        die(f"no credentials file at {path}\n"
            f"       copy credentials.example.json there and fill it in "
            f"(chmod 600), or set CAREER_COMPASS_CONFIG")

    mode = stat.S_IMODE(path.stat().st_mode)
    if mode & 0o077:
        die(f"{path} is mode {mode:04o} — readable or writable beyond your user.\n"
            f"       This file holds a long-lived credential. Fix with:\n"
            f"         chmod 600 {path}")

    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        die(f"{path} is not valid JSON: {e}")

    missing = [k for k in require if not str(data.get(k) or "").strip()]
    if missing:
        die(f"{path} is missing or has empty: {', '.join(missing)}")
    return data


def load_supabase():
    """Read Supabase URL + service-role key from intake-app/.env.local.

    Deliberately left in place rather than moved into the credentials file — see
    the module docstring. Values already present in the real environment win, so
    a CI or one-off run can override without editing the file.
    """
    if not ENV_LOCAL.exists():
        die(f"no {ENV_LOCAL} — the uploader reads Supabase credentials from there")

    parsed = {}
    for raw in ENV_LOCAL.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        # Strip one layer of matching quotes; leave inner content alone.
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        parsed[key.strip()] = value

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or parsed.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or parsed.get("SUPABASE_SERVICE_ROLE_KEY", "")
    missing = [n for n, v in (("NEXT_PUBLIC_SUPABASE_URL", url),
                              ("SUPABASE_SERVICE_ROLE_KEY", key)) if not v.strip()]
    if missing:
        die(f"{ENV_LOCAL} is missing or has empty: {', '.join(missing)}")
    return url.rstrip("/"), key


def http_json(url, method="GET", headers=None, body=None, raw_body=None,
              content_type="application/json"):
    """One HTTP call. Returns (status, parsed_or_text). Never retries.

    A retry here would paper over exactly the failures worth seeing — a revoked
    token, a folder the app cannot reach, a row that does not exist.
    """
    headers = dict(headers or {})
    if raw_body is not None:
        data = raw_body
        headers.setdefault("Content-Type", content_type)
    elif body is not None:
        data = json.dumps(body).encode()
        headers.setdefault("Content-Type", "application/json")
    else:
        data = None

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            text = resp.read().decode("utf-8", "replace")
            status = resp.status
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", "replace")
        status = e.code
    except urllib.error.URLError as e:
        die(f"network failure calling {url}: {e.reason}")

    try:
        return status, json.loads(text) if text else {}
    except json.JSONDecodeError:
        return status, text


def access_token(cfg):
    """Exchange the refresh token for an access token.

    A dead refresh token (revoked, password change, scope change) comes back as
    invalid_grant. That is exit 3 with an explicit re-authorize instruction — it
    is never retried and never silently ignored.
    """
    payload = urllib.parse.urlencode({
        "client_id": cfg["google_oauth_client_id"],
        "client_secret": cfg["google_oauth_client_secret"],
        "refresh_token": cfg["google_oauth_refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    status, data = http_json(TOKEN_URL, method="POST", raw_body=payload,
                             content_type="application/x-www-form-urlencoded")
    if status != 200 or not isinstance(data, dict) or "access_token" not in data:
        detail = data.get("error_description") or data.get("error") if isinstance(data, dict) else data
        if isinstance(data, dict) and data.get("error") == "invalid_grant":
            die(f"refresh token rejected (invalid_grant): {detail}\n"
                f"       The token is revoked or expired. Re-run authorize.py and "
                f"update google_oauth_refresh_token in {config_path()}", code=3)
        die(f"token exchange failed (HTTP {status}): {detail}", code=3)
    return data["access_token"]

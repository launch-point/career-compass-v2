"""Upload an approved Career Compass report PDF to Drive and record the link.

Fires AFTER Gate 4 — Todd's visual approval of the finished PDF. It is not part
of the build, because the build finishing is not the same event as the report
being approved.

    # once, to create the reports folder (prints the id to paste into config)
    python upload_report.py --init-folder "Career Compass Reports"

    # per approved report
    python upload_report.py <report_data.json> <report.pdf> [--client-id UUID]

    # recovery: the file uploaded but the database write failed (exit 2)
    python upload_report.py <report_data.json> <report.pdf> --record-only FILE_ID

Ordering is deliberate: the client row is verified to exist BEFORE anything is
uploaded, so a wrong or missing id can never strand an orphan file in Drive.

Every Drive file gets a timestamped name and nothing is ever overwritten. A
revised report cannot destroy the copy a client may already have open.

Exit codes: 0 ok · 1 precondition/validation · 2 uploaded but NOT recorded · 3 auth.
"""
import argparse
import json
import re
import secrets
import sys
from datetime import datetime, timezone
from pathlib import Path

import cc_config as cfgmod

DRIVE_UPLOAD = ("https://www.googleapis.com/upload/drive/v3/files"
                "?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink")
DRIVE_FILES = "https://www.googleapis.com/drive/v3/files"
FOLDER_MIME = "application/vnd.google-apps.folder"
UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
                     r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")


# ── helpers ──────────────────────────────────────────────────────────────────

def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def safe_part(text):
    """Filename-safe token from a name part. May be empty — see drive_title."""
    return re.sub(r"[^A-Za-z0-9]+", "", text or "")


def drive_title(client_name, when=None):
    """{First}_{Last}_Career_Compass_Report_{YYYYMMDD-HHMMSS}.pdf

    Local time, so the stamp matches the clock of whoever ran it.
    """
    when = when or datetime.now()
    parts = (client_name or "").split()
    # Only the first name falls back to a placeholder; a one-word client name
    # must not become "Cher_Unknown".
    first = safe_part(parts[0] if parts else "") or "Unknown"
    last = safe_part(parts[-1] if len(parts) > 1 else "")
    stem = f"{first}_{last}" if last else first
    return f"{stem}_Career_Compass_Report_{when.strftime('%Y%m%d-%H%M%S')}.pdf"


def resolve_client_id(report, override):
    """--client-id wins; otherwise client.client_id from the report JSON.

    Absent is a workflow state (the report was built before the id was known).
    Malformed is a typo, which would write the link against nothing — a
    different failure, and a louder one.
    """
    value = override or (report.get("client") or {}).get("client_id") or ""
    value = str(value).strip()
    if not value:
        cfgmod.die("no client id: the report JSON has no client.client_id and "
                   "--client-id was not given.\n"
                   "       Rebuild with --client-id at the propose step, or pass "
                   "--client-id here.")
    if not UUID_RE.match(value):
        cfgmod.die(f"client id {value!r} is not a UUID. A malformed id would write "
                   f"the report link against no client row.")
    return value


# ── Drive ────────────────────────────────────────────────────────────────────

def create_folder(token, name):
    status, data = cfgmod.http_json(
        f"{DRIVE_FILES}?supportsAllDrives=true&fields=id,name",
        method="POST", headers=bearer(token),
        body={"name": name, "mimeType": FOLDER_MIME})
    if status not in (200, 201) or not isinstance(data, dict) or "id" not in data:
        cfgmod.die(f"folder creation failed (HTTP {status}): {data}")
    return data


def upload_pdf(token, folder_id, title, pdf_bytes):
    boundary = "cc" + secrets.token_hex(16)
    metadata = json.dumps({"name": title, "parents": [folder_id]}).encode()
    body = b"".join([
        f"--{boundary}\r\n".encode(),
        b"Content-Type: application/json; charset=UTF-8\r\n\r\n",
        metadata, b"\r\n",
        f"--{boundary}\r\n".encode(),
        b"Content-Type: application/pdf\r\n\r\n",
        pdf_bytes, b"\r\n",
        f"--{boundary}--\r\n".encode(),
    ])
    status, data = cfgmod.http_json(
        DRIVE_UPLOAD, method="POST", headers=bearer(token), raw_body=body,
        content_type=f"multipart/related; boundary={boundary}")
    if status not in (200, 201) or not isinstance(data, dict) or "id" not in data:
        if status == 404:
            cfgmod.die(f"Drive rejected the parent folder (HTTP 404): {data}\n"
                       f"       drive_reports_folder_id points at a folder this app "
                       f"cannot reach. With drive.file scope the app only sees folders "
                       f"it created — re-run with --init-folder and update the config.")
        cfgmod.die(f"upload failed (HTTP {status}): {data}")
    return data


def share_anyone(token, file_id):
    status, data = cfgmod.http_json(
        f"{DRIVE_FILES}/{file_id}/permissions?supportsAllDrives=true",
        method="POST", headers=bearer(token),
        body={"role": "reader", "type": "anyone"})
    if status not in (200, 201):
        cfgmod.die(f"could not set link sharing on {file_id} (HTTP {status}): {data}\n"
                   f"       The file is uploaded but is NOT publicly readable.", code=2)
    return data


def get_file(token, file_id):
    status, data = cfgmod.http_json(
        f"{DRIVE_FILES}/{file_id}?supportsAllDrives=true&fields=id,name,webViewLink",
        headers=bearer(token))
    if status != 200 or not isinstance(data, dict) or "id" not in data:
        cfgmod.die(f"could not read file {file_id} (HTTP {status}): {data}")
    return data


# ── Supabase ─────────────────────────────────────────────────────────────────

def sb_headers(key, extra=None):
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"}
    h.update(extra or {})
    return h


def require_client_row(url, key, client_id):
    """Confirm the row exists BEFORE uploading anything."""
    status, data = cfgmod.http_json(
        f"{url}/rest/v1/clients?id=eq.{client_id}&select=id,email",
        headers=sb_headers(key))
    if status != 200:
        cfgmod.die(f"Supabase lookup failed (HTTP {status}): {data}")
    if not isinstance(data, list) or not data:
        cfgmod.die(f"no clients row with id {client_id}. Nothing was uploaded.")
    return data[0]


def record_link(url, key, client_id, file_id, link, name):
    payload = {
        "report_drive_file_id": file_id,
        "report_drive_link": link,
        "report_file_name": name,
        "report_uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    status, data = cfgmod.http_json(
        f"{url}/rest/v1/clients?id=eq.{client_id}",
        method="PATCH", headers=sb_headers(key, {"Prefer": "return=representation"}),
        body=payload)
    return status, data


def stranded(file_id, link, message):
    """Uploaded to Drive but not recorded. The one partial worth designing for."""
    print("\n" + "=" * 68, file=sys.stderr)
    print("UPLOADED BUT NOT RECORDED", file=sys.stderr)
    print("=" * 68, file=sys.stderr)
    print(f"The PDF is in Drive but the database write failed:\n  {message}\n",
          file=sys.stderr)
    print(f"  file id : {file_id}", file=sys.stderr)
    print(f"  link    : {link}\n", file=sys.stderr)
    print("Re-run with --record-only to finish the database write WITHOUT "
          "uploading a second copy:", file=sys.stderr)
    print(f"  upload_report.py <report_data.json> <report.pdf> "
          f"--record-only {file_id}\n", file=sys.stderr)
    sys.exit(2)


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("report_json", nargs="?", help="the built {client}_client_report_data.json")
    ap.add_argument("pdf", nargs="?", help="the approved report PDF")
    ap.add_argument("--client-id", default=None,
                    help="override client.client_id from the report JSON")
    ap.add_argument("--record-only", metavar="FILE_ID", default=None,
                    help="skip the upload; record an already-uploaded Drive file")
    ap.add_argument("--init-folder", metavar="NAME", default=None,
                    help="create the reports folder once and print its id")
    args = ap.parse_args()

    # --- one-time folder creation ---
    if args.init_folder:
        cfg = cfgmod.load_google(require=("google_oauth_client_id",
                                          "google_oauth_client_secret",
                                          "google_oauth_refresh_token"))
        folder = create_folder(cfgmod.access_token(cfg), args.init_folder)
        print(f"Created Drive folder {folder['name']!r}")
        print(f"  id: {folder['id']}\n")
        print(f"Set this as drive_reports_folder_id in {cfgmod.config_path()}")
        print("Then move your existing report files into that folder in Drive.")
        return 0

    if not args.report_json or not args.pdf:
        ap.error("need <report_data.json> and <report.pdf> (or --init-folder NAME)")

    # --- preconditions, cheapest first ---
    report_path, pdf_path = Path(args.report_json), Path(args.pdf)
    if not report_path.exists():
        cfgmod.die(f"no report JSON at {report_path}")
    try:
        report = json.loads(report_path.read_text())
    except json.JSONDecodeError as e:
        cfgmod.die(f"{report_path} is not valid JSON: {e}")

    client_id = resolve_client_id(report, args.client_id)
    client_name = (report.get("client") or {}).get("name", "")

    if not pdf_path.exists():
        cfgmod.die(f"no PDF at {pdf_path}")
    pdf_bytes = pdf_path.read_bytes()
    if not pdf_bytes:
        cfgmod.die(f"{pdf_path} is empty")
    if not pdf_bytes.startswith(b"%PDF"):
        cfgmod.die(f"{pdf_path} does not start with %PDF — not a PDF")

    cfg = cfgmod.load_google()
    sb_url, sb_key = cfgmod.load_supabase()
    token = cfgmod.access_token(cfg)

    # Verify the destination row BEFORE touching Drive.
    row = require_client_row(sb_url, sb_key, client_id)
    print(f"client {client_id} ({row.get('email', 'no email')}) — row confirmed")

    # --- upload, or adopt an already-uploaded file ---
    if args.record_only:
        meta = get_file(token, args.record_only)
        print(f"recording existing Drive file {meta['id']} ({meta['name']})")
    else:
        title = drive_title(client_name)
        meta = upload_pdf(token, cfg["drive_reports_folder_id"], title, pdf_bytes)
        print(f"uploaded {meta['name']} ({len(pdf_bytes):,} bytes) -> {meta['id']}")
        share_anyone(token, meta["id"])
        # Re-read rather than constructing the link by hand: webViewLink is the
        # API's answer, and it changes shape for different file types.
        meta = get_file(token, meta["id"])
        print("link sharing set: anyone with the link can view")

    link = meta.get("webViewLink")
    if not link:
        stranded(meta["id"], "(none returned)",
                 "Drive returned no webViewLink for the file")

    # --- record ---
    status, data = record_link(sb_url, sb_key, client_id, meta["id"], link, meta["name"])
    if status not in (200, 204):
        stranded(meta["id"], link, f"Supabase PATCH returned HTTP {status}: {data}")
    if isinstance(data, list) and not data:
        stranded(meta["id"], link,
                 f"Supabase PATCH matched no row for id {client_id}")

    print("\nRecorded against the client row.")
    print(f"  file id : {meta['id']}")
    print(f"  link    : {link}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

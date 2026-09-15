"""Send a client the "your report is ready" Circle DM and record that it went out.

Fires AFTER the Drive upload, which itself fires after Gate 4. Standalone for
now: Todd runs it by hand, and it asks before sending. Not wired to Gate 4.

    # preview everything, send nothing, write nothing
    python send_circle_dm.py --client-id UUID --dry-run

    # send (asks for confirmation first)
    python send_circle_dm.py --client-id UUID

    # recovery: the DM sent but the database write failed (exit 2)
    python send_circle_dm.py --client-id UUID --record-only MESSAGE_ID CHAT_ROOM_UUID SENT_AT

Refuses, before anything is sent, when:
  * there is no clients row for the id, or it has no email
  * report_drive_link is empty — there is no report for the DM to announce
  * this report was already announced (circle_dm_report_drive_file_id matches
    report_drive_file_id; see migration 0003)
  * the client's email is not an active member of the Circle community
  * Circle has no first name for them — the greeting is never guessed

The message carries no link on purpose. It points the client into Job Tracker,
where screen 3 shows the report; a Drive link would bypass that chain.

The DM is sent by the Circle Admin API v2 token's owner (Todd): the API has no
sender field, and Circle refuses a DM to the token owner's own account. Admin v2
has no endpoint that names the token's owner, so the sender is only known from
Circle's response — it is printed after the send, not before.

KNOWN LIMITATION — must be closed before this runs unattended at Gate 4:
after an exit 2 (sent, not recorded), nothing in the database stops a plain
re-run from sending a SECOND DM, because the record that check 6 reads was
never written. Today the printed warning and the confirm prompt are the only
guard, which works only while Todd runs the command and reads the output. The
fix is a pre-send marker written before the send. Deliberately not built yet.
(Todd, Sept 14 2026)

Exit codes: 0 ok · 1 precondition/validation/declined · 2 sent but NOT recorded · 3 auth.
"""
import argparse
import json
import re
import sys
import urllib.parse
from datetime import datetime, timezone

import cc_config as cfgmod

CIRCLE_API = "https://app.circle.so/api/admin/v2"
UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
                     r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
CONFIRM_WORD = "send"
DM_COLUMNS = ("circle_dm_sent_at", "circle_dm_message_id",
              "circle_dm_chat_room_uuid", "circle_dm_report_drive_file_id")


def message_text(first_name):
    """Todd's wording, verbatim (Sept 14 2026). Only the first name varies."""
    return (f"Hey {first_name}, your Career Compass report is ready! Head over to "
            f"your Job Tracker in the Career Compass section to see your results!")


def rich_text_body(text):
    """One paragraph of plain text, in the tiptap shape Admin v2 accepted.

    Verified against a real send (Sept 14 2026): Circle stored this body as
    given. circle_ios_fallback_text is carried on the node and the whole message.
    """
    return {
        "body": {"type": "doc", "content": [{"type": "paragraph", "content": [
            {"type": "text", "text": text, "circle_ios_fallback_text": text},
        ]}]},
        "circle_ios_fallback_text": text,
        "format": "chat",
    }


# ── Supabase ─────────────────────────────────────────────────────────────────

def sb_headers(key, extra=None):
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"}
    h.update(extra or {})
    return h


def read_client(url, key, client_id):
    select = ",".join(("id", "email", "report_drive_link", "report_drive_file_id",
                       "report_uploaded_at") + DM_COLUMNS)
    status, data = cfgmod.http_json(
        f"{url}/rest/v1/clients?id=eq.{client_id}&select={select}",
        headers=sb_headers(key))
    if status == 400 and "circle_dm" in json.dumps(data):
        cfgmod.die("the clients table has no circle_dm_* columns — apply "
                   "intake-app/supabase/migrations/0003_circle_dm.sql first.\n"
                   f"       Supabase said: {data}")
    if status != 200:
        cfgmod.die(f"Supabase lookup failed (HTTP {status}): {data}")
    if not isinstance(data, list) or not data:
        cfgmod.die(f"no clients row with id {client_id}. Nothing was sent.")
    return data[0]


def record_dm(url, key, client_id, message_id, chat_room_uuid, sent_at, report_file_id):
    """`sent_at` is Circle's own timestamp for the message, never the time of writing."""
    payload = {
        "circle_dm_sent_at": sent_at,
        "circle_dm_message_id": str(message_id),
        "circle_dm_chat_room_uuid": chat_room_uuid,
        "circle_dm_report_drive_file_id": report_file_id,
    }
    return cfgmod.http_json(
        f"{url}/rest/v1/clients?id=eq.{client_id}",
        method="PATCH", headers=sb_headers(key, {"Prefer": "return=representation"}),
        body=payload)


# ── Circle ───────────────────────────────────────────────────────────────────

def circle_headers(token):
    return {"Authorization": f"Token {token}", "Accept": "application/json"}


def auth_failed(status, data):
    cfgmod.die(f"Circle rejected the token (HTTP {status}): {data}\n"
               f"       Check circle_admin_v2_token in {cfgmod.config_path()}", code=3)


def find_member(token, email):
    status, data = cfgmod.http_json(
        f"{CIRCLE_API}/community_members/search?email={urllib.parse.quote(email)}",
        headers=circle_headers(token))
    if status in (401, 403) and not (isinstance(data, dict) and data.get("cloudflare_error")):
        auth_failed(status, data)
    if status == 404:
        cfgmod.die(f"{email} is not a member of the Circle community. Nothing was sent.")
    if status != 200 or not isinstance(data, dict) or "id" not in data:
        cfgmod.die(f"Circle member lookup failed (HTTP {status}): {data}")
    if data.get("email", "").lower() != email.lower():
        cfgmod.die(f"Circle returned member {data.get('email')!r} for {email!r}. Nothing was sent.")
    if not data.get("active"):
        cfgmod.die(f"Circle member {email} is not active. Nothing was sent.")
    if not str(data.get("first_name") or "").strip():
        cfgmod.die(f"Circle has no first name for {email}. The greeting is never "
                   f"guessed; set it in Circle first. Nothing was sent.")
    return data


def send_dm(token, email, text):
    status, data = cfgmod.http_json(
        f"{CIRCLE_API}/messages", method="POST", headers=circle_headers(token),
        body={"user_email": email, "rich_text_body": rich_text_body(text)})
    if status in (401, 403) and not (isinstance(data, dict) and data.get("cloudflare_error")):
        auth_failed(status, data)
    msg = data.get("chat_room_message") if isinstance(data, dict) else None
    if status != 200 or not isinstance(msg, dict) or not msg.get("id"):
        # Not sent, as far as the API says. Nothing to record.
        cfgmod.die(f"Circle did not send the DM (HTTP {status}): {data}")
    return msg


def parse_sent_at(value):
    """An ISO-8601 timestamp with a timezone, as Circle returns it. Returned unchanged."""
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (AttributeError, ValueError):
        return None
    return value if parsed.tzinfo else None


def stranded(client_id, message_id, chat_room_uuid, sent_at, message):
    """Sent but not recorded. Re-running the send would DM the client twice."""
    print("\n" + "=" * 68, file=sys.stderr)
    print("SENT BUT NOT RECORDED", file=sys.stderr)
    print("=" * 68, file=sys.stderr)
    print(f"The client has the DM but the database write failed:\n  {message}\n",
          file=sys.stderr)
    print(f"  message id : {message_id}", file=sys.stderr)
    print(f"  chat room  : {chat_room_uuid}", file=sys.stderr)
    print(f"  sent at    : {sent_at}\n", file=sys.stderr)
    print("Do NOT re-run the send — nothing in the database would stop a second DM.",
          file=sys.stderr)
    print("Finish the record without sending again:", file=sys.stderr)
    print(f"  send_circle_dm.py --client-id {client_id} "
          f"--record-only {message_id} {chat_room_uuid} {sent_at}\n", file=sys.stderr)
    sys.exit(2)


# ── main ─────────────────────────────────────────────────────────────────────

class ArgParser(argparse.ArgumentParser):
    """argparse exits 2 on a usage error, and 2 here means SENT BUT NOT RECORDED.

    A caller reading exit codes (Gate 4, later) must never mistake a typo for a
    DM that went out, so usage errors exit 1 like every other precondition.
    """
    def error(self, message):
        self.print_usage(sys.stderr)
        cfgmod.die(message)


def main():
    ap = ArgParser(description=__doc__,
                   formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--client-id", required=True, help="clients.id (UUID)")
    ap.add_argument("--dry-run", action="store_true",
                    help="run every check and show the message; send and write nothing")
    ap.add_argument("--record-only", nargs=3,
                    metavar=("MESSAGE_ID", "CHAT_ROOM_UUID", "SENT_AT"),
                    help="skip the send; record a DM that already went out "
                         "(all three values are printed by the exit-2 message)")
    args = ap.parse_args()
    if args.dry_run and args.record_only:
        ap.error("--dry-run and --record-only are mutually exclusive")

    client_id = args.client_id.strip()
    if not UUID_RE.match(client_id):
        cfgmod.die(f"client id {client_id!r} is not a UUID")
    if args.record_only and not parse_sent_at(args.record_only[2]):
        cfgmod.die(f"SENT_AT {args.record_only[2]!r} is not an ISO-8601 timestamp with a "
                   f"timezone. Copy it from the exit-2 message. Nothing was written.")

    sb_url, sb_key = cfgmod.load_supabase()
    row = read_client(sb_url, sb_key, client_id)
    email = (row.get("email") or "").strip()
    link = (row.get("report_drive_link") or "").strip()
    file_id = (row.get("report_drive_file_id") or "").strip()
    if not email:
        cfgmod.die(f"clients row {client_id} has no email. Nothing was sent.")
    print(f"client {client_id} ({email}) — row confirmed")

    if not link:
        cfgmod.die("report_drive_link is empty: there is no uploaded report to "
                   "announce. Nothing was sent.")
    if not file_id:
        cfgmod.die("report_drive_link is set but report_drive_file_id is empty, so "
                   "the DM could not be tied to a report. Nothing was sent.")

    # --- recovery: record a DM that already went out, send nothing ---
    if args.record_only:
        message_id, chat_room_uuid, sent_at = args.record_only
        status, data = record_dm(sb_url, sb_key, client_id, message_id,
                                 chat_room_uuid, sent_at, file_id)
        if status not in (200, 204) or (isinstance(data, list) and not data):
            cfgmod.die(f"Supabase PATCH failed (HTTP {status}): {data}")
        print(f"Recorded DM {message_id} (chat room {chat_room_uuid}, sent {sent_at}) "
              f"against report {file_id}. Nothing was sent.")
        return 0

    if row.get("circle_dm_report_drive_file_id") == file_id:
        cfgmod.die(f"this report was already announced: DM {row.get('circle_dm_message_id')} "
                   f"sent {row.get('circle_dm_sent_at')} for Drive file {file_id}. "
                   f"Nothing was sent.")

    token = cfgmod.load_circle()
    member = find_member(token, email)
    first_name = member["first_name"].strip()
    text = message_text(first_name)

    print("\nAbout to send this Circle DM")
    print(f"  from      : the owner of circle_admin_v2_token (Circle names the "
          f"sender only after sending)")
    print(f"  to        : {member.get('name')} <{member['email']}>  "
          f"(Circle member {member['id']})")
    print(f"  profile   : {member.get('profile_url')}")
    print(f"  first name: {first_name!r}   <- from Circle; check it")
    print(f"  report    : {file_id}  (uploaded {row.get('report_uploaded_at')})")
    if row.get("circle_dm_sent_at"):
        print(f"  previous  : DM sent {row['circle_dm_sent_at']} for an EARLIER report "
              f"({row.get('circle_dm_report_drive_file_id')})")
    print(f"\n  {text}\n")

    if args.dry_run:
        print("--dry-run: nothing sent, nothing written.")
        return 0

    try:
        answer = input(f"Type '{CONFIRM_WORD}' to send it, anything else to stop: ")
    except EOFError:
        answer = ""
    if answer.strip() != CONFIRM_WORD:
        cfgmod.die("not confirmed. Nothing was sent.")

    msg = send_dm(token, member["email"], text)
    message_id, chat_room_uuid = msg["id"], msg.get("chat_room_uuid")
    sender = (msg.get("sender") or {}).get("name") or "(Circle returned no sender)"
    sent_at = msg.get("sent_at")
    print(f"sent: message {message_id} in chat room {chat_room_uuid}, from {sender}")

    if not parse_sent_at(sent_at):
        stranded(client_id, message_id, chat_room_uuid, sent_at,
                 f"Circle returned no usable sent_at ({sent_at!r}), so the record "
                 f"was not written rather than guessing a time")
    status, data = record_dm(sb_url, sb_key, client_id, message_id, chat_room_uuid,
                             sent_at, file_id)
    if status not in (200, 204):
        stranded(client_id, message_id, chat_room_uuid, sent_at,
                 f"Supabase PATCH returned HTTP {status}: {data}")
    if isinstance(data, list) and not data:
        stranded(client_id, message_id, chat_room_uuid, sent_at,
                 f"Supabase PATCH matched no row for id {client_id}")

    print("\nRecorded against the client row.")
    print(f"  message id : {message_id}")
    print(f"  chat room  : {chat_room_uuid}")
    print(f"  sent at    : {sent_at}")
    print(f"  sender     : {sender}")
    print(f"  report     : {file_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

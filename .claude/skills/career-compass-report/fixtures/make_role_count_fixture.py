#!/usr/bin/env python3
"""
Role-count fixture generator — synthesize an N-role client JSON from a real one.

The report supports a variable number of roles (see MIN_ROLES / MAX_ROLES in
report_template.py), but real client data only ever has the count that client
was actually given. To exercise pagination, TOC page numbering and the
graph cut-off at other counts, this extends a real client JSON up to N roles by
cycling through its existing roles and relabelling the copies.

WHY THIS IS A SCRIPT AND NOT A COMMITTED FIXTURE
------------------------------------------------
The output is derived from real client data — real salary figures, function
alignments, value narratives, day-to-day content. Committing it would move
client content into git, which is exactly what gitignoring `reports/` exists to
prevent. So the output goes to a temp path by default and is never committed;
only this generator is. Point it at whatever client JSON you have locally.

WHAT THE OUTPUT DOES AND DOESN'T PROVE
--------------------------------------
Roles past the source's own count are duplicates under synthetic titles. A build
from this proves **structure** — page counts, TOC accuracy, which roles carry a
graph, that conditional blocks still fire. It proves **nothing about content**,
since roles 6+ are copies. Keep the real client JSON as the end-to-end
regression and treat this as structural-only. Say which is which when reporting
results.

USAGE
    PY=.claude/skills/career-compass-report/.venv/bin/python
    GEN=.claude/skills/career-compass-report/fixtures/make_role_count_fixture.py

    # synthesize 7 roles, print the temp path it wrote
    $PY $GEN <client_report_data.json> 7

    # build a report from it
    $PY $GEN <client_report_data.json> 10 --out /tmp/ten.json
    $PY .claude/skills/career-compass-report/report_template.py /tmp/ten.json /tmp/ten.pdf

N is not clamped to the report's supported range on purpose — passing 3 or 11 is
how you check that report_template.py's own guard rejects them.
"""

import argparse
import copy
import json
import os
import sys
import tempfile
from pathlib import Path


def synthesize(data, target_n):
    """Return a copy of `data` extended to `target_n` roles.

    Copies cycle through the source's own roles in order, so the synthetic
    roles inherit a realistic spread of functions, seniority levels and
    conditional fields (seniority_note, zero-scoring functions, empty value
    alignments) rather than repeating one role's shape N times.
    """
    out = copy.deepcopy(data)
    roles = out["roles"]
    base_count = len(roles)

    if base_count == 0:
        raise SystemExit("Source JSON has no roles to synthesize from.")
    if target_n < base_count:
        raise SystemExit(
            f"Cannot shrink: source has {base_count} roles, target is {target_n}. "
            f"This only extends. Slice the JSON by hand if you need fewer."
        )

    while len(roles) < target_n:
        rank = len(roles) + 1
        src = copy.deepcopy(roles[(len(roles) - base_count) % base_count])
        src["rank"] = rank
        src["title"] = f"Synthesized Role {rank}"
        src["alt_titles"] = [f"Alt Title {rank}A", f"Alt Title {rank}B"]
        roles.append(src)

    return out


def main():
    ap = argparse.ArgumentParser(
        description="Synthesize an N-role client JSON from a real one (structural testing only)."
    )
    ap.add_argument("client_json", help="path to a real <client>_client_report_data.json")
    ap.add_argument("target_n", type=int, help="how many roles the output should have")
    ap.add_argument("--out", default=None,
                    help="output path (default: a temp file, printed on stdout)")
    args = ap.parse_args()

    src_path = Path(args.client_json)
    if not src_path.exists():
        raise SystemExit(f"No such file: {src_path}")

    with open(src_path) as f:
        data = json.load(f)
    if "roles" not in data:
        raise SystemExit(f"{src_path} has no 'roles' key — is this a client report JSON?")

    base_count = len(data["roles"])
    out_data = synthesize(data, args.target_n)

    if args.out:
        out_path = Path(args.out)
        # The output carries real client content. Warn loudly if it is being
        # written somewhere git might pick it up.
        repo = Path(__file__).resolve().parents[4]
        try:
            rel = out_path.resolve().relative_to(repo)
            print(f"WARNING: writing client-derived data inside the repo at {rel}.\n"
                  f"         `reports/` is gitignored; anywhere else is not. "
                  f"Do not commit this file.",
                  file=sys.stderr)
        except ValueError:
            pass  # outside the repo, which is the intended case
    else:
        fd, tmp = tempfile.mkstemp(prefix=f"cc_roles{args.target_n}_", suffix=".json")
        os.close(fd)
        out_path = Path(tmp)

    out_path.write_text(json.dumps(out_data, indent=2))

    synth = args.target_n - base_count
    print(f"{src_path.name}: {base_count} real roles -> {args.target_n} total "
          f"({synth} synthesized, structural testing only)")
    print(out_path)


if __name__ == "__main__":
    main()

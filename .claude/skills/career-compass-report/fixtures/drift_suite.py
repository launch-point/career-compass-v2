#!/usr/bin/env python3
"""Drift suite for parse_research_markdown.py.

Mutates a real research document in memory and asserts the parser reacts the
way it is supposed to. Every scenario here is a drift that has either already
happened or is one edit away from happening.

The document and judgment file are ARGUMENTS, never committed: they contain
real client content, and `reports/` is gitignored precisely to keep that out of
git. Nothing is written outside a temp directory.

    PY=.claude/skills/career-compass-report/.venv/bin/python
    $PY .claude/skills/career-compass-report/fixtures/drift_suite.py \
        <research.md> <judgment.json>

Exit status is 0 only if every scenario behaves as specified.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PARSER = HERE.parent / "parse_research_markdown.py"
PY = sys.executable


def run(md_text, judgment_path, extra=()):
    """Run the parser on mutated text. Returns (exit_code, combined_output)."""
    with tempfile.TemporaryDirectory() as td:
        md = Path(td) / "drift.md"
        md.write_text(md_text)
        out = Path(td) / "out.json"
        p = subprocess.run(
            [PY, str(PARSER), str(md), str(judgment_path), str(out),
             "--client", "Test Client", "--report-date", "September 7, 2026", *extra],
            capture_output=True, text=True)
        payload = json.loads(out.read_text()) if out.exists() else None
        return p.returncode, p.stdout + p.stderr, payload


# ── mutations ───────────────────────────────────────────────────────────────
def sections(md):
    return list(re.finditer(r"^##[ \t]+(.+?)[ \t]*$", md, re.M))


def role_span(md, heading):
    """(start, end) character span of the `## heading` section."""
    ms = sections(md)
    for i, m in enumerate(ms):
        if m.group(1).strip() == heading:
            return m.start(), (ms[i + 1].start() if i + 1 < len(ms) else len(md))
    raise SystemExit(f"drift suite: no section {heading!r} in the base document")


def drop_role(md, heading):
    a, b = role_span(md, heading)
    return md[:a] + md[b:]


def in_role(md, heading, fn):
    a, b = role_span(md, heading)
    return md[:a] + fn(md[a:b]) + md[b:]


def drop_nth_bullet(block, subsection, n):
    """Remove the nth bullet from a `### subsection` inside a role block."""
    m = re.search(rf"^###[ \t]+{subsection}[^\n]*$", block, re.M | re.I)
    head_end = m.end()
    nxt = re.search(r"^#{2,3}[ \t]+", block[head_end:], re.M)
    body_end = head_end + (nxt.start() if nxt else len(block) - head_end)
    body = block[head_end:body_end]
    bullets = [l for l in body.split("\n") if re.match(r"^[ \t]*[-*+][ \t]+\S", l)]
    target = bullets[n]
    return block[:head_end] + body.replace(target + "\n", "", 1) + block[body_end:]


def reverse_bullets(block, subsection):
    m = re.search(rf"^###[ \t]+{subsection}[^\n]*$", block, re.M | re.I)
    head_end = m.end()
    nxt = re.search(r"^#{2,3}[ \t]+", block[head_end:], re.M)
    body_end = head_end + (nxt.start() if nxt else len(block) - head_end)
    body = block[head_end:body_end]
    lines = body.split("\n")
    idx = [i for i, l in enumerate(lines) if re.match(r"^[ \t]*[-*+][ \t]+\S", l)]
    picked = [lines[i] for i in idx][::-1]
    for slot, val in zip(idx, picked):
        lines[slot] = val
    return block[:head_end] + "\n".join(lines) + block[body_end:]


def edit_first_fm_bullet(block, fn):
    """Rewrite the first Functional Mix bullet via fn(line) -> line."""
    m = re.search(r"^###[ \t]+Functional\s+Mix[^\n]*$", block, re.M | re.I)
    head_end = m.end()
    nxt = re.search(r"^#{2,3}[ \t]+", block[head_end:], re.M)
    body_end = head_end + (nxt.start() if nxt else len(block) - head_end)
    body = block[head_end:body_end]
    for line in body.split("\n"):
        if re.match(r"^[ \t]*[-*+][ \t]+\S", line):
            return block[:head_end] + body.replace(line, fn(line), 1) + block[body_end:]
    raise SystemExit("drift suite: no Functional Mix bullet found")


def to_v1_format(md):
    """v1 shape: no `Rank:` lines, bulleted client profile, v1 heading names."""
    md = re.sub(r"^Rank:[ \t]*\d+[ \t]*\n\n?", "", md, flags=re.M)
    md = re.sub(r"^(\d+)\.[ \t]+", "- ", md, flags=re.M)
    md = md.replace("WORK PREFERENCES:", "STANDARD INTAKE:")
    md = md.replace("### Technical Requirements", "### Technical Requirements & Upskilling")
    md = md.replace("### Travel", "### Travel, Schedule & Office Findings")
    return md


# ── scenarios ───────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    base = Path(sys.argv[1]).read_text()
    supplied = json.loads(Path(sys.argv[2]).read_text())
    jkeys = [k for k in supplied if not k.startswith("_")]

    # The drift scenarios exercise PARSING, so they get a confirmed copy of the
    # judgment; the gate gets its own scenario below. Written beside the real
    # file, never over it.
    tmpdir = Path(tempfile.mkdtemp(prefix="drift_judgment_"))
    confirmed = dict(supplied); confirmed["_confirmed"] = True
    judgment = tmpdir / "confirmed.json"
    judgment.write_text(json.dumps(confirmed, indent=2))
    unconfirmed = tmpdir / "unconfirmed.json"
    u = dict(supplied); u.pop("_confirmed", None)
    unconfirmed.write_text(json.dumps(u, indent=2))

    heads = [m.group(1).strip() for m in sections(base)]
    roles = [h for h in heads if h in jkeys]
    if len(roles) < 3:
        raise SystemExit("drift suite: base document + judgment must cover >=3 roles")
    first, third = roles[0], roles[2]

    # (name, mutated markdown, expect_exit, expect_codes, forbid_codes)
    cases = [
        ("baseline unmutated",
         base, 0, [], ["FAIL"]),

        # Drop a MIDDLE role: ranks skip a number, which is detectable.
        ("dropped role leaves a rank gap",
         drop_role(base, roles[len(roles) // 2]), 1, ["RANK_GAP"], []),

        # Dropping the LAST role is NOT detectable by rank alone - ranks 1..N-1
        # in an (N-1)-role document is exactly what a legitimate shorter
        # document looks like. Asserted so the limit is recorded, not assumed
        # away: catching this needs an expected count from outside the document.
        ("dropping the last role is undetectable by rank (documented limit)",
         drop_role(base, roles[-1]), 0, [], ["RANK_GAP"]),

        ("duplicate rank is caught",
         in_role(base, third, lambda b: re.sub(r"^Rank:.*$", "Rank: 1", b, count=1, flags=re.M)),
         1, ["RANK_DUPLICATE"], []),

        ("dropped value is caught",
         in_role(base, first, lambda b: drop_nth_bullet(b, r"Why\s+This\s+Fits\s+You", 2)),
         1, ["VALUE_ABSENT"], []),

        ("reordered values still map by name",
         in_role(base, first, lambda b: reverse_bullets(b, r"Why\s+This\s+Fits\s+You")),
         0, ["VALUE_ORDER"], ["VALUE_ABSENT"]),

        # The specific bug: drop ONE top-5 function. A Next-5 function slides
        # into the slot, the bullet count still reads 5, and a top function
        # vanishes. Presence must be checked by name, not by count.
        ("omitted top function is caught despite an unchanged bullet count",
         in_role(base, first, lambda b: drop_nth_bullet(b, r"Functional\s+Mix", 1)),
         1, ["TOP_FUNCTION_ABSENT"], []),

        ("heading case drift costs nothing",
         base.replace("### Functional Mix", "### FUNCTIONAL MIX")
             .replace("### Why This Fits You", "### why this fits you")
             .replace("### Technical Requirements", "###   Technical   Requirements"),
         0, [], ["FAIL"]),

        ("shuffled field order costs nothing",
         re.sub(r"^Rank:[ \t]*(\d+)[ \t]*\n\n(Alternate titles:[^\n]*)\n",
                r"\2\nRank: \1\n", base, flags=re.M),
         0, [], ["FAIL"]),

        # v2.4 restored the description tail. It is required above 0%,
        # forbidden at 0%, and must not simply restate the function name.
        ("missing description tail above 0% is a hard failure",
         in_role(base, first, lambda b: edit_first_fm_bullet(
             b, lambda l: re.sub(r"(%[ \t]*)[—–-][ \t]*.*$", r"\1", l))),
         1, ["FUNCTION_DESC_MISSING"], []),

        ("a tail on a 0% function contradicts its percentage",
         in_role(base, first, lambda b: edit_first_fm_bullet(
             b, lambda l: re.sub(r"~[ \t]*\d{1,3}[ \t]*%", "~0%", l))),
         0, ["FUNCTION_DESC_ON_ZERO"], ["FUNCTION_DESC_MISSING"]),

        ("a tail that only restates the function name is flagged",
         in_role(base, first, lambda b: edit_first_fm_bullet(
             b, lambda l: re.sub(r"(%[ \t]*)[—–-][ \t]*.*$",
                                 "\\1\u2014 " + l.split(":")[0].lstrip("- ").strip(), l))),
         0, ["FUNCTION_DESC_RESTATES_NAME"], []),

        ("a v1-format document is rejected, not silently mis-parsed",
         to_v1_format(base), 1, ["FIELD_MISSING"], []),
    ]

    # The human gate: an unconfirmed judgment must refuse to build, whatever
    # else is correct about the document.
    gate_code, gate_out, _ = run(base, unconfirmed)
    gate_ok = gate_code == 1 and "JUDGMENT_UNCONFIRMED" in gate_out

    width = max(len(c[0]) for c in cases)
    failures = 0
    for name, text, want_exit, want, forbid in cases:
        code, out, payload = run(text, judgment)
        codes = set(re.findall(r"(?:FAIL|WARN)[ \t]+\[([A-Z_]+)\]", out))
        levels = set(re.findall(r"^\s*(FAIL|WARN)[ \t]+\[", out, re.M))
        problems = []
        if code != want_exit:
            problems.append(f"exit {code}, wanted {want_exit}")
        for w in want:
            if w not in codes:
                problems.append(f"missing {w}")
        for f in forbid:
            if f in ("FAIL", "WARN"):
                if f in levels:
                    problems.append(f"unexpected {f}-level finding")
            elif f in codes:
                problems.append(f"unexpected {f}")
        # the reorder case must still land every value in its profile slot
        if name.startswith("reordered") and payload:
            vals = payload["roles"][0]["value_alignments"]
            if not all(vals):
                problems.append("a value slot came back empty after reordering")
        status = "PASS" if not problems else "FAIL"
        failures += bool(problems)
        print(f"  {status}  {name:<{width}}  exit={code} codes={sorted(codes) or '[]'}")
        for p in problems:
            print(f"          -> {p}")

    gate_codes = (["JUDGMENT_UNCONFIRMED"] if gate_ok
                  else sorted(set(re.findall(r"\[([A-Z_]+)\]", gate_out))))
    gate_status = "PASS" if gate_ok else "FAIL"
    gate_name = "an unconfirmed judgment refuses to build"
    print(f"  {gate_status}  {gate_name:<{width}}  exit={gate_code} codes={gate_codes}")
    failures += (not gate_ok)
    total = len(cases) + 1
    print(f"\n{total - failures}/{total} scenarios passed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()

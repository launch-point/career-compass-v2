#!/usr/bin/env python3
"""Parse a Stage-2 deep-research markdown file into the v15 report JSON schema.

Client-agnostic. Everything the markdown actually states is parsed from it:
client profile, alt titles, Functional Mix (names + percentages + descriptions),
Why This Fits You value narratives, and the three Day-to-Day sections.

Two things the markdown does NOT state have to be supplied in a judgment file,
because they are decisions rather than findings:

  * `function`        which of the 9 fixed business functions the role sits in
  * `seniority_level` Specialist / Integrator / Strategist (the graph's y-axis;
                      a different scale from the source's Director/Manager/IC
                      eligibility tiers, so the mapping is a judgment call)
  * salary low/avg/high integers, since the source gives prose ranges
  * `salary_context`, `seniority_note`, and an optional shorter `title`

Judgment file shape — a JSON object keyed by the role heading exactly as it
appears in the markdown:

  {
    "Program Director": {
      "function": "Operations",
      "seniority": "Strategist",
      "low": 101000, "avg": 113000, "high": 125000,
      "salary_context": "...",
      "seniority_note": "",
      "title": "optional shorter title for the report"
    }
  }

Usage:
    python parse_research_markdown.py <research.md> <judgment.json> <out.json> \
        --client "Full Name" [--report-date "September 4, 2026"]

Citation markers of the form [cite:N] are stripped everywhere; the script
asserts none survive into the output.
"""
import argparse, json, re
from pathlib import Path
from datetime import date

ap = argparse.ArgumentParser(description=__doc__,
                             formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("markdown"); ap.add_argument("judgment"); ap.add_argument("out")
ap.add_argument("--client", required=True, help="Client full name")
ap.add_argument("--report-date", default=None,
                help='Defaults to today, e.g. "September 4, 2026"')
args = ap.parse_args()

SRC = Path(args.markdown)
OUT = Path(args.out)
JUDGMENT = json.loads(Path(args.judgment).read_text())
REPORT_DATE = args.report_date or date.today().strftime("%B %-d, %Y")
CLIENT_NAME = args.client

CITE = re.compile(r"\s*\[cite:\d+\]")
strip = lambda s: CITE.sub("", s or "").strip()

md = SRC.read_text()

# ── client profile ──────────────────────────────────────────────────────────
def block(label):
    m = re.search(rf"{label}[^\n]*\n((?:- .*\n)+)", md)
    return [strip(l[2:]) for l in m.group(1).strip().split("\n")] if m else []

intake = {strip(k): strip(v) for k, v in
          (l.split(":", 1) for l in block(r"STANDARD INTAKE") if ":" in l)}
TOP5_FUNCTIONS = block(r"TOP 5 FUNCTIONS")
TOP5_VALUES = block(r"TOP 5 VALUES")

def first_sentence(text):
    """Split into (lead sentence, remainder).

    The template renders these as "{title}: {description}", so the lead
    sentence must not keep its terminal period or the page shows ".:".
    """
    m = re.match(r"(.+?[.!?])(?:\s+|$)(.*)", text, re.S)
    lead, rest = (m.group(1).strip(), m.group(2).strip()) if m else (text.strip(), "")
    return lead.rstrip(".").strip(), rest

def bullets(chunk, section):
    m = re.search(rf"### {re.escape(section)}\n((?:[-*] .*\n)+)", chunk)
    return [strip(b[2:]) for b in m.group(1).strip().split("\n")] if m else []

# ── roles ───────────────────────────────────────────────────────────────────
roles = []
for rank, chunk in enumerate(
        re.split(r"\n## (?=[^\n]+\n\n?Alternate titles:)", md)[1:], start=1):
    head = chunk.split("\n", 1)[0].strip()
    if head not in JUDGMENT:
        raise SystemExit(
            f"No judgment entry for role heading {head!r}.\n"
            f"Known headings: {list(JUDGMENT)}")
    j = JUDGMENT[head]

    alts = [a.strip() for a in
            strip(re.search(r"Alternate titles:(.+)", chunk).group(1)).split(",")]

    # Functional Mix -> aligned top-5 arrays + additional_functions
    pcts, descs = [0] * 5, ["Not a core function of this role."] * 5
    additional, coverage = [], 0
    fm = re.search(r"### Functional Mix[^\n]*\n((?:[-*] .*\n)+)", chunk)
    for line in fm.group(1).strip().split("\n"):
        m = re.match(r"[-*] (.+?):\s*~(\d+)%\s*(?:—\s*(.*))?$", strip(line))
        if not m:
            continue
        name, pct, desc = m.group(1).strip(), int(m.group(2)), (m.group(3) or "").strip()
        desc = desc[:1].upper() + desc[1:] + ("" if desc.endswith(".") else ".")
        coverage += pct
        if name in TOP5_FUNCTIONS:
            i = TOP5_FUNCTIONS.index(name)
            pcts[i], descs[i] = pct, desc
        else:
            additional.append({"name": name, "pct": pct, "description": desc})

    # Why This Fits You -> value narratives in client list order
    vals = [""] * 5
    wf = re.search(r"### Why This Fits You[^\n]*\n((?:[-*] .*\n)+)", chunk)
    if wf:
        for line in wf.group(1).strip().split("\n"):
            m = re.match(r"[-*] (.+?):\s*(.+)$", strip(line))
            if m and m.group(1).strip() in TOP5_VALUES:
                vals[TOP5_VALUES.index(m.group(1).strip())] = m.group(2).strip()

    def titled(section):
        out = []
        for b in bullets(chunk, section):
            t, d = first_sentence(b)
            out.append({"title": t, "description": d})
        return out

    # actions_taken: each bullet becomes its own group — lead sentence as the
    # label, the remaining sentences as its detail.
    actions = []
    for b in bullets(chunk, "What You'd Actually Do"):
        t, d = first_sentence(b)
        actions.append({"problem_label": t, "actions": [d] if d else []})

    tech = strip(re.search(r"### Technical Requirements & Upskilling\n(.+)", chunk).group(1))
    # The source states requirement and timing as one sentence. Pull an explicit
    # timeframe out when present; otherwise the source says no barrier.
    tm = re.search(r"(\d+[\u2013-]\d+\s*month[s]?)", tech)
    tech_time = tm.group(1) if tm else "Immediate — no barrier identified"
    travel = strip(re.search(r"### Travel, Schedule & Office Findings\n(.+)", chunk).group(1))

    roles.append({
        "rank": rank,
        "title": j.get("title", head),
        "alt_titles": alts,
        "function": j["function"],
        "seniority_level": j["seniority"],
        "seniority_note": j["seniority_note"],
        "salary_low": j["low"], "salary_avg": j["avg"], "salary_high": j["high"],
        "salary_context": j["salary_context"],
        "function_pcts_top5": pcts,
        "function_descriptions_top5": descs,
        "additional_functions": additional,
        "total_function_coverage": coverage,
        "value_alignments": vals,
        "day_to_day": {
            "problems_solved": titled("Problems You'd Be Solving"),
            "actions_taken": actions,
            "success_metrics": titled("How Success Is Measured"),
        },
        "tech_req_1": tech, "tech_time_1": tech_time,
        # Literal "None" is the template's sentinel for an unused second slot.
        "tech_req_2": "None", "tech_time_2": "None",
        "travel": travel,
        "bias_prevention_note": strip(
            re.search(r"\*\*Bias self-check:\*\*(.+)", md).group(1)),
    })

data = {
    "client": {
        "name": CLIENT_NAME, "first_name": CLIENT_NAME.split()[0],
        "report_date": REPORT_DATE,
        "values": TOP5_VALUES, "functions": TOP5_FUNCTIONS,
        "work_preferences": {
            "min_salary": intake["Minimum salary requirement"],
            "max_travel_days": intake["Maximum travel days/month"] + " days/month",
            "advanced_degree": intake["Advanced degrees/credentials beyond baseline"],
            "years_workforce": intake["Years in workforce (full-time)"],
        },
    },
    "roles": roles,
}

blob = json.dumps(data, indent=2, ensure_ascii=False)
assert "[cite:" not in blob, "citation markers survived into the JSON"
OUT.write_text(blob)
print(f"Wrote {OUT}\n")
for r in roles:
    dtd = r["day_to_day"]
    print(f"  {r['rank']}. {r['title']:32s} {r['function']:15s} {r['seniority_level']:11s} "
          f"pcts={r['function_pcts_top5']} cov={r['total_function_coverage']:3d} "
          f"vals={sum(1 for v in r['value_alignments'] if v)}/5 "
          f"P/A/S={len(dtd['problems_solved'])}/{len(dtd['actions_taken'])}/{len(dtd['success_metrics'])} "
          f"note={'Y' if r['seniority_note'] else '-'}")
print(f"\n{len(roles)} roles parsed; no [cite:N] markers in JSON (asserted)")

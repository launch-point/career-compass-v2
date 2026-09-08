#!/usr/bin/env python3
"""Parse a Stage-2 deep-research markdown file into the v15 report JSON schema.

Handles the v2.3 research template. Client-agnostic.

PRINCIPLE: parse permissively, validate strictly, report loudly.

  * Permissive — split on EVERY `## ` heading, with no assumption about which
    field comes first. The v2.3 regression happened because role detection was
    coupled to `Alternate titles:` sitting directly under the heading; inserting
    `Rank: N` between them produced ZERO roles, silently, and still wrote a
    valid empty report. Detection is now coupled to nothing.
  * Strict — a section that classifies as a role is validated hard. Missing
    fields are reported per role, never quietly defaulted.
  * Loud — every skip, gap and defect prints with a reason, and any FAIL
    refuses to write output. Silence means clean, not unchecked.

Sections are classified as roles by CONTENT, never by heading name: a hardcoded
skip for "Mapping Revision Notes" breaks the first time a section is called
"Appendix".

TWO PHASES, with a human gate between them. Judgment is not an input Todd has
to produce cold before seeing anything:

  1. `--propose <draft.json>` parses the research, validates the document in
     full, and writes a DRAFT judgment carrying the evidence for each role —
     stated seniority tier, functional mix by weight, and the salary prose
     VERBATIM including its caveats. Proposed values are left `null`; they get
     filled in review, so an unmade decision looks unmade rather than defaulted.
  2. Todd corrects the draft, sets `include` per role, and sets
     `"_confirmed": true`. Only then does the build run.

The build REFUSES a judgment file without `"_confirmed": true`
(JUDGMENT_UNCONFIRMED). The gate is structural, not a convention.

Two things the markdown does NOT state come from a judgment file, because they
are decisions rather than findings:

  * `function`        which of the 10 fixed business functions the role sits in
  * `seniority_level` Specialist / Integrator / Strategist (the graph's y-axis;
                      a different scale from the source's Director/Manager/IC
                      eligibility tiers, so the mapping is a judgment call)
  * salary low/avg/high integers, since v2.3 states salary as prose. The prose
    IS parsed, into `salary_context`, because it carries the scenario split the
    integer decision gets made from.

Judgment file — a JSON object keyed by the role heading exactly as it appears
in the markdown:

  {
    "_confirmed": true,
    "Program Director": {
      "include": true,
      "function": "Operations",
      "seniority": "Strategist",
      "low": 101000, "avg": 113000, "high": 125000,
      "salary_context": "optional; parsed Salary prose wins when present",
      "seniority_note": "optional; the markdown's Seniority Note wins",
      "title": "optional shorter title for the report",
      "_reasoning": "why this placement — kept for gate training",
      "_note": "Todd's correction rationale, if he changed it",
      "_evidence": { ... written by --propose, ignored on build ... }
    }
  }

`include: false` drops a role from the report. It is an EXPLICIT flag, never an
absence: a missing entry still means "not reviewed" and still fails NO_JUDGMENT.
Dropped roles keep their entry, reasoning and evidence, so the decision stays
auditable.

Selected roles are RENUMBERED 1..N for the report; the document's own numbering
is preserved as `research_rank`. Rank drives only display and internal wiring
(the TOC numeral, page header, graph dot and legend), so a report numbered
01-06, 08, 09, 10 would read as a printing error. RANK_GAP is unchanged and
still validates the research document, which always holds the full set.

Usage:
    # phase 1 — propose
    python parse_research_markdown.py <research.md> --propose <draft.json> \
        --client "Full Name"

    # phase 2 — build, after review
    python parse_research_markdown.py <research.md> <judgment.json> <out.json> \
        --client "Full Name" [--report-date "September 4, 2026"] [--strict]

`--strict` also treats WARN findings as fatal.

Citation markers of the form [cite:N] are stripped everywhere; the script
asserts none survive into the output.
"""
import argparse, json, re, sys
from pathlib import Path
from datetime import date

# Role-count bounds are owned by report_template.py. Importing rather than
# redefining keeps one source of truth — a parser that accepted 12 roles while
# the builder rejects them would fail late, after the expensive step.
# NOTE: report_template.py downloads DM Sans/Inter at import time, so this fails
# when /tmp/fonts is empty AND the font host is unreachable (the documented
# remote-session block). The message says so, rather than surfacing a bare
# URLError from an apparently unrelated module.
sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    from report_template import MIN_ROLES, MAX_ROLES
except Exception as exc:  # noqa: BLE001 - deliberately broad, see above
    raise SystemExit(
        f"Cannot import MIN_ROLES/MAX_ROLES from report_template.py:\n"
        f"  {type(exc).__name__}: {exc}\n"
        f"report_template.py fetches DM Sans/Inter at import time. If /tmp/fonts\n"
        f"is empty and the font host is blocked, importing it fails. Run locally,\n"
        f"or pre-populate /tmp/fonts, then retry."
    )

# --- field grammar ----------------------------------------------------------
SCALARS = {
    "rank":           re.compile(r"^Rank:\s*(.+?)\s*$", re.M),
    "alt_titles":     re.compile(r"^Alternate titles:\s*(.+?)\s*$", re.M),
    "seniority":      re.compile(r"^Confirmed Seniority Level:\s*(.+?)\s*$", re.M),
    "seniority_note": re.compile(r"^Seniority Note:\s*(.+?)\s*$", re.M),
}

# Subsection headings, matched case-insensitively, with flexible whitespace and
# a tolerant tail - so v1's "Travel, Schedule & Office Findings" and v2.3's
# "Travel" reach the same key. Heading capitalisation drift must not cost a role.
SUBSECTIONS = {
    "functional_mix": r"Functional\s+Mix",
    "values":         r"Why\s+This\s+Fits\s+You",
    "problems":       r"Problems\s+You'?d\s+Be\s+Solving",
    "actions":        r"What\s+You'?d\s+Actually\s+Do",
    "metrics":        r"How\s+Success\s+Is\s+Measured",
    "salary":         r"Salary",
    "tech":           r"Technical\s+Requirements",
    "travel":         r"Travel",
}

# seniority_note is excluded: legitimately absent on unambiguous roles, so it
# carries no signal about whether a section is a role.
ROLE_MARKERS = [k for k in SCALARS if k != "seniority_note"] + list(SUBSECTIONS)

# A section is a role at this many markers or more. Deliberately low: the prose
# subsections alone (Functional Mix + Why This Fits You + Problems) reach 3, so
# a role stripped of every scalar field still classifies and gets validated
# loudly instead of vanishing from the report.
ROLE_MARKER_MIN = 3

# Absent once a section HAS classified as a role, these are hard failures.
REQUIRED_FOR_ROLE = ["rank", "alt_titles", "seniority", "functional_mix",
                     "values", "problems", "actions", "metrics", "travel"]

NO_DESC = "Not a core function of this role."

# SKILL.md's documented mapping from the source's eligibility tier to the
# graph's work-altitude axis. Used only to PROPOSE a value, and only where the
# document gives no Seniority Note — a note means the reading is contested, and
# SKILL.md says flag it rather than silently pick.
SENIORITY_RULE = {
    "director": "Strategist",
    "manager": "Integrator",
    "individual contributor": "Specialist",
}

# A Seniority Note is not noise obscuring the altitude reading — it is usually
# the signal that CORRECTS the title rule. SENIORITY_RULE maps titles; the note
# says when the title misdescribes the work. Measured on Austin's ten roles: of
# four notes, three describe altitude and the title rule gets all three wrong
# (Manager by title / Director-equivalent by scope; Manager by title /
# individual contributor by function, twice). So the note is READ for direction
# and the reading is offered ALONGSIDE the flag — never auto-filled. A wrong
# placement ships a dot in the wrong band with nothing to catch it; an
# unnecessary flag costs five seconds.
NOTE_DIRECTION = [
    ("Strategist", [r"director[- ]equivalent", r"chief executive", r"c-suite",
                    r"executive[- ]equivalent", r"full p&l"]),
    ("Specialist", [r"individual contributor", r"rather than direct reports",
                    r"personal client book", r"account book"]),
    ("Integrator", [r"manager[- ]equivalent"]),
]

# Intra-line whitespace is [ \t], never \s. `\s` matches newlines, so a `\s*`
# before the optional description group lets a bullet swallow the NEXT bullet
# as its own description — silently dropping every second function. Caught in
# testing: it made 5 listed functions parse as 3. Keep these newline-free.
PCT_BULLET   = re.compile(
    r"^[ \t]*[-*+][ \t]*(.+?):[ \t]*~?[ \t]*(\d{1,3})[ \t]*%[ \t]*"
    r"(?:[—–-][ \t]*([^\n]*))?[ \t]*$", re.M)
NAMED_BULLET = re.compile(r"^[ \t]*[-*+][ \t]*([^:\n]{2,80}?):[ \t]+(\S[^\n]*)$", re.M)
PLAIN_BULLET = re.compile(r"^[ \t]*[-*+][ \t]+(\S[^\n]*)$", re.M)
# Client-profile list items: numbered (v2.3) or bulleted (v1). Both accepted.
LIST_ITEM    = re.compile(r"^[ \t]*(?:[-*+]|\d+\.)[ \t]+(\S[^\n]*?)[ \t]*$", re.M)

CITE = re.compile(r"\s*\[cite:\d+\]")
strip = lambda s: CITE.sub("", s or "").strip()

def _norm(s):
    """Lowercase, punctuation- and whitespace-insensitive form, for comparing a
    description tail against its own function name."""
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()

FINDINGS = []
def fail(where, code, msg): FINDINGS.append(("FAIL", where, code, msg))
def warn(where, code, msg): FINDINGS.append(("WARN", where, code, msg))


def split_sections(text):
    """Every `## ` heading starts a section. No field-order assumption."""
    out, heads = [], list(re.finditer(r"^##[ \t]+(.+?)[ \t]*$", text, re.M))
    for i, m in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        out.append({"heading": strip(m.group(1)),
                    "line": text[:m.start()].count("\n") + 1,
                    "body": text[m.end():end]})
    return out


def subsection(body, pattern):
    """Body of a `### <pattern>` subsection, or None. Case/whitespace tolerant."""
    m = re.search(rf"^###[ \t]+{pattern}[^\n]*$", body, re.M | re.I)
    if not m:
        return None
    nxt = re.search(r"^#{2,3}[ \t]+", body[m.end():], re.M)
    return body[m.end(): m.end() + (nxt.start() if nxt else len(body))]


def markers_of(body):
    found = [k for k, p in SCALARS.items() if k != "seniority_note" and p.search(body)]
    return found + [k for k, p in SUBSECTIONS.items() if subsection(body, p) is not None]


def prose(text):
    """Collapse a subsection body to one prose string, dropping bullet markers."""
    lines = [l.strip() for l in (text or "").strip().split("\n")]
    lines = [re.sub(r"^[-*+]\s+", "", l) for l in lines if l and not l.startswith("---")]
    return strip(" ".join(lines))


def lead_and_rest(text):
    """Split into (lead sentence without its period, remainder).

    The report renders these as "{title}: {description}", so the lead sentence
    must not keep its terminal period or the page shows ".:".
    """
    m = re.match(r"(.+?[.!?])(?:\s+|$)(.*)", text, re.S)
    lead, rest = (m.group(1).strip(), m.group(2).strip()) if m else (text.strip(), "")
    return lead.rstrip(".").strip(), rest


# --- client profile ---------------------------------------------------------
def profile_list(md, label):
    """Items under a profile label. Accepts numbered (v2.3) or bulleted (v1)."""
    m = re.search(rf"^{label}[^\n]*\n((?:\s*(?:[-*+]|\d+\.)\s+.*\n)+)", md, re.M | re.I)
    return [strip(x) for x in LIST_ITEM.findall(m.group(1))] if m else []


def profile_map(md):
    """WORK PREFERENCES (v2.3) or STANDARD INTAKE (v1) as a key/value map."""
    items = profile_list(md, r"WORK PREFERENCES") or profile_list(md, r"STANDARD INTAKE")
    return {strip(k).lower(): strip(v)
            for k, v in (i.split(":", 1) for i in items if ":" in i)}


def pref(pmap, *aliases, default=""):
    """First matching preference key. v2.3 renamed several of these."""
    for a in aliases:
        if a.lower() in pmap:
            return pmap[a.lower()]
    warn("client profile", "PREF_MISSING",
         f"no work-preference key matching {list(aliases)}; using {default!r}")
    return default


SENTENCE = re.compile(r"(?<=[.!?])\s+")


def salary_scenarios(prose_text):
    """Sentences of the Salary prose that name a figure, VERBATIM.

    Not summarised and not normalised: choosing between "$115,000-$203,000 in
    corporate contexts" and "$69,000-$125,000 in nonprofit contexts" depends on
    the caveats the research attached about org size and market tier, and a
    paraphrase drops exactly those.
    """
    return [t.strip() for t in SENTENCE.split(prose_text or "") if "$" in t]


def note_direction(note):
    """What altitude does a Seniority Note point at, and on what phrase?

    Returns (band, matched phrase) or (None, reason). Deliberately literal: it
    reports the phrase it matched so the reading is auditable rather than
    magic, and refuses to choose when a note points both ways.
    """
    if not note:
        return None, "no note"
    hits = []
    for band, pats in NOTE_DIRECTION:
        for p in pats:
            m = re.search(p, note, re.I)
            if m:
                hits.append((band, m.group(0)))
                break
    if not hits:
        return None, "note matches no known altitude phrasing"
    bands = {b for b, _ in hits}
    if len(bands) > 1:
        return None, f"note points at more than one band: {sorted(bands)}"
    return hits[0][0], hits[0][1]


MONEY = re.compile(r"\$[\d,]+")


def usable_salary_figures(prose_text, floor_text=""):
    """Salary amounts in the prose that are not just the client's own floor.

    The research routinely restates the client's minimum ("clears the $120,000
    floor cleanly") in a role whose prose gives no figures of its own. Counting
    any `$` as a figure therefore misses exactly the case this is for — caught
    in testing on Austin's Relationship Manager, whose only amount IS the floor.
    """
    floor = {m.replace(",", "") for m in MONEY.findall(floor_text or "")}
    return [m for m in MONEY.findall(prose_text or "")
            if m.replace(",", "") not in floor]


def build_evidence(sec, top_functions, floor_text=""):
    """Everything a judgment call needs, extracted deterministically."""
    body = sec["body"]
    rm = SCALARS["rank"].search(body)
    am = SCALARS["alt_titles"].search(body)
    sm = SCALARS["seniority"].search(body)
    sn = SCALARS["seniority_note"].search(body)
    tier = strip(sm.group(1)) if sm else ""
    note = strip(sn.group(1)) if sn else ""

    mix = []
    for name, pct, desc in PCT_BULLET.findall(
            subsection(body, SUBSECTIONS["functional_mix"]) or ""):
        mix.append({"name": strip(name), "pct": int(pct),
                    "in_client_top5": strip(name) in top_functions})
    mix.sort(key=lambda m: -m["pct"])

    sal = prose(subsection(body, SUBSECTIONS["salary"]))
    scenarios = salary_scenarios(sal)
    if not usable_salary_figures(sal, floor_text):
        # The report has no blank-salary presentation: fmt_salary(None) raises,
        # and salary is printed in the TOC beside every role title, so a gap
        # there reads as broken. Surface it at PROPOSE time so figures can be
        # sourced during review, rather than at build time. The build already
        # refuses via JUDGMENT_FIELD when low/avg/high stay null.
        warn(sec["heading"], "SALARY_NO_FIGURES",
             "Salary prose names no figure; low/avg/high must come from another "
             "source before this role can build")
    note_band, note_basis = note_direction(note)
    # A note means the reading is contested; SKILL.md says flag it rather than
    # pick. Only propose a band where the tier maps cleanly AND nothing disputes
    # it — otherwise leave it null and say why.
    suggested = SENIORITY_RULE.get(tier.lower()) if not note else None
    return {
        "research_rank": int(strip(rm.group(1))) if rm and strip(rm.group(1)).isdigit() else None,
        "alt_titles": [a.strip() for a in strip(am.group(1)).split(",")] if am else [],
        "stated_seniority_tier": tier,
        "seniority_note_in_document": note,
        "seniority_suggested_by_rule": suggested,
        # Read from the note, offered alongside the flag. Never auto-filled:
        # `seniority` in the draft stays null whenever the role is ambiguous.
        "seniority_suggested_by_note": note_band,
        "seniority_note_basis": note_basis,
        "seniority_ambiguous": bool(note) or suggested is None,
        "functional_mix_by_weight": mix,
        "salary_prose_verbatim": sal,
        "salary_scenarios_verbatim": scenarios,
        "salary_scenario_count": len(scenarios),
        "salary_figures_beyond_the_floor": len(usable_salary_figures(sal, floor_text)),
    }


def parse_role(sec, judgment, top_functions, top_values, check_judgment=True):
    """Parse one classified section into a role dict. Records findings."""
    head, body, where = sec["heading"], sec["body"], sec["heading"]

    for k in [k for k in REQUIRED_FOR_ROLE if k not in sec["markers"]]:
        fail(where, "FIELD_MISSING", f"required field/section {k!r} absent")

    # Rank comes from the declared field, never from position: enumeration
    # renumbers silently when a role is dropped, which is the defect this is
    # meant to surface.
    rm = SCALARS["rank"].search(body)
    rank = None
    if rm and strip(rm.group(1)).isdigit():
        rank = int(strip(rm.group(1)))
    elif rm:
        fail(where, "RANK_NOT_INT", f"Rank: {rm.group(1)!r} is not an integer")

    am = SCALARS["alt_titles"].search(body)
    alts = []
    if am and strip(am.group(1)).lower() != "none":
        alts = [a.strip() for a in strip(am.group(1)).split(",") if a.strip()]

    j = (judgment or {}).get(head)
    if j is None:
        j = {}
        if check_judgment:
            # Absence is never "deliberately dropped" — that is `include: false`,
            # an explicit flag. A missing entry means the role has not been
            # reviewed, and the two must stay distinguishable.
            fail(where, "NO_JUDGMENT", "no judgment entry; known: "
                 f"{[k for k in (judgment or {}) if not k.startswith('_')]}")
    include = bool(j.get("include", True))
    if check_judgment and include:
        # `is None` as well as absent: the draft pre-fills nulls, and a null
        # that passed validation would ship an empty field. An EXCLUDED role
        # needs none of these, so it is not asked for them.
        for k in ("function", "seniority", "low", "avg", "high"):
            if j.get(k) in (None, ""):
                fail(where, "JUDGMENT_FIELD",
                     f"judgment entry missing {k!r} (still null in the draft?)")

    # --- Functional Mix ---
    pcts = [0] * len(top_functions)
    descs = [NO_DESC] * len(top_functions)
    additional, coverage, seen = [], 0, []
    for name, pct, desc in PCT_BULLET.findall(subsection(body, SUBSECTIONS["functional_mix"]) or ""):
        name, pct, desc = strip(name), int(pct), strip(desc)
        coverage += pct
        seen.append(name)

        # A tail is required above 0% and forbidden at 0%. Never synthesise one:
        # the pre-v2.4 code turned an empty tail into the string "." and printed
        # a bare period in every row.
        if pct > 0 and not desc:
            fail(where, "FUNCTION_DESC_MISSING",
                 f"{name!r} scores {pct}% but carries no description tail; "
                 f"the report's 'How It Shows Up In This Role' cell renders blank")
        if pct == 0 and desc:
            warn(where, "FUNCTION_DESC_ON_ZERO",
                 f"{name!r} scores 0% but carries a description tail, which "
                 f"contradicts its own percentage; tail ignored")
        # Exact restatement only. Near-restatement and generic filler are real
        # problems too, but detecting them reliably needs judgment this cannot
        # supply, and a noisy check gets ignored.
        if desc and _norm(desc) == _norm(name):
            warn(where, "FUNCTION_DESC_RESTATES_NAME",
                 f"{name!r} tail restates the function name verbatim instead of "
                 f"how it shows up in this role")

        if name in top_functions:
            i = top_functions.index(name)
            pcts[i] = pct
            # At 0% the sentinel stands: the template says the report renders
            # "Not a core function of this role" automatically there.
            if pct > 0:
                descs[i] = (desc[:1].upper() + desc[1:] +
                            ("" if desc.endswith(".") else ".")) if desc else ""
        else:
            additional.append({"name": name, "pct": pct,
                               "description": "" if pct == 0 else desc})

    # Presence by NAME, independent of bullet count: if a top function is
    # omitted, a Next-5 function slides into its slot, the count still reads 5,
    # and a top function vanishes silently. Counting cannot catch that.
    absent = [f for f in top_functions if f not in seen]
    if absent:
        fail(where, "TOP_FUNCTION_ABSENT",
             f"{len(absent)} of {len(top_functions)} top functions not listed: {absent}")

    # --- Why This Fits You ---
    vals = [""] * len(top_values)
    order = []
    for name, text in NAMED_BULLET.findall(subsection(body, SUBSECTIONS["values"]) or ""):
        name = strip(name)
        if name in top_values:
            order.append(name)
            vals[top_values.index(name)] = strip(text)
    absent_v = [v for i, v in enumerate(top_values) if not vals[i]]
    if absent_v:
        fail(where, "VALUE_ABSENT",
             f"{len(absent_v)} of {len(top_values)} values not listed: {absent_v}")
    if order and order != [v for v in top_values if v in order]:
        warn(where, "VALUE_ORDER",
             "values are not in Client Profile Block order (mapped by name anyway)")

    def titled(key):
        out = []
        for b in PLAIN_BULLET.findall(subsection(body, SUBSECTIONS[key]) or ""):
            lead, rest = lead_and_rest(strip(b))
            out.append({"title": lead, "description": rest})
        return out

    # actions_taken: each bullet becomes its own group - lead sentence as the
    # label, the remaining sentences as its detail.
    actions = [{"problem_label": d["title"],
                "actions": [d["description"]] if d["description"] else []}
               for d in titled("actions")]

    tech = prose(subsection(body, SUBSECTIONS["tech"]))
    if not tech:
        warn(where, "TECH_EMPTY", "Technical Requirements section is empty")
    tm = re.search(r"(\d+[–—-]\d+\s*month[s]?)", tech)

    salary_prose = prose(subsection(body, SUBSECTIONS["salary"]))
    if not salary_prose and not j.get("salary_context"):
        warn(where, "SALARY_CONTEXT_EMPTY",
             "no Salary prose and no judgment salary_context")

    sn = SCALARS["seniority_note"].search(body)
    return {
        "rank": rank,
        "title": j.get("title", head),
        "alt_titles": alts,
        "function": j.get("function"),
        "seniority_level": j.get("seniority"),
        # v2.3 states this in the markdown; judgment is the fallback.
        "seniority_note": strip(sn.group(1)) if sn else j.get("seniority_note", ""),
        "salary_low": j.get("low"), "salary_avg": j.get("avg"), "salary_high": j.get("high"),
        # v2.3 reverted salary to prose; it carries the scenario split the
        # integer call is made from, so it is captured rather than dropped.
        "salary_context": salary_prose or j.get("salary_context", ""),
        "function_pcts_top5": pcts,
        "function_descriptions_top5": descs,
        "additional_functions": additional,
        "total_function_coverage": coverage,
        "value_alignments": vals,
        "day_to_day": {
            "problems_solved": titled("problems"),
            "actions_taken": actions,
            "success_metrics": titled("metrics"),
        },
        "tech_req_1": tech,
        "tech_time_1": tm.group(1) if tm else "Immediate — no barrier identified",
        # Literal "None" is the template's sentinel for an unused second slot.
        "tech_req_2": "None", "tech_time_2": "None",
        "travel": prose(subsection(body, SUBSECTIONS["travel"])),
        # v2.3 dropped the "**Bias self-check:**" marker. Kept for schema
        # compatibility; report_template.py does not reference this field.
        "bias_prevention_note": "",
        # The document's own numbering, kept for traceability once the selected
        # roles are renumbered 1..N for the report.
        "research_rank": rank,
        "_section": sec,     # reporting only; stripped before serialising
        "_include": include, # selection flag; stripped before serialising
    }


def _report_document(sections, skipped, parsed_n, selected_n,
                     top_functions, top_values, pmap, known, gaps, dupes):
    print(f"SECTIONS FOUND  : {len(sections)}")
    print(f"ROLES PARSED    : {parsed_n}"
          + ("" if selected_n is None or selected_n == parsed_n
             else f"   SELECTED: {selected_n}"))
    print(f"SECTIONS SKIPPED: {len(skipped)}")
    for s in skipped:
        miss = [m for m in ROLE_MARKERS if m not in s["markers"]]
        print(f"   - {s['heading']!r} (line {s['line']}): "
              f"{len(s['markers'])}/{len(ROLE_MARKERS)} role markers "
              f"(need >={ROLE_MARKER_MIN}); missing {', '.join(miss[:6])}"
              + ("..." if len(miss) > 6 else ""))
    print(f"\nCLIENT PROFILE  : {len(top_functions)} top functions, "
          f"{len(top_values)} values, {len(pmap)} work preferences")
    print(f"RANK SEQUENCE   : declared {sorted(known)}  "
          f"gaps={gaps or 'none'}  duplicates={dupes or 'none'}")


def _print_findings():
    fails = [f for f in FINDINGS if f[0] == "FAIL"]
    warns = [f for f in FINDINGS if f[0] == "WARN"]
    if FINDINGS:
        print(f"\nFINDINGS ({len(fails)} FAIL, {len(warns)} WARN)")
        for level, where, code, msg in FINDINGS:
            print(f"   {level:4} [{code}] {where}: {msg}")
    else:
        print("\nFINDINGS: none")
    return fails, warns


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("markdown")
    ap.add_argument("judgment", nargs="?", help="confirmed judgment JSON (build phase)")
    ap.add_argument("out", nargs="?", help="client report JSON to write (build phase)")
    ap.add_argument("--propose", metavar="DRAFT.json",
                    help="phase 1: write a draft judgment with evidence, then stop")
    ap.add_argument("--client", required=True, help="Client full name")
    ap.add_argument("--report-date", default=None,
                    help='Defaults to today, e.g. "September 4, 2026"')
    ap.add_argument("--strict", action="store_true",
                    help="Treat WARN findings as fatal too")
    args = ap.parse_args()
    proposing = bool(args.propose)
    if not proposing and not (args.judgment and args.out):
        ap.error("build phase needs <judgment.json> and <out.json>; "
                 "or use --propose DRAFT.json for phase 1")

    md = Path(args.markdown).read_text()
    judgment = {} if proposing else json.loads(Path(args.judgment).read_text())
    report_date = args.report_date or date.today().strftime("%B %-d, %Y")

    top_functions = profile_list(md, r"TOP 5 FUNCTIONS")
    top_values = profile_list(md, r"TOP 5 VALUES")
    pmap = profile_map(md)
    if len(top_functions) != 5:
        fail("client profile", "PROFILE_FUNCTIONS",
             f"expected 5 top functions, found {len(top_functions)}")
    if len(top_values) != 5:
        fail("client profile", "PROFILE_VALUES",
             f"expected 5 top values, found {len(top_values)}")

    sections = split_sections(md)
    for s in sections:
        s["markers"] = markers_of(s["body"])
        s["is_role"] = len(s["markers"]) >= ROLE_MARKER_MIN
    role_secs = [s for s in sections if s["is_role"]]
    skipped = [s for s in sections if not s["is_role"]]

    roles = [parse_role(s, judgment, top_functions, top_values,
                        check_judgment=not proposing) for s in role_secs]

    # --- document-level validation ------------------------------------------
    # These run over EVERY parsed role, before any selection. RANK_GAP and
    # RANK_DUPLICATE validate the research document, which always holds the full
    # set; selection happens afterwards and never reaches them.
    if not roles:
        fail("document", "NO_ROLES",
             f"no section carried >={ROLE_MARKER_MIN} role markers. "
             f"An empty role list is never a valid parse.")
    elif len(roles) > MAX_ROLES:
        # Research over-producing is expected — narrowing is what the gate is
        # for — so the parsed count warns while the SELECTED count is bounded.
        warn("document", "PARSED_ABOVE_MAX",
             f"{len(roles)} roles parsed, above the report maximum of {MAX_ROLES}; "
             f"select at most {MAX_ROLES} with `include`")

    known = [r["rank"] for r in roles if r["rank"] is not None]
    dupes = sorted({r for r in known if known.count(r) > 1})
    if dupes:
        fail("document", "RANK_DUPLICATE", f"duplicate Rank values: {dupes}")
    gaps = [n for n in range(1, len(roles) + 1) if n not in known]
    if gaps:
        fail("document", "RANK_GAP",
             f"rank(s) {gaps} missing from a {len(roles)}-role document "
             f"(declared: {sorted(known)})")

    roles.sort(key=lambda r: (r["rank"] is None, r["rank"]))

    # --- phase 1: propose ---------------------------------------------------
    if proposing:
        floor_text = pmap.get("minimum salary", pmap.get("minimum salary requirement", ""))
        draft = {"_confirmed": False,
                 "_instructions": "Fill function / seniority / low / avg / high per "
                                  "role, set include:false to drop a role, then set "
                                  "_confirmed:true. _evidence is informational."}
        for r in roles:
            ev = build_evidence(r["_section"], top_functions, floor_text)
            draft[r["_section"]["heading"]] = {
                "include": True,
                "function": None,
                "seniority": ev["seniority_suggested_by_rule"],
                "low": None, "avg": None, "high": None,
                "salary_context": "", "seniority_note": "",
                "_reasoning": "", "_note": "", "_evidence": ev,
            }
        fails = [f for f in FINDINGS if f[0] == "FAIL"]
        _report_document(sections, skipped, len(roles), None,
                         top_functions, top_values, pmap, known, gaps, dupes)
        print("\nPROPOSAL EVIDENCE")
        for r in roles:
            ev = draft[r["_section"]["heading"]]["_evidence"]
            top = ", ".join(f"{m['name'][:34]} {m['pct']}%"
                            for m in ev["functional_mix_by_weight"][:3])
            print(f"\n   [{ev['research_rank']}] {r['_section']['heading']}")
            print(f"       tier={ev['stated_seniority_tier']!r} -> "
                  f"rule suggests {ev['seniority_suggested_by_rule']!r}"
                  + ("   AMBIGUOUS" if ev["seniority_ambiguous"] else ""))
            if ev["seniority_ambiguous"]:
                if ev["seniority_suggested_by_note"]:
                    print(f"         note points at {ev['seniority_suggested_by_note']}"
                          f" (on {ev['seniority_note_basis']!r}) - review, not auto-filled")
                else:
                    print(f"         note gives no clear direction: {ev['seniority_note_basis']}")
            if not ev["salary_figures_beyond_the_floor"]:
                print(f"       NO SALARY FIGURES of its own - prose only restates "
                      f"the client's floor; figures must come from elsewhere")
            print(f"       heaviest functions: {top}")
            print(f"       salary scenarios named: {ev['salary_scenario_count']}")
        _print_findings()
        if fails:
            print(f"\nREFUSED: {len(fails)} FAIL. No draft written — fix the "
                  f"research document before proposing judgment for it.")
            sys.exit(1)
        Path(args.propose).write_text(json.dumps(draft, indent=2, ensure_ascii=False))
        print(f"\nWrote draft judgment: {args.propose}")
        print(f"   {len(roles)} roles, all include:true, _confirmed:false.")
        print(f"   Review, correct, set _confirmed:true, then run the build phase.")
        return

    # --- phase 2: the gate --------------------------------------------------
    if judgment.get("_confirmed") is not True:
        fail("document", "JUDGMENT_UNCONFIRMED",
             'judgment file is not confirmed — set "_confirmed": true after review')

    # --- selection and renumbering ------------------------------------------
    dropped = [r for r in roles if not r["_include"]]
    roles = [r for r in roles if r["_include"]]
    if not MIN_ROLES <= len(roles) <= MAX_ROLES:
        fail("document", "ROLE_COUNT",
             f"{len(roles)} roles selected; report_template.py supports "
             f"{MIN_ROLES}-{MAX_ROLES}")
    research_ranks = [r["rank"] for r in roles]
    for n, r in enumerate(roles, start=1):
        r["rank"] = n
    if research_ranks != list(range(1, len(roles) + 1)):
        print(f"RENUMBERED      : research {research_ranks} -> report "
              f"{list(range(1, len(roles) + 1))}")
    assert [r["rank"] for r in roles] == list(range(1, len(roles) + 1)), \
        "report ranks must be contiguous 1..N after renumbering"

    # --- report -------------------------------------------------------------
    if dropped:
        print(f"DROPPED         : {len(dropped)} role(s) with include:false — "
              + ", ".join(f"{d['_section']['heading']} (research rank "
                          f"{d['research_rank']})" for d in dropped))
    _report_document(sections, skipped, len(roles) + len(dropped), len(roles),
                     top_functions, top_values, pmap, known, gaps, dupes)

    print("\nPER-ROLE FIELD COMPLETENESS")
    print(f"   {'rank':>4} {'res':>4}  {'role':28} {'mark':>4} {'fn':>3} {'top5':>5} "
          f"{'vals':>5} {'P/A/S':>8}  missing")
    for r in roles:
        s = r["_section"]
        miss = [m for m in REQUIRED_FOR_ROLE if m not in s["markers"]]
        d = r["day_to_day"]
        present = sum(1 for x in r["function_descriptions_top5"] if x != NO_DESC)
        print(f"   {r['rank']!s:>4} {r['research_rank']!s:>4}  {r['title'][:28]:28} "
              f"{len(s['markers']):>4} {present + len(r['additional_functions']):>3} "
              f"{present:>3}/5 {sum(1 for v in r['value_alignments'] if v):>3}/5 "
              f"{len(d['problems_solved'])}/{len(d['actions_taken'])}/{len(d['success_metrics']):<4}"
              f"  {','.join(miss) or '-'}")

    fails, warns = _print_findings()

    if fails or (args.strict and warns):
        print(f"\nREFUSED: {len(fails)} FAIL"
              + (f" + {len(warns)} WARN under --strict" if args.strict and warns else "")
              + ". No JSON written.")
        sys.exit(1)

    for r in roles:
        del r["_section"]
        del r["_include"]
    data = {
        "client": {
            "name": args.client, "first_name": args.client.split()[0],
            "report_date": report_date,
            "values": top_values, "functions": top_functions,
            "work_preferences": {
                "min_salary": pref(pmap, "Minimum salary", "Minimum salary requirement"),
                "max_travel_days": pref(pmap, "Maximum travel days per month",
                                        "Maximum travel days/month") + " days/month",
                "advanced_degree": pref(pmap, "Advanced degrees",
                                        "Advanced degrees/credentials beyond baseline"),
                "years_workforce": pref(pmap, "Years in workforce",
                                        "Years in workforce (full-time)"),
            },
        },
        "roles": roles,
    }
    blob = json.dumps(data, indent=2, ensure_ascii=False)
    assert "[cite:" not in blob, "citation markers survived into the JSON"
    Path(args.out).write_text(blob)
    print(f"\nWrote {args.out} - {len(roles)} roles"
          + (f", {len(warns)} WARN(s) above" if warns else ", clean"))


if __name__ == "__main__":
    main()

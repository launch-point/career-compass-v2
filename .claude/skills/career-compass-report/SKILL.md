---
name: career-compass-report
description: "Build a client's Career Compass report end-to-end, from a Stage-2 deep-research markdown file to a finished branded PDF. Parses the markdown into the v15 JSON schema, renders the function/seniority graph in both modes, and builds the multi-page PDF. Use when Todd provides a research markdown file for a client, or asks to build/generate/create a Career Compass report or PDF. Trigger phrases: Career Compass report, generate report, build PDF, create report, build the pdf, run the report."
metadata:
  author: Launch Point
  version: '2.0'
---

# Career Compass Report — v2 (full pipeline)

## When to Use This Skill

Use it when Todd hands over a **Stage-2 deep-research markdown file** for a client
and wants a report. Triggering the skill *is* the human gate — it means Todd has
decided the research is ready. Do not add a second "are you sure?" pause. Do
still show him the JSON, the placement reasoning, and the rendered output before
anything is called done (see **Verification**).

This skill supersedes the v15 scope, which only rendered an already-existing
JSON. That JSON is now produced here. The v15 reference lives at
`docs/report-build/original-SKILL.md` — read it for schema detail, not for scope.

## Setup (first run on a machine)

The venv is **gitignored**, so a fresh clone has none and every command below
will fail with "no such file" until you create it:

```bash
python3 -m venv .claude/skills/career-compass-report/.venv
.claude/skills/career-compass-report/.venv/bin/pip install \
    reportlab==5.0.1 pdfplumber==0.11.8 matplotlib==3.9.4 pillow==11.3.0
```

Those are the versions this pipeline has actually been verified against, on
Python 3.9. `fonttools` arrives as a matplotlib dependency; it is not installed
directly. The pins are deliberate — if one fails to resolve on a different
machine, surface that as a finding rather than falling back to unpinned
installs. v15 targeted an older ReportLab, so version drift here is a real risk.

`graph_generator.py` downloads DM Sans and Inter to `/tmp/fonts` on first use.
Offline it falls back to DejaVu Sans and prints a NOTE line — the graph still
renders but is off-brand, so check for that line if the type looks wrong.

## The Pipeline

Four stages. Run them in order; each has a checkpoint with Todd.

```
research.md  ──parse──▶  {client}_client_report_data.json  ──▶  graphs (PNG)  ──▶  report.pdf
                 ▲
          judgment.json   (the decisions the markdown cannot answer)
```

All commands use the skill's own venv:

```bash
PY=.claude/skills/career-compass-report/.venv/bin/python
SKILL=.claude/skills/career-compass-report
```

### 1. Input — the research markdown

Canonical structural example: Austin Scheiwe's `Scheiwe_Roles_1-5 (1).md`. Expect
a fenced **Client Profile** block (CLIENT NAME, the 8 standard intake fields,
TOP 5 FUNCTIONS, NEXT 5 FUNCTIONS, TOP 5 VALUES) followed by one `##` section per
role. Each role carries `Alternate titles:`, a seniority line, and `###`
subsections including **Functional Mix**, **Why This Fits You**, **Problems
You'd Be Solving**, **What You'd Actually Do**, **How Success Is Measured**,
**Salary Findings**, **Travel…**, **Technical Requirements…**.

**Read the file before parsing.** The format drifts between revisions. Real
drift already seen: Day-to-Day sections merged into one heading and later split
into three; `[cite:N]` markers appearing in a revision that had none; a role's
seniority changing from "Confirmed" to "Proposed". Diff against the previous
revision when one exists, and report what actually changed rather than trusting
the document's own revision note.

### 2. Parse

```bash
$PY $SKILL/parse_research_markdown.py <research.md> <judgment.json> <out.json> \
    --client "Full Name" [--report-date "September 4, 2026"]
```

**Extracted automatically** — client profile and intake fields, alternate titles,
Functional Mix (names, percentages, descriptions, split into the client's Top 5
vs. `additional_functions`), Why This Fits You value narratives aligned to the
client's value list, all three Day-to-Day sections, travel, technical
requirements. Coverage totals are summed, not transcribed.

**Never derived** — see the judgment file below.

### 3. Judgment file

Per-client, supplied by you and Todd together, **gitignored** (keep it beside the
client's other artifacts under `reports/<client>/`). JSON keyed by the role
heading exactly as it appears in the markdown:

```json
{
  "Program Director": {
    "function": "Operations",
    "seniority": "Strategist",
    "low": 101000, "avg": 113000, "high": 125000,
    "salary_context": "Nonprofit-context analytical band. …",
    "seniority_note": "",
    "title": "optional shorter title for the report"
  }
}
```

- `function` — one of the 9 fixed business functions (Product, Marketing, Sales,
  Customer Experience, Operations, Human Resources, Finance and Accounting,
  Legal, Communications). **Your judgment call.** Walk Todd through the reasoning
  per role before generating.
- `seniority` — Specialist / Integrator / Strategist. See the mapping rule below.
- `low` / `avg` / `high` — integers. The source states prose ranges.
- `seniority_note` — visible page text; empty string when the role needs none.

### 4. Graphs

```bash
$PY $SKILL/graph_generator.py <out.json> --mode overview --out overview.png
$PY $SKILL/graph_generator.py <out.json> --mode compact --role-rank N --out compact_N.png
$PY $SKILL/graph_generator.py <out.json> --mode role --role-rank N --out role_N.png
```

Three modes:

- **`overview`** — all roles on one grid with a numbered legend. Becomes its own
  page in the report, after the client profile and before the first role.
- **`compact`** — one role highlighted, the rest greyed, sized for the slot
  beside a role page's header. This is the mode the PDF embeds per role.
- **`role`** — the same content as `compact` but rendered large (2541x1280) with
  full-length axis labels. **Not used in the PDF.** Use it to preview or
  sanity-check a single role's placement at readable size, where compact's
  5.8pt labels are hard to judge on screen.

`report_template.py` generates `overview` and `compact` itself before pass 1, so
you only run these directly to preview placements before building. Regression
fixture: `$SKILL/fixtures/regression_graph.json` (see its README for coverage).

### 5. Build

```bash
$PY $SKILL/report_template.py <out.json> <output.pdf>
```

Two-pass build: pass 1 measures pagination, pass 2 writes final page numbers.
Both graph modes are generated **before** pass 1 — a graph present in only one
pass shifts pagination and silently corrupts the TOC.

---

## Durable Rules

These generalize to every client. Follow them without being asked.

### Seniority mapping

Source documents state an **eligibility tier** (Director / Manager / Individual
Contributor, gated on years in workforce). The graph's y-axis is **work
altitude**. They are different scales. Map:

| Source tier | Graph placement |
|---|---|
| Director | Strategist |
| Manager | Integrator |
| Individual Contributor | Specialist |

**When a role's stated tier does not map cleanly — e.g. "Manager (title) /
Director-equivalent (function)" — flag the conflict and ask Todd which reading to
use. Never silently pick one.**

### A role that genuinely straddles two levels

Place the dot at the **confirmed / title-level** reading, and put the nuance in
`seniority_note` so it renders as visible page text. A dot can only sit on one
row; do not let its position imply a certainty the research doesn't have, and do
not quietly choose the reading that makes the graph look better.

### Blank over fabrication

When the markdown doesn't state something — a function's role-specific
percentage, a value's connection to a role — leave it **blank or zero**. Do not
derive, estimate, or infer a plausible number. Where derivation *is* authorized
(e.g. salary midpoints), show Todd every derived number before it renders.

### Zero-scoring functions get a visible explanation

`report_template.py` renders a methodology note beneath the Top 5 Functions
table, **only when at least one Top 5 function scores 0%**. Conditional by
design: unconditional would make it boilerplate on pages where nothing needs
explaining. It states that an em-dash means the function didn't surface in that
role's research, not that it's unimportant to the client. Placement is directly
under the table it explains, above the Additional Functions table.

### Empty or partial Value Alignment gets a statement, not silence

Two cases, both handled in the template:

- **All five values blank** → one statement that no Top 5 value connects to the
  role's core purpose, and that this is the research finding, not a gap.
- **Individual values blank** → "Not a significant factor in this role."

Silence reads as a rendering bug. A stated finding reads as a finding.

### Ambiguous salary ranges

When a source gives multiple bands, a bimodal range, or says "median/typical"
without naming one — **stop and ask Todd for a real answer.** Never average
competing bands or silently pick the flattering one. Midpoints are only computed
once he's named the band.

### Citation artifacts

Strip `[cite:N]`-style markers during parsing; the parser asserts none survive
into the JSON. **Flag their presence** — if a revision introduces a marker format
you don't recognize, say so rather than silently stripping something meaningful.
Unstripped they print literally in a client's report.

### Page count is not fixed

v15 assumed 3 pages per role. That is no longer true — richer Day-to-Day content
produces 4+ pages per role, and that is **expected, not a defect**. Do not
compress content to hit a page target. Verify pagination is *correct*, not that
it matches a previous total.

---

## Client-Specific — NOT Reusable Defaults

Austin Scheiwe's report produced concrete answers. **Those answers are his, not
defaults.** A future session must re-derive all of these for a new client:

- His salary band picks (e.g. using the nonprofit-analysis band for Program
  Director) — a decision about *his* target market.
- His role-to-function placements (Program Director → Operations, Executive
  Director → Communications, etc.) — a different client's Program Director may
  belong elsewhere.
- His seniority classifications.
- The specific `seniority_note` wording for his Executive Director and General
  Manager.

Only the **patterns for reaching an answer** generalize. If you find yourself
copying a number out of this file into a new client's judgment file, stop.

---

## Verification

Run before telling Todd anything is done. Show real output, never a description.

1. **Percentages match the source**, proven by re-parsing the markdown and
   diffing against the JSON — not by eye.
2. **Show Todd the generated JSON in full**, plus your function-placement
   reasoning per role, and flag any role you found genuinely ambiguous.
3. **TOC page numbers verified against real page content** — extract each claimed
   start page and confirm the role title is on it. Match on
   whitespace-normalized text; titles wrap in the narrower header column, and a
   literal substring test produces false failures.
4. **Zero `[cite:N]` markers** anywhere in the final PDF text.
5. **Conditional elements appear only where they should** — methodology note only
   on roles with a zero-scoring function; `seniority_note` only on roles that
   carry one.
6. **Open the rendered pages and look at them.** Text extraction alone misses
   truncation, collisions, and empty-state bugs. Note that flat `extract_text()`
   interleaves wrapped table cells with adjacent columns — use cell-level
   extraction when checking a table.

## Known Gaps

- **Tech requirements read redundantly** when the source sentence already states
  timing ("…no immediate barrier. — Time to acquire: Immediate"). Cosmetic;
  worth one pass across all clients rather than a per-client fix.
- **Print legibility of small type** (5.8pt compact / 7.0pt overview axis labels)
  has only been judged on screen, never on paper.
- **`actions_taken` grouping** is inferred: the source gives flat bullets, and the
  parser makes each bullet its own group with its lead sentence as the label.

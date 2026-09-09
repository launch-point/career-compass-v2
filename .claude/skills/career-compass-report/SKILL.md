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

Run them in order. Judgment is produced through a gate, not supplied cold.

```
research.md ──propose──▶ draft_judgment.json ──▶ TODD REVIEWS ──▶ judgment.json
                          (evidence, values null)   corrects,        (_confirmed:true)
                                                    sets include            │
                                                                            ▼
research.md ──build──▶ {client}_client_report_data.json ──▶ graphs ──▶ report.pdf
```

**The build refuses a judgment file without `"_confirmed": true`.** Todd does not
produce function placements, seniority bands and salary picks before seeing
anything — phase 1 shows him the evidence, he decides, phase 2 builds.

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

Two phases — propose first, build only after Todd has confirmed. Running the
build form without a confirmed judgment file is an error, not a shortcut; see
**3. Judgment** below.

```bash
# phase 1 — propose (no judgment file exists yet)
$PY $SKILL/parse_research_markdown.py <research.md> --propose <draft.json> \
    --client "Full Name"

# phase 2 — build, after review
$PY $SKILL/parse_research_markdown.py <research.md> <judgment.json> <out.json> \
    --client "Full Name" [--report-date "September 4, 2026"]
```

**Extracted automatically** — client profile and intake fields, alternate titles,
Functional Mix (names, percentages, descriptions, split into the client's Top 5
vs. `additional_functions`), Why This Fits You value narratives aligned to the
client's value list, all three Day-to-Day sections, travel, technical
requirements. Coverage totals are summed, not transcribed.

**Never derived** — see the judgment file below.

#### Template v2.3 and the parser contract

The parser targets the **v2.3** research template and tolerates v1 documents'
heading names. What v2.3 changed, all of which broke the previous parser:

| v1 | v2.3 |
|---|---|
| heading, then `Alternate titles:` | `Rank: N` sits between them |
| profile lists bulleted (`- item`) | numbered (`1. item`) |
| `STANDARD INTAKE:` | `WORK PREFERENCES:`, keys renamed |
| `### Technical Requirements & Upskilling` | `### Technical Requirements` |
| `### Travel, Schedule & Office Findings` | `### Travel` |
| `- Function: ~20% — description` | `- Function: ~20%` (no description) |
| `**Bias self-check:**` present | removed |

Both list styles and both heading-name styles parse. Role **rank comes from the
`Rank:` field**, never from position — enumeration renumbers silently when a
role is dropped, which hides the very defect worth catching.

The parser **parses permissively, validates strictly, reports loudly**. Sections
are classified as roles by content (>=3 role markers), never by heading name, so
renaming "Mapping Revision Notes" to "Appendix" changes nothing. Any FAIL
refuses to write JSON and exits 1 — an empty role list is never a valid parse.
Run `$SKILL/fixtures/drift_suite.py <research.md> <judgment.json>` after any
parser change; it covers dropped/duplicate ranks, dropped and reordered values,
an omitted top function, heading-case and field-order drift, and a v1 document.

#### Description tails (v2.4)

v2.3 dropped the `— description` tail from Functional Mix bullets, which left
the report's "How It Shows Up In This Role" column blank on every function of
every role. **v2.4 restored it**, and the parser now enforces the template's
three rules about it:

| code | level | condition |
|---|---|---|
| `FUNCTION_DESC_MISSING` | FAIL | a function scoring above 0% carries no tail — that cell would render blank |
| `FUNCTION_DESC_ON_ZERO` | WARN | a 0% function carries a tail, contradicting its own percentage; the tail is ignored and the "Not a core function of this role" sentinel stands |
| `FUNCTION_DESC_RESTATES_NAME` | WARN | the tail, normalised, is exactly the function name |

Restatement detection is **exact-match only**. Near-restatement and generic
filler are equally real problems, but detecting them takes judgment the parser
cannot supply, and a check that cries wolf gets ignored — those stay a human
read. A v2.3-era document now fails on `FUNCTION_DESC_MISSING`, which is
intended: it would otherwise ship blank cells.

Never synthesize a tail to satisfy the check. The pre-v2.4 code turned an empty
tail into the string `"."` and printed a bare period in every row; a missing
tail is a research-document fix, not a parser one.

One validation limit worth knowing: a dropped **last** role is undetectable from
rank alone, because ranks 1..N-1 in an (N-1)-role document is exactly what a
legitimate shorter document looks like. Catching that needs an expected count
from outside the document.

### 3. Judgment — proposed, reviewed, then confirmed

Per-client, **gitignored** (keep it beside the client's other artifacts under
`reports/<client>/`). Two phases.

**Phase 1 — propose.** Validates the research document in full, then writes a
draft carrying the evidence for each decision:

```bash
$PY $SKILL/parse_research_markdown.py <research.md> --propose <draft.json> \
    --client "Full Name"
```

Each entry ships with `function`, `low`, `avg`, `high` as `null`, and
`_evidence` holding the stated seniority tier, any Seniority Note, the
functional mix by weight, and **the salary prose verbatim** — including its
caveats about org size and market tier, because those are what the scenario
choice turns on. Values stay null so an unmade decision looks unmade rather than
defaulted. `seniority` is pre-filled from the mapping rule **only** where the
tier maps cleanly and the document raises no Seniority Note; otherwise it is
null and flagged AMBIGUOUS.

Walk Todd through your proposals and reasoning in conversation. Do not fill the
draft silently.

**Phase 2 — build.** After Todd corrects the draft and sets `"_confirmed": true`:

```bash
$PY $SKILL/parse_research_markdown.py <research.md> <judgment.json> <out.json> \
    --client "Full Name" --report-date "September 4, 2026"
```

```json
{
  "_confirmed": true,
  "Program Director": {
    "include": true,
    "function": "Operations",
    "seniority": "Strategist",
    "low": 101000, "avg": 113000, "high": 125000,
    "salary_context": "Nonprofit-context analytical band. …",
    "seniority_note": "",
    "title": "optional shorter title for the report",
    "_reasoning": "why — kept for gate training",
    "_note": "Todd's correction rationale, if he changed it"
  }
}
```

**Role selection.** `include: false` drops a role. It is an explicit flag, never
an absence — a missing entry still means "not reviewed" and still fails
`NO_JUDGMENT`. Dropped roles keep their entry and reasoning, so the decision
stays auditable. An excluded role is not asked for `function`/`seniority`/salary.

**Renumbering.** Selected roles are renumbered 1..N for the report; the
document's numbering is preserved as `research_rank`, and the mapping prints as
a `RENUMBERED` line. Rank drives only display and wiring (TOC numeral, page
header, graph dot and legend), so a report numbered 01-06, 08, 09, 10 would read
as a printing error. `RANK_GAP` is unchanged and still validates the research
document, which always holds the full set — selection happens after it.

**Counts.** `MIN_ROLES`/`MAX_ROLES` bound the **selected** set. A research
document above `MAX_ROLES` warns (`PARSED_ABOVE_MAX`) rather than failing:
over-producing is expected, and narrowing is what the gate is for.

- `function` — one of the 10 fixed business functions (Executive Leadership,
  Product, Marketing, Sales, Customer Experience, Operations, Human Resources,
  Finance and Accounting, Legal, Communications). **Your judgment call.** Walk
  Todd through the reasoning per role before generating. Executive Leadership is
  the leftmost column and covers general-management roles — an Executive
  Director or GM belongs there, not under Communications or Operations.
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
- **`role`** — the same content as `compact` but rendered large
  (≈2541×1095 — tight-cropped; height varies with axis-label layout) with
  full-length axis labels. **Not used in the PDF.** Use it to preview or
  sanity-check a single role's placement at readable size, where compact's
  5.8pt labels are hard to judge on screen.

`report_template.py` generates `overview` and `compact` itself before pass 1, so
you only run these directly to preview placements before building. Regression
fixture: `$SKILL/fixtures/regression_graph.json` (see its README for coverage).

**Role count and graphs.** The report holds a variable number of roles, 5 to 10
(enforced by `MIN_ROLES`/`MAX_ROLES` in `report_template.py`, which exits rather
than building outside that range). **Every role gets a graph:** a compact graph
in its two-column page header, and a dot plus legend row on the overview.
`GRAPH_ROLE_COUNT` is now 10 — equal to `MAX_ROLES` — so the slice in `main()`
never actually drops a role.

The constant and the full-width header branch in `build_job_page` are both kept
on purpose. Lowering `GRAPH_ROLE_COUNT` again limits graphs to the top N and
gives roles past the cut-off a full-width, graph-less header, with no other
change needed. `graph_generator.py` is itself count-agnostic; the boundary lives
only in that slice.

At 10 roles the overview legend grows the image (504x456pt placed, against
504x368 at 5) and still fits the graph page with room to spare. Up to four dots
can share one grid cell; they overlap but stay in-cell and the numbers remain
legible — a known, accepted cosmetic limit, not a defect to fix.

Do not confuse this with the client's **Top 5 functions** and **Top 5 values**,
which are fixed at 5 by the report design and have nothing to do with how many
roles the report contains.

### 5. Build

```bash
$PY $SKILL/report_template.py <out.json> <output.pdf>
```

Two-pass build: pass 1 measures pagination, pass 2 writes final page numbers.
Both graph modes are generated **before** pass 1 — a graph present in only one
pass shifts pagination and silently corrupts the TOC.

### 6. After Gate 4: upload to Drive

**This runs after Todd approves the PDF, not when the build finishes.** Those are
different events, which is why upload is its own script rather than a flag on the
build.

```bash
$PY $SKILL/upload_report.py <out.json> <output.pdf>
```

Uploads the approved PDF to the shared Drive folder, sets link sharing to
*anyone with the link*, and records the link against the client's Supabase row.

**Setup, once per machine** — see `credentials.example.json` at the repo root:

```bash
mkdir -p ~/.config/career-compass
cp credentials.example.json ~/.config/career-compass/credentials.json
chmod 600 ~/.config/career-compass/credentials.json
# fill in google_oauth_client_id + google_oauth_client_secret, then:
$PY $SKILL/authorize.py                      # prints the refresh token; paste it in
$PY $SKILL/upload_report.py --init-folder "Career Compass Reports"
# paste the folder id in as drive_reports_folder_id
```

Credentials live **outside the repo** at `~/.config/career-compass/credentials.json`
(override with `CAREER_COMPASS_CONFIG`), and the scripts refuse to run if that file
is readable beyond your user. Gitignored is not the same as protected. Supabase
credentials are *not* duplicated there — the uploader reads
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from
`intake-app/.env.local`, the file the Next.js app already uses.

**The client id.** `upload_report.py` keys the link to `clients.id`, which reaches
it via `--client-id` at the propose step → `_client_id` in the judgment file →
`client.client_id` in the report JSON. Absent is a **WARN** (`CLIENT_ID_ABSENT`) —
the report still builds, only the upload refuses. Malformed is a **FAIL**
(`CLIENT_ID_MALFORMED`), because a typo would key the link to no row at all.
`--client-id` on the uploader overrides, for a report built before the id was known.

**Naming.** Every upload creates a new file named
`{First}_{Last}_Career_Compass_Report_{YYYYMMDD-HHMMSS}.pdf`. Nothing is ever
overwritten, so a revised report cannot destroy a copy the client already has open.
The Supabase columns point at the newest; the folder is the history.

**Exit codes.** `0` ok · `1` precondition/validation · `2` uploaded but NOT
recorded · `3` auth.

Exit 2 is the one partial worth knowing: the PDF reached Drive but the database
write failed, so screen 3 would wait forever with nothing to show. It prints the
file id and link under `UPLOADED BUT NOT RECORDED`. Recover with `--record-only
<fileId>`, which finishes the database write **without uploading a second copy**.
Never re-run the plain command to fix an exit 2 — that uploads a duplicate.

Exit 3 means the refresh token is dead (revoked, or the password changed):
re-run `authorize.py` and paste the new token in. Nothing retries automatically —
a retry here would hide exactly the failures worth seeing.

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

#### A Seniority Note usually CORRECTS the title rule, it does not obscure it

The intuitive read is that a `Seniority Note` is about whether the client
*qualifies* (years, tier equivalence) while the axis is about where the work
*sits* — and that the note can therefore be discounted. **On the evidence that is
backwards.** Measured across Austin's ten roles, four carried notes:

| Note | About | Title rule | Correct band |
|---|---|---|---|
| "expecting 25+ years rather than 15+" | eligibility | Strategist | Strategist ✓ |
| "Manager by title, **Director-equivalent by functional scope**, full P&L; both readings clear the years threshold" | altitude | Integrator | **Strategist ✗** |
| "Manager by title, **individual contributor by function** — account book rather than direct reports" | altitude | Integrator | **Specialist ✗** |
| "Manager by title, **individual contributor by function**" | altitude | Integrator | **Specialist ✗** |

Three of four are altitude notes, and the title rule gets all three wrong. The
second explicitly rules eligibility out ("both readings clear the years
threshold"), leaving a pure altitude question.

So the note is the signal that says *the title misdescribes the work*.
`--propose` therefore reads the note for direction and prints that reading
**alongside** the AMBIGUOUS flag — it never auto-fills `seniority`, which stays
null for review. Do not "improve" this by suppressing the flag when the note
looks like an eligibility note: a wrong auto-fill ships a dot in the wrong band
with nothing to catch it, while an unnecessary flag costs five seconds.

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

### The client's salary floor is aspirational at build time, not disqualifying

The research handoff document already reflects the floor: it filters upstream,
during research and validation. **A role that survived into the handoff has
already been judged worth showing.** Do not re-apply the floor at build time as
a reason to drop a role, and do not present "clears / does not clear the floor"
as a selection criterion when walking Todd through role selection.

Salary prose routinely says a role "sits below the $120,000 floor" — that is the
research recording where the role lands, not a verdict on whether it belongs in
the report. Report the figures the scenario gives and leave selection to Todd on
his own grounds.

### A role whose research names no salary figures

Some roles' salary prose gives no numbers of their own — Austin's Relationship
Manager says only that banking/wealth scope "clears the $120,000 floor cleanly."
`--propose` flags these with **`SALARY_NO_FIGURES`** so the figures can be
sourced during review rather than discovered at build time. Note the detection
excludes the client's own stated minimum: the prose restates the floor, so
counting any `$` as a figure misses exactly this case.

The build behaviour is unchanged and already correct — null `low`/`avg`/`high`
trips `JUDGMENT_FIELD` and refuses. **Do not add a "graceful" blank-salary
rendering.** `fmt_salary(None)` raises, salary is printed in the TOC beside
every role title as well as on the role page, and one blank row among nine
populated ones reads as a defect rather than as an absence.

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

- **No profile-level check that TOP 5 and NEXT 5 FUNCTIONS are disjoint.** The
  parser reads `TOP 5 FUNCTIONS` and `TOP 5 VALUES` (`profile_list`, ~line 598)
  and never reads `NEXT 5 FUNCTIONS` at all. Nothing compares the two lists, so
  a function named in both passes silently. The existing `RANK_DUPLICATE` check
  covers duplicate `Rank:` values only — there is no analogous profile check.

  Why it matters: `additional_functions` is built as the *complement* of
  `top_functions` over the Functional Mix bullets (`if name in top_functions …
  else additional`), and `report_template.py` renders that list under the
  heading **"ADDITIONAL FUNCTIONS ALIGNMENT"** (line 777). **"Functions 6-10" is
  internal-only wording** from the docstring at line 569 and never reaches the
  page. When the document's declared next-five overlaps the top five, the
  overlapping entries route to the Top 5 table and can never reach the
  additional table, so that table silently carries fewer rows than the document
  claims to supply — with no finding emitted. The rendered heading makes no
  row-count promise to the client, so the report understates rather than
  visibly contradicting itself.

  Seen live in Henry Johnson's document (Sept 8 2026), where two of five NEXT 5
  entries duplicate TOP 5 entries — "Presenting to people via TV, films,
  seminars, speeches" (top #5 / next #6) and "Performing, acting" (top #1 /
  next #10) — leaving three genuinely distinct functions 6-10 declared. Across
  all seven roles the Functional Mix bullets contribute exactly one non-top
  name ("Persuading, motivating, convincing, or selling to a group"), so the
  Additional Functions table would have rendered a single row.

  Confirmed in the build (Sept 8 2026). The corrected document — the two
  duplicate NEXT 5 entries removed upstream, leaving three declared — was
  built to PDF, and the Additional Functions table renders exactly one row
  ("Persuading, motivating, convincing, or selling to a group") on every one
  of the six role pages. So removing the overlap did not change the outcome:
  the shortfall comes from the Functional Mix bullets never naming the other
  declared next-functions, which is a separate gap from the overlap itself
  and is not addressed by fixing the overlap.

  Open: whether the check belongs at FAIL or WARN, and whether an overlap is a
  research-document fix (the likely answer, matching the `FUNCTION_DESC_MISSING`
  precedent) or something the parser should reconcile. **Todd's call — not yet
  decided, and no check has been written.**

- **The font URL the code uses is blocked in Claude Code remote sessions, and
  that kills the whole pipeline — not just graph styling.** Both modules fetch
  DM Sans and Inter from `github.com/google/fonts/raw/...`, and the remote
  session's egress policy denies that host with a 403. The agent proxy's own
  README classes a 403 as an organization policy denial: report the blocked
  host, do not retry.

  **The blocked thing is that URL, not the fonts.** Measured Sept 8 2026 from a
  remote session:

  | URL | Result |
  |---|---|
  | `github.com/google/fonts/raw/main/ofl/dmsans/DMSans[opsz,wght].ttf` — what the code calls | **403** |
  | `github.com/google/fonts` — the host generally | 403 |
  | `raw.githubusercontent.com/google/fonts/main/ofl/dmsans/DMSans[opsz,wght].ttf` | **200** |
  | `pypi.org` — control | 200 |

  `raw.githubusercontent.com` is the host `github.com/.../raw/...` redirects to,
  and it is permitted. Both faces download intact from it: verified by reading
  the `name` tables with fontTools — `DM Sans 9pt` Regular v4.004 (240,164 B)
  and `Inter` Regular v4.001 (876,576 B). Genuine variable fonts, confirmed by
  inspection rather than assumed from a 200 and a plausible file size.

  **The URLs are deliberately NOT changed.** Whether fetching the identical
  asset from a permitted host is acceptable, or is the "routing around" the
  proxy README forbids, is an organization egress-policy question for Todd and
  not a technical one — and it is not decided as a side effect of wanting a
  build to succeed. Pending that decision the code stands as written, and
  `/tmp/fonts` is left unpopulated. (Todd, Sept 8 2026.)

  The severity depends on which module needs the font, and only one of the two
  has a fallback:

  | Module | On a 403 | Effect |
  |---|---|---|
  | `graph_generator.py` | falls back to DejaVu Sans, prints one `NOTE:` line | graphs render, off-brand |
  | `report_template.py` | **no fallback** — `ensure_fonts()` runs at *import* time and `pdfmetrics.registerFont(TTFont("DMSans", "/tmp/fonts/DMSans.ttf"))` follows immediately | the module cannot even be imported |

  Because `parse_research_markdown.py` imports `MIN_ROLES`/`MAX_ROLES` from
  `report_template.py`, that import failure propagates: **`--propose` dies too.**
  So a remote session produces no draft judgment file, no report JSON and no
  PDF — it fails at the very first command with
  `Cannot import MIN_ROLES/MAX_ROLES from report_template.py: HTTPError: HTTP
  Error 403: Forbidden`, before any parsing happens.

  The earlier wording here ("graphs still render… treat any graph as not
  client-deliverable") understated this. It is not a cosmetic degradation to
  inspect and discard — **as the code stands, nothing runs at all**, so there is
  no remote output to judge. Local runs are unaffected. Verified Sept 4, Sept 5
  and Sept 8 2026.

  Note what that does and does not mean now. It is accurate that a remote
  session cannot currently run the pipeline. It would **not** be accurate to say
  the brand fonts are unreachable from a remote session — they are reachable,
  from `raw.githubusercontent.com`, and the only reason the pipeline fails is
  the URL the code happens to use. Three routes would each fix it: allowlisting
  `github.com`, changing the URLs, or pre-populating `/tmp/fonts` from the
  permitted host. All three await Todd's policy decision; none is taken.

  **Do not satisfy the import by dropping any available TTF at those paths.**
  `report_template.py` registers whatever file it finds under the names
  `DMSans`/`Inter` and prints no warning, so a substituted face yields a PDF
  that looks branded, claims to be branded, and is not — removing the only
  signal that would have caught it.

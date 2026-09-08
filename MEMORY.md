# Career Compass v2 — MEMORY.md

*Last updated: Sept 7, 2026*

This file holds **confirmed** facts, decisions, and gotchas. It is authoritative — read at the start of every session and treated as settled.

Two ways things get in here:
1. **Todd says "log that"** — captured immediately, directly into the right section below.
2. **Promoted from `SESSION_LOG.md`** at a 5-session review — raw observations get examined with Todd, and only what he confirms graduates into this file.

Nothing lands here on Claude Code's inference alone. Unconfirmed observations belong in `SESSION_LOG.md`.

Keep this file short. If it's getting long, that usually means something belongs in `CLAUDE.md` (if it's behavioral) or should be pruned (if it's stale).

---

## Current Status

**Phase:** 2 — Report PDF template (**complete and proven**)
**State:**
- **Phase 1 (intake form + minimal admin view): built and deployed.** Live in production at `career.ministrytomarketplace.co`. Supabase-verified (writes and RLS confirmed against the live project).
- **Phase 2 (report build): built, verified, and reviewed.** The full pipeline — Stage-2 research markdown → `parse_research_markdown.py` → `graph_generator.py` → `report_template.py` → branded PDF — has produced a real client report end to end: **Austin Scheiwe, 26 pages.** Independently verified against actual page content, and personally reviewed by Todd. The `career-compass-report` skill has additionally been cold-session verified multiple times across different environments. Phase 2 is not "unverified work" — treat it as proven.

**Do not mistake gitignore for absence.** The Austin Scheiwe report and all generated client artifacts live in `reports/scheiwe/`, and `reports/` is gitignored. They are absent from git and from any fresh clone, but they are real and present on Todd's Mac. A future session that cannot see them in git must not conclude the work was never done — check the filesystem.

*(Phase 1 status confirmed by Todd Sept 4 2026. Phase 2 completion confirmed by Todd Sept 7 2026; 26-page count and embedded DM Sans/Inter independently re-confirmed from the PDF that same day.)*

---

## Decisions Made

*Decisions that are settled and shouldn't be re-litigated. Add the reasoning, not just the conclusion.*

- **New repo, not a folder in the old one.** `career-compass-v2` is deliberately separate from `github.com/launch-point/career-compass` so there's no need to reason about which files are relevant — everything here is in scope. (Sept 2026)
- **Client picks their own top 5 functions.** In v1's design the system computed a top 5 by summing ratings. In v2 the client selects it directly in Phase 4 of the functions track. Any downstream logic must consume the client's selection, not recompute it. (Sept 2026)
- **Email is the join key between Mission Control and Career Compass.** Clients are already logged into Mission Control before reaching the intake iframe; they use the same email for the magic link. No separate identity reconciliation system. (Sept 2026)
- **No upskilling-tolerance question in intake.** Replaced by a flat downstream rule: any role requiring more than 3 months of upskilling is excluded at the validation stage. (Sept 2026)
- **No job-history screen.** The four Career Highlight Stories capture last-15-years signal narratively. Current job title is a single text field. (Sept 2026)
- **Google Drive upload + Mission Control linking deferred to Phase 4.** Do not design or build it during phases 1–3. Interim requirement: every phase writes output tied to the stable client ID in a predictable, loggable way so phase 4 wires existing IDs together rather than retrofitting. (Sept 2026)
- **Compact-mode axis-label crowding: left as-is, not reworked.** It is real and
  geometric (see Technical Notes), but at the size the graph is actually placed in the
  PDF every label reads cleanly. The available fixes — shorter abbreviations or less
  label rotation — both change the compact slot's geometry, which the PDF layout depends
  on through the pinned `COMPACT_W`. Not worth destabilising a proven layout for a
  cosmetic gain. (Sept 7 2026)
- **Rating UI for functions Phase 2: paginated, not one long scroll.** Chunks of 8 per
  screen with a section-level progress rail. Shipped in Phase 1 as `PAGE_SIZE = 8` in
  `FunctionScreens.tsx` — the log recorded the intent as "~8–10", the build settled on 8.
  (Decided Sept 1 2026; confirmed and promoted Sept 7 2026)
- **Salary is a structured integer, not open text.** `salaryMin: number | null`, with
  `salaryPeriod` fixed to `'annual'` (USD) as the only period offered. Stored as an
  integer and formatted for display only. Shipped in Phase 1.
  (Decided Sept 1 2026; confirmed and promoted Sept 7 2026)
- **The client's salary floor is aspirational at build time, not disqualifying.** The
  floor does its filtering upstream, during research and validation. A role that
  survived into the research handoff document has already been judged worth showing,
  so the floor is not re-applied at build time as a reason to drop a role — and
  "clears / does not clear the floor" is not offered as a selection criterion when
  walking Todd through which roles ship. Salary prose routinely records that a role
  "sits below the $120,000 floor"; that is the research stating where the role lands,
  not a verdict on whether it belongs in the report. This is a pipeline rule, not a
  per-client judgment. (Sept 7 2026)

---

## Open Questions

*Things that need Todd's input before they can be resolved. Remove once answered — move the answer to Decisions.*

- (none open)

---

## Technical Notes & Gotchas

*Things that cost time to figure out once and shouldn't cost time again.*

- **A fresh clone has no venv and no `reports/` — both gitignored by design.** `.claude/skills/career-compass-report/.venv/` and `reports/` are both in `.gitignore`, so any new clone gets the report skill's scripts (`SKILL.md`, the three `.py` files, `assets/`, `fixtures/`) but no Python interpreter and no client artifacts — no research markdown, judgment file, generated JSON, or PDF. Verified directly on a fresh remote clone, Sept 5 2026. **Practical rule: use a remote/cloud session to inspect or structurally verify the pipeline; run the real client build locally — never treat a remote-session PDF as client-deliverable.** The venv gap is only setup friction (build it per SKILL.md's pins and it's gone) — confirmed today. Remote output is non-deliverable because the environment's egress policy blocks the brand-font host (`github.com/google/fonts` → 403 → silent DejaVu fallback; SKILL.md Known Gaps). This has now been independently confirmed in two separate remote sessions (Sept 4 and Sept 5, 2026), both hitting the identical block — treat this as settled, reliable behavior of running this pipeline remotely, not a fragile one-off. If a future environment's policy changes, that would need to be re-verified before this guidance is revised — until then, local build is required for anything client-facing. (Sept 5 2026)
- **matplotlib: `scatter(..., transform=ax.transAxes)` still autoscales the axes' *data* limits from the raw offset values.** It does not "opt out" of data space the way it looks like it should. Consequence: on an `axis("off")` legend axes, those scatter calls silently collapsed the data limits to `(-0.055, 0.055)`, and a sibling `text()` left in data coords at `y=1.0` was flung to figure-fraction y=3.07 — three figure-heights above the canvas. `bbox_inches="tight"` then grew the saved PNG to ~20in tall to contain it. **Rule: on any axes used purely for layout, pin `set_xlim(0,1)`/`set_ylim(0,1)` and give *every* artist an explicit `transform=`. Mixing coordinate systems on one axes is the trap.** Cost a full diagnostic cycle in the Phase 2 graph generator; regression fixture at `.claude/skills/career-compass-report/fixtures/`. (Sept 4 2026)
- **Graph dimensions drift for layout reasons, not font reasons — don't blame the font
  fallback.** Measured on Todd's Mac with real DM Sans/Inter present: role mode renders
  2541×1095, DejaVu fallback 2554×1097. Fonts account for ~13px of width and 2px of
  height — nothing. SKILL.md's long-standing `2541x1280` came from rendering the
  generator as it stood *before* commit `93e00f3`, which switched axis labels from
  rotated to horizontal-wrapped and shortened the `bbox_inches="tight"` crop;
  `figsize` has never changed in any commit. Role and overview modes are tight-cropped,
  so their pixel dimensions are a *consequence* of label layout and will drift again.
  Document them as approximate. Compact mode is the exception — pinned figsize, no tight
  bbox, reliably 840×570. (Sept 7 2026)
- **Compact-mode label crowding is geometric, not font-related.** Identical four
  overlapping tick-label pairs under both real fonts and DejaVu (Product/Marketing,
  Sales/Customer-Experience, HR/Finance-and-Accounting, Legal/Comms); magnitudes differ
  only slightly. Mechanism: at `rotation=40` a wrapped label's second line offsets
  down-and-left and tucks under the previous column's label, so only the two two-line
  labels are affected. **Caveat on the measurement:** those overlap figures are
  axis-aligned boxes around rotated text, so they badly overstate real glyph collision —
  rendering page 7 of Austin's delivered PDF at 300dpi shows every label reading cleanly.
  If this is ever re-measured, check the rendered artifact, not just the bboxes.
  (Sept 7 2026)
- **In a line-anchored regex, `\s` crosses newlines and lets one match swallow the
  next line.** `\s` includes `\n`, so under `re.M` a pattern like
  `^[-*]\s*(.+?):\s*(\d+)%\s*(?:—\s*(.*))?$` does not stop at its own line end:
  the `\s*` before the optional group eats the newline, `—`/`-` matches the *next*
  bullet's marker, and that whole line is captured as this line's description.
  Consequence in the v2.3 parser: every second Functional Mix bullet was consumed,
  five listed top functions parsed as three, and the validator reported
  TOP_FUNCTION_ABSENT against a document that was correct. **Rule: use `[ \t]` for
  intra-line whitespace and `[^\n]` for intra-line content in any `re.M` pattern;
  reserve `\s` for where a newline is genuinely wanted.** Same family as the
  matplotlib `transAxes` entry above — invisible, plausible-looking, and easy to
  reintroduce. (Sept 7 2026)
  *Earned its place within hours:* an externally-supplied patch for template v2.4
  proposed replacing that pattern with a `\s*`-based one around the optional tail
  group, which would have reintroduced this exact bug. Todd caught it before it
  reached the repo. Treat any `\s` in a line-anchored pattern as suspect.
- **Functional Mix description tails: required above 0%, forbidden at 0% (template
  v2.4).** v2.3 dropped the `— description` tail, blanking the report's "How It Shows
  Up In This Role" column on every function of every role; v2.4 restored it. The
  parser enforces the template's three rules: `FUNCTION_DESC_MISSING` (**FAIL** —
  above 0% with no tail), `FUNCTION_DESC_ON_ZERO` (WARN — a 0% function with a tail
  contradicts its own percentage; the tail is discarded so the "Not a core function of
  this role" sentinel still renders), and `FUNCTION_DESC_RESTATES_NAME` (WARN,
  exact-match only). The old `TEMPLATE_GAP_NO_DESCRIPTION` warning is renamed and
  promoted to FAIL — **a v2.3-era document now hard-fails by design**, because it
  would otherwise ship blank cells to a client. Never synthesize a tail to satisfy the
  check: the pre-v2.4 code turned an empty tail into `"."` and printed a bare period in
  every row. A missing tail is a research-document fix. (Sept 7 2026)

---

## Corrections Log

*When Todd corrects something, capture it here so the same mistake doesn't repeat. Include what was wrong and what the right behavior is.*

- **Never conclude "absent" from a truncated command.** Ran `ls -R reports | head -40`;
  the pipe cut the output at exactly the `reports/scheiwe:` line, so the directory read as
  empty and Austin's finished 26-page report was reported to Todd as missing/unbuilt. All
  17 files were there the whole time. Before reporting anything missing, confirm with a
  targeted check — `ls` the specific directory, or `find` with a name filter — never a
  head/tail-truncated listing. A truncated command manufactures false negatives.
  (Sept 7 2026)
- **Gitignored does not mean unreadable.** `reports/` is gitignored, which hides it from
  git and from a fresh clone — but not from the filesystem tools. Generated client
  artifacts can and should be verified directly on disk. (Sept 7 2026)
- **When a verification run fails, check the harness before reporting the failure —
  and treat this as a step, not a reminder.** Five times in one session a reported
  failure was the check, not the code: `ls -R | head -40` truncated a listing into a
  false "directory empty"; a legend check searched PDF *text* for titles that live
  inside a PNG; a drift scenario asserted a rank gap after dropping the LAST role,
  which is genuinely undetectable (ranks 1..N-1 in an (N-1)-role document is exactly
  what a legitimate shorter document looks like); a drift mutation used an unanchored
  `[—–-]` that matched the leading `- ` bullet marker and deleted the whole line, so
  the *function* vanished instead of its description tail; and an em-dash written as
  `\u2014` inside a raw replacement string raised `re.error: bad escape \u`.
  SESSION_LOG records two more in session 2.
  **The part worth acting on is not the count.** This entry already existed, in this
  file, roughly an hour before the last two happened — and it did not change behaviour
  in the moment. Recording a lesson here is demonstrably not the same as applying it
  under momentum, so the countermeasure has to be procedural: before reporting any
  verification failure, re-derive the expectation and confirm the check can actually
  observe what it claims to — as an explicit step, not as something a note is trusted
  to trigger. (Sept 7 2026)
- **SESSION_LOG's session-2 "two approved SKILL.md edits never applied" entry is stale —
  both edits did land.** SKILL.md's mtime was Sept 4 17:34, after the 17:04 log entry;
  `## Setup`, `python3 -m venv`, `reportlab==`, `DejaVu Sans` and the role-mode docs are
  all present in the file. Do not re-apply them. General lesson: SESSION_LOG entries
  capture a moment mid-session and can be overtaken by later work in that same session —
  check the file before acting on a logged "verified absent". (Sept 7 2026)

---

## Key Paths & IDs

| Thing | Value |
|---|---|
| Master Data Sheet | `1hgBOWdDzMzEvun5Vv0CxU7AKRAToohgnSDABQ1jdMpg` |
| Intake Submissions tab | New tab, written at form submit |

---

## Deferred / Not Now

*Identified but deliberately not being built yet. Don't invent work from this list — it's a parking lot, not a backlog.*

- Google Drive upload + Drive-linked download (Phase 4)
- Circle DM delivery (Phase 4)
- Full admin dashboard: client table, top-5 column, PDF download (Phase 4)
- Agent training loop: pattern surfacing every ~5 sessions to turn Todd's intuitive gate decisions into explicit rules (after phases 1–4)
- Fixed master role list of 50–100 real roles (Todd building in parallel, manually)

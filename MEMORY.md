# Career Compass v2 — MEMORY.md

*Last updated: Sept 8, 2026*

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
- **Phase 1 (intake form + minimal admin view): built and deployed.** Live in production at `career.ministrytomarketplace.co`. Supabase-verified **on writes and RLS only** — both confirmed against the live project. **The prod magic-link sign-in path was not part of that verification and may never have had a successful end-to-end run.** `LoginPanel.tsx` routes to a dev-cookie path whenever `NEXT_PUBLIC_SUPABASE_URL` is unset, so local testing bypasses Supabase auth entirely. **Sign-in is now confirmed working end to end in production (Sept 9 2026):** a magic link signed Todd in and resumed his in-progress intake. Do not read the original "Supabase-verified" note as having covered auth — it did not. That was the same class of problem as a stale entry: a note reading broader than what was actually tested end to end. (Narrowed Sept 9 2026; auth confirmed working Sept 9 2026 — both directed by Todd.)
- **Phase 2 (report build): built, verified, and reviewed.** The full pipeline — Stage-2 research markdown → `parse_research_markdown.py` → `graph_generator.py` → `report_template.py` → branded PDF — has produced a real client report end to end: **Austin Scheiwe, 26 pages.** Independently verified against actual page content, and personally reviewed by Todd. The `career-compass-report` skill has additionally been cold-session verified multiple times across different environments. Phase 2 is not "unverified work" — treat it as proven.

**Do not mistake gitignore for absence.** The Austin Scheiwe report and all generated client artifacts live in `reports/scheiwe/`, and `reports/` is gitignored. They are absent from git and from any fresh clone, but they are real and present on Todd's Mac. A future session that cannot see them in git must not conclude the work was never done — check the filesystem.

**Two client reports delivered through all four gates.** Austin Scheiwe (26 pages) and
**Henry Johnson (24 pages, 6 roles, Gate 4 approved by Todd Sept 8 2026)**. Henry's run
selected 6 of 7 researched roles — Adjunct Professor dropped at the judgment gate — and
both parse phases reported `FINDINGS: none`. Artifacts in the gitignored `reports/johnson/`.
The pipeline is now proven across two clients with different role counts, function spreads
and salary structures.

*(Phase 1 status confirmed by Todd Sept 4 2026. Phase 2 completion confirmed by Todd Sept 7 2026; 26-page count and embedded DM Sans/Inter independently re-confirmed from the PDF that same day. Henry Johnson run confirmed complete by Todd Sept 8 2026.)*

**Submit → Make.com → Slack notification pipeline is live and verified end to end
(Sept 9 2026).** A real submission through the production intake form produced a correct
Slack header and thread: requirements, all 16 story fields, and all four arrays render.
Story 4 was correctly empty (only three stories filled). This also independently confirms
the webhook payload refactor `0a7bc4f` is live and correct in production — `functions.next5`
contains genuinely different items from `functions.top5`, so the computed filter is doing
real work rather than being a rename. Verified by Todd against the actual Slack message.

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
- **A format defect in a research document goes back to the research thread — it is
  never patched at the build step.** This holds even when the fix is lossless and
  cheap to do locally. The reason is not purity: the research thread does not learn
  from a silent downstream fix, so it produces the same defect on the next client.
  Applied twice now with the same reasoning — the Functional Mix description tails
  (v2.3, which blanked "How It Shows Up In This Role" on every row) and Henry
  Johnson's prose "Why This Fits You" (v2.4, five keyed entries collapsed into one
  summary paragraph). Both were mechanically trivial to reconcile in the parser;
  both went upstream instead.

  **Corollary: this is why the parser refuses rather than synthesizes.** A parser
  that fills gaps hides the very signal the upstream thread needs to correct itself.
  (Sept 8 2026 — directed by Todd)

  **The rule has now paid off once, measurably.** Henry Johnson's collapsed "Why This
  Fits You" went back to the research thread in session 4 rather than being reconciled
  in the parser. The corrected document returned in session 5 diffing as exactly 7
  prose paragraphs → 35 keyed bullets with nothing else changed, and parsed clean on
  the first attempt (`vals 5/5` on every role). The upstream thread produced the fix
  correctly, which is the outcome the rule exists to buy. One confirmed instance, not
  yet a pattern. (Sept 8 2026)

---

## Open Questions

*Things that need Todd's input before they can be resolved. Remove once answered — move the answer to Decisions.*

- **Should the parser check that TOP 5 and NEXT 5 FUNCTIONS are disjoint — and at what level?** No such check exists. The parser reads `TOP 5 FUNCTIONS` and `TOP 5 VALUES` and **never reads `NEXT 5 FUNCTIONS` at all**, so an overlap between the two lists passes silently; the only duplicate check in the file is `RANK_DUPLICATE`, which covers `Rank:` values.

  It would distort a report because `additional_functions` is the *complement* of `top_functions` over the Functional Mix bullets, and the template renders that list under the heading **"ADDITIONAL FUNCTIONS ALIGNMENT"** (`report_template.py:777`). **"Functions 6-10" is internal-only** — it lives in a docstring at `report_template.py:569` and never reaches the page. Overlapping entries route to the Top 5 table and can never reach the additional table, so that table quietly renders fewer rows than the document declares. Because the rendered heading makes no row-count promise, the client-visible defect is milder than a table titled "Functions 6-10" would be: the report understates rather than contradicting itself. (Heading corrected Sept 8 2026, read off Henry Johnson’s rendered PDF.)

  **The overlap and the short table are separate gaps, and fixing the first does not
  fix the second.** Henry's document had its two duplicate NEXT 5 entries removed
  upstream, leaving three declared. The built report still renders **exactly one** row
  in the Additional Functions table on all six role pages — verified by cell-level
  extraction across every page, not inferred. The shortfall's real cause is that the
  Functional Mix bullets never name the other declared next-functions, which no
  disjointness check would catch. Solve them separately. (Sept 8 2026)

  Needs deciding: FAIL or WARN, and whether the check belongs parser-side or template-side. **Parked for the 5-session review — not to be added mid-build.** Detail in SKILL.md Known Gaps, where the originating example is recorded. (Logged Sept 8 2026 — verified by reading the parser, not inferred. Narrowed to the general question Sept 8 2026: the document that surfaced it was corrected upstream, so no client document is currently affected.)

- **A role priced on a different basis than its neighbours has nowhere to say so — this
  needs a real fix.** `salary_context` is parsed but never rendered (see Technical Notes),
  so the report can only ever show a `Low / Avg / High` dollar band plus the average in the
  TOC. When one role is priced on a different basis than the rest, the band silently
  misrepresents it. This is not hypothetical and not one-off: Austin's CSM was **OTE** among
  seven base-salary roles, and Henry's Adjunct Professor was **per-course**, which is why it
  was dropped rather than shipped at a misleading $20,000. Two clients, two occurrences.

  Needs deciding: render `salary_context` beneath the band, add a unit/basis label to the
  band itself, or something else. Dropping the role is the current workaround and it
  discards research Todd may want shown. **Todd's call — a template change to proven
  Phase 2 code, so it wants a presented diff and a pagination re-verify.** (Sept 8 2026)

---

## Technical Notes & Gotchas

*Things that cost time to figure out once and shouldn't cost time again.*

- **Make.com: a scenario built by hand and never run against real traffic silently
  renders every field empty — and unprefixed `{{field}}` references are inert text.**
  Two compounding causes, both of which produced blank Slack fields:

  1. **The webhook had never determined its data structure** ("No data detected"). The
     scenario was built in session 1 but no real submission ever reached it — the 2/hour
     Supabase email ceiling prevented completing one. Until a live payload arrives and the
     structure is detected, downstream modules have nothing to bind to.
  2. **The Slack module's field mappings were hand-typed** as `{{email}}`,
     `{{requirements.currentJobTitle}}` and so on. **Make.com references need the
     module-ID prefix — `{{2.email}}` — to bind to the webhook's output.** Without it they
     are inert literal text and render empty.

  Fix: detect the data structure from a live submission, then rewrite every reference in
  both Slack messages with the `2.` prefix.

  **The diagnostic tell is the key part.** Fields *unrelated to any recent change* were
  also blank. If only the recently-changed fields were empty you would suspect the change;
  when everything is empty, including untouched fields, suspect the scenario's binding —
  not the payload. That distinction is what separates this from the payload-shape problem
  it was initially confused with. (Sept 9 2026)

- **Magic-link auth: custom SMTP is configured and working, and the real fix for the
  `otp_expired` failures was Supabase's Site URL — not anything in this codebase.**

  *SMTP (cleared, no longer a constraint on real client use):* Resend, configured in the
  Supabase dashboard — `smtp.resend.com:465`, username `resend`, the Resend API key as the
  password, sending domain verified on `ministrytomarketplace.co`. Nothing about it lives
  in this repo, so grepping the tree for `smtp` finds nothing; it is dashboard state.
  Confirmed past Supabase's default built-in ceiling (~2/hour): 8 sends in 10 hours and 3
  within 2 minutes, all registering in Resend rather than silently falling back to
  Supabase's own sender.

  *The actual root cause of the sign-in failures:* Supabase's **Site URL** was still
  `http://localhost:3000`. Every emailed link was baked with the wrong base, and the
  `otp_expired` / "Email link is invalid or has expired" errors were downstream of that.
  Correcting Site URL to the production domain fixed sign-in.

  **The callback diagnostics did not fix this.** Commit `4af9ac8` (deployed to `main` as
  `64d727c`) only changed `auth/callback` from swallowing every failure to reporting a
  named `?auth_error=` — `missing_code`, `exchange_failed`, `no_session`, or a
  query-string `error_code` passthrough — with a matching `console.error` in the Vercel
  function logs. That is worth keeping because the next failure will be legible, but it
  repaired nothing. **When auth breaks, check Supabase's Site URL and Redirect URLs
  before reading application code.** (Sept 9 2026)

- **A fresh clone has no venv and no `reports/` — both gitignored by design.** `.claude/skills/career-compass-report/.venv/` and `reports/` are both in `.gitignore`, so any new clone gets the report skill's scripts (`SKILL.md`, the three `.py` files, `assets/`, `fixtures/`) but no Python interpreter and no client artifacts — no research markdown, judgment file, generated JSON, or PDF. Verified directly on a fresh remote clone, Sept 5 2026. **Practical rule: use a remote/cloud session to inspect the pipeline's source and the research document; run every actual pipeline command locally.** The venv gap is only setup friction (build it per SKILL.md's pins and it's gone) — confirmed today, and the four pins resolve fine on Python 3.11 as well as the 3.9 they were verified on. The egress policy blocks `github.com` (→ 403), which is the host both modules fetch DM Sans and Inter from.

  **Correction 1 of 2, Sept 8 2026 — the severity was understated.** This note used to say remote output was merely off-brand ("silent DejaVu fallback"), implying a remote session still produces structurally sound artifacts that simply aren't client-deliverable. That is true of `graph_generator.py` alone, which does fall back to DejaVu. It is **not** true of the pipeline: `report_template.py` calls `ensure_fonts()` at *import* time and registers DM Sans/Inter immediately after, with no fallback — so it cannot be imported at all. `parse_research_markdown.py` imports `MIN_ROLES`/`MAX_ROLES` from it, so the failure propagates to the very first command. **`--propose` dies too. As the code stands, a remote session yields no draft judgment file, no report JSON and no PDF — nothing to inspect or discard.** Confirmed by running it: `Cannot import MIN_ROLES/MAX_ROLES from report_template.py: HTTPError: HTTP Error 403: Forbidden`.

  **Correction 2 of 2, Sept 8 2026 — what is blocked is that URL, not the fonts.** Saying "the brand fonts are unreachable from a remote session" would be wrong. Measured from a remote session: `github.com/google/fonts/raw/main/ofl/dmsans/DMSans[opsz,wght].ttf` (the URL the code calls) → **403**; `github.com/google/fonts` → 403; the same font file at `raw.githubusercontent.com/google/fonts/main/...` → **200**; `pypi.org` control → 200. `raw.githubusercontent.com` is the host the blocked URL redirects to, and it is permitted. Both faces arrive intact — verified by reading the `name` tables with fontTools, `DM Sans 9pt` Regular v4.004 (240,164 B) and `Inter` Regular v4.001 (876,576 B), rather than inferred from a 200 and a plausible file size.

  **The URLs are deliberately not changed, and `/tmp/fonts` is left unpopulated.** Whether pulling the identical asset from a permitted host is acceptable, or is the "routing around" the agent-proxy README forbids, is an organization egress-policy question — Todd's, not a technical one, and not to be settled as a side effect of wanting a build to work tonight. Three routes would each fix it (allowlist `github.com`, change the URLs in both modules, or pre-populate `/tmp/fonts` from the permitted host); **none is taken pending his decision.** (Todd, Sept 8 2026)

  Three independent remote sessions have now hit this host block (Sept 4, Sept 5, Sept 8 2026) — settled behavior, not a fragile one-off. **Never satisfy the import by placing a substitute TTF at `/tmp/fonts/DMSans.ttf`:** registration is by filename and prints no warning, so the resulting PDF would look and claim to be branded while silently not being — destroying the only signal that catches it. This is why correction 2 matters in practice: a 200 from any host is not evidence of a genuine face, and the name-table check above is the bar. If a future environment's policy changes, re-verify before revising this. Until the policy question is answered, run the build locally. (Sept 5 2026; corrected Sept 8 2026)
- **`salary_context` is parsed into the report JSON and never rendered.** The parser
  writes it (`parse_research_markdown.py:517`, parsed Salary prose winning over any
  judgment value), but `report_template.py` never reads the key — the only salary output
  is the `Low / Avg / High` band (lines 730-732, via `fmt_salary`, always `$N,NNN`) plus
  the average printed beside the title in the TOC (line 331). **Consequence: there is no
  field that carries a salary caveat onto the page.** `seniority_note` is the only nearby
  free text that renders, as "A NOTE ON LEVEL", and it is a note about level, not pay.
  Verified against Austin's delivered PDF: his `salary_context` ("Nonprofit-context
  analytical band…") appears nowhere in the extracted text while his band renders fine.
  Do not assume a caveat written into the judgment file will reach the client — it will
  not. See the Open Question above; this wants a real fix. (Sept 8 2026)
- **Verification here spans three classes, and they are not interchangeable.**
  (1) *Automatable data/pipeline* — parse, diff, re-parse; fully machine-checkable.
  (2) *Interactive UI* — Todd walks the real flow in a browser; catches per-screen
  interaction gates that backend checks structurally cannot. (3) *Visual artifact* —
  the graph PNG and the PDF must be opened and looked at, because extraction alone
  misses truncation, collisions and empty states. A completion claim that only covers
  class 1 is not verified. Recurred across sessions 1-2 and held since. (Promoted from
  SESSION_LOG at the sessions 1-5 review, Sept 8 2026)
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

- **Work landing on `phase-2-report` is NOT deployed. Production tracks `main`.**
  `career.ministrytomarketplace.co` builds from `main`, and as of Sept 9 2026 `main`
  is **49 commits behind** `phase-2-report`. Todd had been reasoning as though branch
  work was live; it is not, and neither is anything else merged only to the branch.
  Verified two ways, not assumed: the old callback route is still the file content at
  `origin/main`, and a live `GET /auth/callback` returned `location: .../` rather than
  the new `?auth_error=missing_code`.

  **What this means is already concrete, not hypothetical.** Commit `e69a1dc` — the
  webhook payload refactor that flattened `functions`/`values` from
  `top5`/`top10` object arrays to `top5`/`next5` label-string arrays, plus the
  `admin/[id]/page.tsx` change that adapts the consumer to it — has never been live.
  **Production still emits the OLD payload shape.** Any downstream consumer built
  against the new shape is reading a contract that prod does not serve.

  Only three app files differ between `main` and the branch; everything else in those
  49 commits is docs, MEMORY/SESSION_LOG, and the report skill, none of which ships in
  the web app. **Before assuming any intake-app behaviour is live, check it against
  `origin/main` — not against the working tree or the branch.** (Sept 9 2026 —
  directed by Todd)

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
- **A claim about client-visible output is only true once it has been read off a rendered
  artifact — and that standard governs what gets written into authoritative files, not
  just what gets said to Todd.** Both MEMORY.md and SKILL.md stated that the additional-
  functions list renders under the heading **"Functions 6-10"**. It does not, and never
  did: the rendered heading is "ADDITIONAL FUNCTIONS ALIGNMENT", and "Functions 6-10"
  exists only in a docstring at `report_template.py:569`. The wrong heading survived in
  two authoritative files, was reasoned from twice, and shaped how an open question was
  framed. Every prior instance of this failure was a transient claim; this one was
  load-bearing documentation.

  **The same standard applies when writing the correction.** In the same session a line
  was added to SKILL.md asserting the one-row table renders "on every one of the six role
  pages" when only two had been looked at and four were inferred from JSON. It happened to
  be true — confirmed afterwards by cell-level extraction on all six — but it was written
  before it was known. Writing into MEMORY.md or SKILL.md is a completion claim; verify it
  the same way, before it lands, not after.

  Deliberately **one entry, not two**: these are the same rule at different scopes, and
  splitting them would let the scopes drift apart — the same reasoning that collapsed
  `TEMPLATE_GAP_NO_DESCRIPTION` into `FUNCTION_DESC_MISSING` rather than keeping both.
  (Sept 8 2026 — confirmed by Todd at the sessions 1-5 review)

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
- Slack message cosmetics (not blocking; pipeline works): the four arrays render
  comma-separated on one line rather than one item per line, and `submittedAt` renders as
  raw ISO (`2026-09-09T14:31:59.899+00:00`) rather than a readable date. (Noted Sept 9 2026)

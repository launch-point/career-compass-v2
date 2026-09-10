# Career Compass v2 — SESSION_LOG.md

**This file is raw evidence, not settled fact.**

Observations, corrections, and tentative patterns get appended here at the end of every session. Nothing in this file is authoritative. Do not read it at session start and treat its contents as decided — `MEMORY.md` is the trusted file.

Every 5th session, the entries since the last review get examined with Todd. Only what Todd confirms gets promoted into `MEMORY.md`. Everything else either stays here awaiting more evidence, or gets struck through as rejected.

Append-only. Don't rewrite or clean up past entries — the record of what was thought at the time is part of the evidence.

---

## Session 1 — 2026-09-01

**Decisions made:**
- Stack for Phase 1: Next.js (App Router, TS) on Vercel + Supabase (Postgres + magic-link Auth + email). Postgres is source of truth; Sheets write + webhook are downstream side-effects fired after DB commit.
- Rating UI (functions Phase 2): paginated chunks (~8–10/screen) with a progress bar.
- Salary field: structured number input, stored as integer (annual USD assumed).
- Standalone access: allow direct visit if authenticated; CSP `frame-ancestors` restricts embedding to the Mission Control origin only.
- Magic-link failure UX: "check inbox + spam" + Resend button, 60s cooldown, capped 5/hour.

**Corrections from Todd:**
- **False "blocker" from a path mismatch.** The plan initially flagged the functions/values source content as a blocker and expected it at `docs/source/functions-raw.md` / `docs/source/values-raw.md`. The content was already in the repo the whole time at `docs/functions-values-source.md` (committed before the plan was written). Lesson for future sessions: before trusting any "blocker" claim about missing content, check what's actually in the repo (`ls`/grep) rather than assuming a path.

**Build outcome (session 1):**
- Built Phase 1 intake app (Next.js 16 + Supabase-ready) end to end: config from source (19/151/94), data model, storage adapter, auth, submit pipeline, full wizard (Sections A–F), minimal admin, docs. Committed in increments on branch `phase-1-intake-form`.
- **Dev-mode decision:** no Docker/Supabase CLI/psql available locally, so built a storage/auth adapter with a filesystem+cookie DEV MODE (active when Supabase env absent; refused in production) so the flow is verifiable now; real Supabase/Sheets/webhook paths written but not yet run against live infra. Needs Todd's secrets + `supabase db push` of `0001_init.sql`.

**Technical notes (tentative — candidate for MEMORY at review):**
- **Next.js 16 renamed `middleware.ts` → `proxy.ts`**; `cookies()`/`headers()`/route `params` are async; static `frame-ancestors` CSP goes via `next.config.ts` headers(). The scaffold pins Next 16.3.4 / React 19.2 and auto-writes an `intake-app/AGENTS.md` warning to read `node_modules/next/dist/docs` before coding.

**Didn't work as expected:**
- **In-browser UI walk could not be machine-verified this session.** Chrome extension automation was declined; there is no "Cursor Browser" tool in this Claude Code environment, and the app was not rendered in any browser earlier this session (a mid-session request assumed it had been). Backend pipeline WAS verified with real output via `scripts/verify-e2e.mjs` (draft→save→submit→lock, real webhook payload + matching HMAC, real 35-col Sheets row, gate 422, locked 423, idempotent duplicate, cross-session resume). The 19-screen click-through remains for Todd to walk manually or via a re-enabled browser tool.

**Patterns I'm noticing (tentative):**
- Verification here splits cleanly into "pipeline/data shape" (fully automatable, done) vs "interactive UI" (needs a browser). Worth having a standing way to do the browser half — e.g. Todd walks it, or a Playwright harness — so completion claims aren't gated on manual clicking.

---

## Session 1 (continued) — 2026-09-02

*Same session, next day. Covers the two browser walkthroughs Todd ran, the refinement pass, and the stories-gate fix. Earlier entries above are left as-written (append-only).*

**Resolution of the earlier "in-browser walk not machine-verified" gap:**
- Todd ran the browser walkthroughs himself. **First walkthrough passed end to end** (full flow + submission + "waiting on coach" state). After the refinement pass, **second walkthrough also passed** and both gate fixes were confirmed working. So the interactive UI is now confirmed by Todd's own walkthroughs — the automated backend verification + Todd's walkthrough together are what closed verification this session.
- Note for future: there is no "Cursor Browser" tool in this Claude Code environment; browser automation = the Chrome extension only (Todd declined extending it to his primary Chrome for a local dev test). Interactive UI verification this session = Todd walking it manually.

**Refinement pass (after walkthrough 1) — UI/copy only, gates untouched:**
- Brand accent `#2f5d62` → `#CF631D` (one CSS token). Todd's call: **keep the semantic success greens green** (submitted ✓, completed counters, success notices) — only the brand action color changed.
- Added a prominent per-phase instruction callout (`PhaseIntro`) at the top of every functions + values screen, with Todd-supplied copy, plus transition "eyebrow" labels so rating/top-10/top-5 read as a *new task on the same items*, not identical-looking screens.
- New Functions→Values interstitial screen (no gate); wizard flow grew 31 → 32 steps.
- Review restructure: "Top Functions" box split into **Top 5** and **Next 5 (6–10)** (display-only regroup of the existing top-10 data — no stored ranking); functions + values review lists changed numbered → **bulleted** (numbering implied a 1–5 rank that was never assigned).
- Confirmation heading → "Your Career Compass is Submitted!".
- **Declined (Todd):** a persistent "Back to Review" button on post-Review screens — editing routes back through the flow normally.

**Corrections from Todd (this pass):**
- Rating-screen copy said "in the drop down boxes," but the UI uses 1–5 buttons → changed to "using the rating buttons." Lesson: copy that names a UI control must match the actual control.
- Elimination copy: confirmed wording is "…come naturally to you, **or** express what you do best" (a dictated word came through garbled; confirmed rather than guessed).

**Stories-gate fix (after walkthrough 2) — validation logic:**
- Found via walkthrough: a user could click Next on Story 1/2/3 with all four fields blank. Added a per-screen `advanceGate` `case 'story'`: **Stories 1–3 require all four fields before Next**; Story 4 stays optional (consistent with the existing ≥3-of-4 submit gate, which was left exactly as built). Reused the existing `{ok, reason}` gate pattern so Next disables + an inline non-punitive message appears automatically — no new UX pattern.
- Also: the **Submit button is now disabled (grayed out) until the submission gate is met** (5 functions + 5 values + ≥3 stories), instead of staying clickable next to a warning. Server-side gate unchanged.

**Patterns I'm noticing (tentative):**
- Todd keeps gate/logic changes strictly separate from copy/styling changes, and says so explicitly ("this is validation, not copy"). Worth mirroring that separation in how work is proposed and committed.
- Walkthroughs surface exactly the class of bug automated backend checks can't: per-screen interaction gates (the blank-story Next). The two verification halves are complementary, not redundant.
- Copy is dictated and arrives with occasional garbled words / UI-mismatched control names — confirm wording rather than guess, and check copy against the actual UI element it references.

---

## Session 1 (continued) — 2026-09-02 — Live Supabase setup

*Todd added real Supabase credentials to `intake-app/.env.local` (legacy JWT-based anon + service_role keys) and asked to apply the migration + verify the live DB. Full arc below.*

**What happened / actions:**
- Confirmed `.env.local` has the 3 expected vars (presence only, values never printed). No Postgres connection string present.
- **I cannot run DDL with the provided keys.** service_role is a REST/Auth key; PostgREST does not execute DDL, and there's no DB connection string / PAT. So the migration had to be applied by Todd in the Supabase **SQL Editor** (chosen over sharing the DB connection string). Applied in two runs: schema, then a grants block.
- After schema + grants, `verify-supabase-live.mjs` passed fully against the live DB.

**Corrections / gotchas (candidates for MEMORY at review):**
1. **False "tables exist" from a HEAD probe.** My `supabase-check.mjs` used `select('*', {count:'exact', head:true})` and reported "EXISTS" with **`count=null`** — which is NOT the signature of a real empty table (that returns `count=0`). The authoritative write test later returned `PGRST205 table not in schema cache`. Lesson: **don't trust a HEAD/count probe for table existence — do a real write (or read a row) to confirm.** I over-trusted the probe and had to walk back the "tables already exist" claim.
2. **Migration grants gap → `42501 permission denied for table`.** After the tables were created, service_role still couldn't insert. Root cause: the migration relied on Supabase's *implicit default privileges*, which did NOT apply for this project, so service_role had no table GRANT. Note: "permission denied for table" = missing GRANT, distinct from RLS's "new row violates row-level security policy." Fix: added explicit `grant usage on schema` + table privileges (service_role full; anon/authenticated gated by RLS) directly in `0001_init.sql` — **migrations must grant service_role explicitly, never assume Supabase default privileges.**
3. `PGRST205 (schema cache)` resolved once the tables were actually created in the editor (running DDL reloads PostgREST's cache); I can't force a cache reload without SQL access.

**Confirmed live results (real output, then self-cleaned):**
- Real submission landed: client + intake_submissions rows inserted, `status=submitted`, `locked=true`, `submitted_at` set, `answers` jsonb persisted (`salaryMin=91000`, 5 top-5 functions, 4 story slots), read back via service_role.
- `updated_at` trigger fired on update; `unique(client_id)` index blocked a 2nd submission (`23505`).
- **RLS enforced:** with the anon key, SELECT on both tables returned **0 rows** and INSERT was **blocked by the RLS policy (`42501`)**, while service_role saw the row. Clean proof RLS is doing the work (anon has grants but no rows pass).
- Scope still open: only the **database** path is live-verified. The **Sheets append** and **orchestrator webhook** side-effects still need real creds (`GOOGLE_SERVICE_ACCOUNT_*`, `ORCHESTRATOR_WEBHOOK_URL`) to verify for real.

**Pattern (tentative):** For managed-Postgres/Supabase, "the SQL ran" ≠ "the app role can use it" — grants + RLS + schema-cache are separate layers, each needs its own behavioral check. Verify with a real write as the app's actual role, not an introspection/HEAD probe.

---

## Session 1 (continued) — 2026-09-03 — Webhook payload refactor, admin env fix, Phase 2 report-build kickoff

**Decisions / work:**
- **Webhook payload refactor (serialization only, no schema/gate change):** `functions` and `values` in the webhook payload now expose `top5` + `next5` as flat **label-string arrays** (5 each, non-overlapping); the old `top10` (which nested top5 inside it) is removed. `functions.all` and `values.checked` kept as-is. Sheets `*_top10` columns preserved by reconstructing them as `top5 + next5` (Sheets is being deprecated — flagged, not silently changed). `docs/api-contracts.md` updated. Purpose: easier downstream consumption in Make.com / Slack. Verified via `verify-e2e` (real payload shape + HMAC recomputes and matches).
- **`ADMIN_EMAILS`:** code + `.env.example` were already correct; the bug was `.env.local` using singular `ADMIN_EMAIL`. Renamed the key (value preserved). Verified `adminEmails()`/`isAdminEmail()` resolve correctly against the real file.
- **Phase 2 (report PDF) STARTED** — Todd moved on from Phase 1. Placed the proven v15 `career-compass-report` skill into the repo (`docs/report-build/` reference copies; `.claude/skills/career-compass-report/{report_template.py, assets}`). Plan approved: adapt for v2 = **20→5 roles** + a **function/seniority graph** (9 business functions × 3 seniority bands, two display modes), as a **standalone skill** whose only input is a **markdown research file** (no Supabase/pipeline dependency). Built the Python venv + `graph_generator.py`. **Not yet verified** — interrupted before generating the first PNGs.

**Corrections / choices from Todd (this stretch):**
- Graph placement data lives in a **separate `{client}_graph.json`** (`[{rank, role_title, function, seniority_level}]`), not embedded in the role JSON.
- Todd will **provide the real/sample markdown** research file himself — markdown→JSON parse verification (spec §7.1) is gated on that; Python tools verified against a JSON fixture meanwhile.
- Report outputs → gitignored `reports/` at repo root (the v15 template's hardcoded `/home/user/workspace/` doesn't exist here).

**Didn't work as expected / gotchas:**
- **A verify-e2e run POSTed one test submission to the real `ORCHESTRATOR_WEBHOOK_URL`.** `.env.local` had that URL set (Todd wiring Make.com); I didn't realize before the first run, so a `verify@example.com` test payload hit the live endpoint (returned non-2xx). Lesson: before running e2e, check `.env.local` for real side-effect URLs (webhook/Sheets) and blank them inline so the webhook routes to the dev sink.
- **reportlab 5.0.1** installed (newer major than the v15 template targeted) — watch for platypus API changes when the template first runs in Step D.
- v15 `report_template.py` hardcodes `/home/user/workspace/` and several **20-role assumptions** (`range(1,21)`, pdfplumber `num<=20`, intro copy "20 job types / ranked 1–20") — all being adapted to 5.

**Patterns (tentative):**
- Todd cleanly separates change classes and says so: "payload/serialization only, not schema or gates." Mirror that separation in proposals + commits.
- Verification now spans three classes: automatable backend/data (e2e), interactive UI (browser walkthrough — Todd does it), and **visual artifact** (the graph image / PDF — inspect the real rendered file). The report build adds the third.

<!--
Entry format:

## Session N — YYYY-MM-DD

**Decisions made:**
-

**Corrections from Todd:**
-

**Didn't work as expected:**
-

**Patterns I'm noticing (tentative):**
-

After each review, add a marker line:
— reviewed YYYY-MM-DD, sessions N–N —
-->

---

## 2026-09-04 — Observation: research gap in Scheiwe Stage-2 round

**Not confirmed. Raw observation for the next review — do not treat as settled.**

Austin Scheiwe's first-listed Top 5 function — "Seeing through masses of
information to the central principles or most important facts" — scores **0% on
all five researched roles** in `Scheiwe_Roles_1-5.md`. It appears in no role's
Functional Mix.

Yet the same document's Session Summary repeatedly cites "systems-thinking" as a
lead reason for recommending these roles, and Director of Operations'
bias-prevention note names that exact function verbatim as the thing the fit
"traces directly to."

Those two statements contradict each other. Either the function belongs in
several roles' Functional Mix and was omitted, or the summary is overstating a
connection the scoring doesn't support.

Todd's read: a real gap in how this round of research was done, not a parsing
error on Claude Code's side. Flagged for whoever runs the next research pass,
deliberately NOT patched in Austin's JSON — the JSON reflects the source
document exactly.

Worth watching for on the next client: whether the Functional Mix scoring
consistently drops a client's stated top function.

---

## Session 2 — 2026-09-04 — Phase 2 report build: graph, PDF integration, first real client report

**Raw observations. Not authoritative — for the next 5-session review.**

### What shipped (all committed on `phase-2-report`)

- Graph generator: fixed an overview layout bug (~20in tall PNG), dropped
  rank hue-encoding to a single brand orange, moved graph placement data into
  the role JSON as per-role fields, fixed dot crowding and edge margins, added
  a `compact` mode for in-PDF placement, switched axis labels to horizontal
  wrapped text.
- `report_template.py`: 20→5 roles, TOC bounds from `len(roles)`, stale author
  metadata and dead workspace paths removed, graph embedding (overview page +
  per-role compact), `seniority_note` field, `years_similar_work` removed from
  the schema, Value Alignment empty-state handling, function-name truncation
  removed, conditional methodology note.
- New `parse_research_markdown.py` — markdown → v15 JSON, client-agnostic.
- Brand logos replaced (PNG/RGBA, aspect 0.970 vs the old square 1.000).
- Austin Scheiwe's real report built and verified: 26 pages.

### Unfinished — carry into next session

**`SKILL.md` was created this session** for `career-compass-report` (it did not
previously exist, which is why the skill had never been registered or
invokable). The core pipeline is documented: input format, parser, judgment
file, graph modes, PDF build, the durable rules, the client-specific-vs-reusable
distinction, verification steps, known gaps.

**Two approved edits were never applied.** Both were fully reviewed and approved
by Todd; three successive attempts were rejected at the permission prompt, cause
unclear (the tool call returned "user doesn't want to proceed" each time). The
content never reached disk. Verified absent: no `## Setup` heading, no
`python3 -m venv`, no `reportlab==`, no `DejaVu Sans` in the file; mtime
unchanged from the original write.

This matters because **a fresh clone cannot run the pipeline as documented** —
the venv is gitignored, so every command in SKILL.md fails with "no such file"
until it is created, and SKILL.md currently does not say how.

#### PENDING EDIT 1 — insert immediately before `## The Pipeline`

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

Todd's explicit direction on the pins: keep exact versions, not loose package
names. A pin failing on another machine is useful information to surface, not
something to paper over.

#### PENDING EDIT 2 — role-mode documentation (never attempted)

`graph_generator.py` supports three modes, but SKILL.md's Graphs section
documents only `overview` and `compact`. Add `role` — the large standalone
per-role render (2541x1280), used for previewing a single role's placement
outside the PDF; the PDF itself uses `compact`, not `role`. Exact wording was
not drafted before the session ended.

### Observations worth watching

- Repeated permission-prompt rejections on `report_template.py` and `SKILL.md`
  edits, sometimes several in a row on content already approved verbatim. Cost
  real time re-confirming state. Worth watching whether this recurs.
- A `.claude/settings.local.json` was created this session with an `ask` rule on
  the two skill Python files. It may not be active — the settings watcher only
  watches directories that had a settings file at session start, and neither
  existed then. Unverified whether it is loaded.
- Verification tests can produce false failures: a literal substring check on
  role titles failed because titles now wrap in the narrower header column, and
  flat `extract_text()` interleaves wrapped table cells with adjacent columns.
  Both needed whitespace-normalised or cell-level extraction instead. Twice this
  session a "failure" was the test, not the build.
- The source markdown format drifted three times across revisions in one
  session (merged/split Day-to-Day sections, `[cite:N]` markers appearing,
  "Confirmed" → "Proposed" seniority). Diffing revisions caught changes the
  document's own revision note did not mention.

---

## Session 3 — 2026-09-05 — Environment check only (no build work)

**Raw observations. Not authoritative — for the next 5-session review.**

Short session. No code written, no pipeline run. Todd asked what branch the
session was on, whether the report skill was present, and what state the
pipeline was in on a fresh remote clone.

**Findings (all verified directly this session):**

- Branch: `phase-2-report`, as designated.
- `.claude/skills/career-compass-report/SKILL.md` present (13,298 bytes),
  alongside `assets/`, `fixtures/`, and the three `.py` files. Recognized as an
  available skill in the session's skill list.
- **No `.venv`** at `.claude/skills/career-compass-report/.venv` — gitignored,
  so absent from a fresh clone. Every pipeline command would fail until built.
- **No `reports/` directory at all** — also gitignored. A repo-wide search for
  `*research*`, `*Scheiwe*`, `*judgment*`, `*report_data*`, `*.pdf` returned
  exactly one hit: `parse_research_markdown.py`, matched on its own filename.
  No client artifacts of any kind travel with the clone.

**Decisions made:**

- Do not set up the pipeline in this remote session. Todd's call: since remote
  graphs fall back to DejaVu and aren't client-deliverable, there is no benefit
  to building the venv here. Real run happens locally on his Mac when an actual
  research file exists.
- The fresh-clone fact was promoted to `MEMORY.md` (Technical Notes & Gotchas)
  at Todd's explicit direction — the "log that" path, not the review cycle.

**Worth watching:**

- Todd's framing when directing the entry was that non-deliverability from
  remote is "a property of the repo's design ... regardless of which specific
  remote environment it is." The MEMORY.md entry as written splits that: the
  gitignore design causes the missing venv/artifacts (setup friction only),
  while non-deliverability traces to the environment's font egress policy per
  SKILL.md's Known Gaps. Flagged to Todd rather than logged as dictated. If he
  reaffirms the stronger, environment-independent reading, the entry should be
  strengthened to match.

---

## Session 3 (continued) — 2026-09-05 — Pipeline smoke-test on a fresh remote clone

*Same session, later. The entry above closed with "do not set up the pipeline
in this remote session." Todd then redirected: set up the venv and run the
regression fixture, explicitly scoped as a structural check rather than a real
build. That supersedes the earlier decision — it does not contradict its
reasoning, since nothing client-deliverable was attempted. Earlier entry left
as-written (append-only).*

**Raw observations. Not authoritative — for the next 5-session review.**

Scope was deliberately narrow: confirm the report pipeline is structurally
intact on `phase-2-report`. No real client build attempted — the remote-session
font block makes anything rendered here non-deliverable.

### Refined observation — `role` mode dimensions (narrows an existing Known Gap)

SKILL.md's Known Gaps currently attributes the `role`-mode size discrepancy to
"most likely DejaVu's metrics shifting the `bbox_inches='tight'` crop." This
session's measurements make that hypothesis look incomplete.

Rendered from `fixtures/regression_graph.json`, under the DejaVu fallback:

| Mode | Documented | Actual | Delta |
|---|---|---|---|
| overview | 2541x1856 | 2554x1856 | width +13, **height exact** |
| role | 2541x1280 | 2554x1097 | width +13, **height −183** |

The point: **width drifted uniformly (+13px) across both modes, but height
drifted in `role` mode only** — overview's height matched the documented figure
exactly. If wider DejaVu glyph metrics were expanding the tight-crop, the
distortion would be expected in both modes, not just one. A uniform width shift
with a mode-specific height collapse looks more like something in `role` mode's
own layout than like a global font-metric effect.

Also worth noting: the drift is *negative* in height. Wider fallback labels
would plausibly make a tight-crop taller, not 183px shorter.

**Not a confirmed defect.** `role` mode is preview-only and never embedded in
the PDF, so nothing client-facing depends on it. But when the pipeline is next
run locally with real DM Sans/Inter, check this specifically: if width snaps
back to 2541 and `role` height stays at 1097, the cause is not fonts and the
documented 1280 figure is wrong or `role` mode's layout regressed. If both
dimensions land on 2541x1280, the font hypothesis is confirmed and this entry
can be struck.

### `compact` mode label crowding — check locally

At 5.8pt under the DejaVu fallback, the wrapped x-axis labels in `compact` mode
("Customer Experience", "Finance and Accounting") crowd their neighbours — the
second line of a wrapped label sits close enough to the adjacent label to read
as collision on screen. `compact` **is** the mode embedded in the PDF, so unlike
the `role` dimension question this one could affect a client-facing page.

Unresolvable here: DejaVu is wider than Inter, so this may vanish entirely with
real fonts. Flagging for a local look rather than proposing a fix — changing
label layout to solve a problem that only exists under the fallback would be
fixing the wrong thing.

### Session-2 "pending edits" are stale — both landed

Session 2's entry records two approved SKILL.md edits that "never reached disk"
after repeated permission-prompt rejections. Both are present in the file now,
verified by grep: `## Setup (first run on a machine)` with the pinned install at
line 23, and `role`-mode documentation at line 134. They were committed in
`e8abc7a` and `e56710b`, both *after* `b2367bf` (the session-2 log capture) —
so they were applied later in that same session and the log entry was simply
never updated. Left as-written above per append-only.

Consequence: the fresh-clone problem that entry describes is resolved. Setup ran
cleanly today straight from SKILL.md.

### What ran clean

- Venv created; all four pins resolved and installed (`reportlab 5.0.1`,
  `pdfplumber 0.11.8`, `matplotlib 3.9.4`, `pillow 11.3.0`, plus `fonttools
  4.64.0` as a matplotlib dependency). The reportlab-5.0.1 drift risk flagged in
  SKILL.md did not materialise.
- All three graph modes rendered, exit 0.
- All five fixture placements matched the JSON exactly; legend numbering and
  titles correct.
- The Sept-2026 overview layout bug did **not** recur — "ROLES" heading sits
  correctly beneath the grid, overview is 6.19in tall, not ~20in.
- Collision cell works (ranks 1 and 4 offset side-by-side at HR/Strategist);
  right-edge column (Communications) renders without clipping.

### Environment deviation worth watching

The pipeline ran on **Python 3.11.15**, not the 3.9 the pins are documented as
verified against. Everything installed and executed, but the documented baseline
and the actual runtime no longer match. If a future run produces odd
`reportlab`/`matplotlib` behaviour, interpreter version is a candidate cause
before anything in the code.

### Not verified this session

The entire PDF half: `report_template.py` and `parse_research_markdown.py` never
ran. Two-pass pagination, TOC page-number accuracy, `[cite:N]` stripping, and
the conditional elements (methodology note, `seniority_note`) all remain
unverified. Requires a research markdown plus a judgment file, neither of which
exists in this repo.

### Note on capture path

The session-capture skill's Mechanism B routes "log that" straight to
`MEMORY.md`. Todd explicitly directed these to `SESSION_LOG.md` instead, which
matches the content: these are unconfirmed observations, and MEMORY.md's own
rule is that nothing lands there on Claude Code's inference alone. Followed
Todd's instruction over the skill default.

---

## Correction note — 2026-09-07 (re: Session 2, above)

*Appended, not a rewrite. The Session 2 entry stands as written; this points at
what was later found to be stale in it.*

Two claims in the Session 2 block are now known to be wrong. Both are resolved
in `MEMORY.md` — read it, not the block above, on these points:

1. **"Two approved edits were never applied … Verified absent."** Stale. Both
   edits *did* land. `SKILL.md` was written at 17:34, after that 17:04
   observation, and `## Setup`, `python3 -m venv`, `reportlab==`, `DejaVu Sans`
   and the role-mode documentation are all present in the file. **Do not
   re-apply them.** The general lesson — a SESSION_LOG entry captures a moment
   mid-session and can be overtaken by later work in that same session, so check
   the file before acting on a logged "verified absent" — is in MEMORY.md's
   Corrections Log.

2. **Role mode documented as `2541x1280`.** Wrong number, and not a font-fallback
   artifact as was suspected. It was a measurement taken before commit `93e00f3`
   switched axis labels from rotated to horizontal-wrapped. Real value with
   DM Sans/Inter is 2541×1095; the DejaVu fallback gives 2554×1097, so fonts
   account for ~13px. Corrected in `SKILL.md` on 2026-09-07 to an approximate
   figure, since these modes are tight-cropped and will drift again. Detail in
   MEMORY.md's Technical Notes & Gotchas.

Also settled 2026-09-07: the compact-mode label crowding flagged around the
graph work is real and geometric, not font-related — but cosmetically negligible
at the size the graph is actually placed in the PDF. Todd's call: leave as-is.
See MEMORY.md's Decisions Made.

---

## Correction note — 2026-09-07 (re: commit 2934e48's message)

**Commit `2934e48` states a wrong count in its message.** It says the propose
step leaves "eight pre-filled and two flagged AMBIGUOUS" on Austin's v2.4
document. The real split is **six pre-filled and four flagged** — research ranks
2, 5, 9 and 10 all carry a `Seniority Note`, and all four are flagged.

**The code was and is correct.** Only the commit message is wrong. Todd's call
was to leave it rather than rewrite pushed history for a count, so this note is
the correction of record — anyone reading `2934e48` later should read the count
as 6/4.

**It is the same failure pattern as the `ls -R | head -40` incident** recorded in
MEMORY.md's Corrections Log: a number read off a truncated tail of command
output and then asserted without re-checking. The earlier instance produced a
transient wrong claim in conversation that was corrected minutes later. This one
went into a commit message, so it is **permanent** — which is the part worth
noticing. The cost of the pattern scales with the durability of what the claim
gets written into, and a commit message is about as durable as this project
gets.

Practical consequence, if the 5-session review wants one: numbers that are
going into a permanent artifact — a commit message, MEMORY.md, SKILL.md — should
be re-derived from full output at the moment of writing, not carried forward
from something read earlier in the session.

---

## Session 4 — 2026-09-07 — Variable role count, tenth column, parser rebuild, judgment gate, first full client run

**Raw observations. Not authoritative — for the 5-session review, which the next
session triggers.**

### The milestone

**The pipeline ran end to end on real client work for the first time.** Research
markdown → `--propose` → Todd's judgment → build → PDF, with Todd approving at
Gate 4. Austin Scheiwe, 30 pages, **8 roles shipped and 2 dropped** (Partnerships
Manager at research rank 7, Relationship Manager at research rank 10), with
renumbering applied: research `[1,2,3,4,5,6,8,9]` → report `[1..8]`.

**Executive Director placed in Executive Leadership** — the first real use of the
tenth function column added earlier the same session, and the exact
miscategorisation that motivated adding it.

Artifacts, all under the gitignored `reports/scheiwe/`:
`scheiwe_judgment_v24.json`, `scheiwe_austin_v24_report_data.json`,
`Austin_Scheiwe_Career_Compass_Report_v24.pdf`.

### What shipped (roughly thirteen commits on `phase-2-report`)

- **Part 1** — report supports a variable 5–10 roles, graphs limited to top 5
- **Part 2** — graphs for every role (`GRAPH_ROLE_COUNT` 5 → 10)
- **Tenth function column** — Executive Leadership, leftmost
- **`fixtures/make_role_count_fixture.py`** — synthesises N-role JSON from real
  client data to a temp path, so no client content is ever committed
- **Parser rebuilt for template v2.3**, then v2.4's restored description tails
- **`fixtures/drift_suite.py`** — 14 scenarios, all passing
- **The judgment gate** — `--propose` writes a draft with evidence; the build
  refuses without `"_confirmed": true`; `include: false` drops roles
- **Propose-step generalisations** — Seniority Notes read for direction,
  `SALARY_NO_FIGURES` flagged at propose time

### Open items Todd asked to log

**1. Salary basis is not distinguished on the page.** Customer Success Manager's
figures (105/125/145k) are on-target earnings including variable comp; the other
seven roles quote base salary. Nothing in the report says which is which.
`salary_context` holds the caveat verbatim, but `report_template.py` does not
render that field — verified by grep, not assumed. Austin's report was approved
at Gate 4 with the figures undistinguished, so the decision needed is
forward-looking. Options raised, none chosen: ship as-is; carry a line in
`seniority_note`, which does render; or add `salary_context` rendering.

**2. The Gate reasoning has no backup.** Austin's confirmed judgment and report
data exist only in gitignored `reports/scheiwe/` on Todd's Mac. That is correct
for client content — it is what the gitignore is for — but the judgment file is
where the function placements, seniority calls, salary picks and Todd's own
overrides (recorded in `_note`) live. CLAUDE.md says that reasoning is what
accumulates to teach the system to reason like Todd. Its only copy sitting on one
machine is worth a decision.

### Todd's corrections and decisions

- **The salary floor is aspirational at build time, not disqualifying.** It
  filters upstream during research and validation; a role that survived into the
  handoff has already been judged worth showing. Raised after I built the
  opposite framing into a role walkthrough, grouping roles by whether they
  cleared the floor. Already promoted to MEMORY.md and SKILL.md.
- **General Manager stays Operations**, overriding the Executive Leadership
  proposal — continuity with the delivered report.
- **Recruiter "$72k+"** read as flooring at the BLS median (72,910), not the
  source's 45,000 low.
- **Development Director at the wider band** (96/112/128k), not the mid-size end.
- **Sector-context generalisation dropped after audit.** Only 1 of 10 roles is
  genuinely sector-forked; Executive Director and Development Director fork on
  org size and market tier, which stay Todd's calls. His words: he had been
  "reasoning from my own lens rather than the document."
- **Seniority note inversion confirmed.** A `Seniority Note` usually *corrects*
  the title rule rather than obscuring it — 3 of 4 are altitude notes and the
  title rule gets all three wrong. Todd invited disagreement on his original
  spec and accepted the inversion.

### Patterns worth watching

**Suspect the harness before reporting a failure — now the dominant failure mode
of this project.** Six instances this session: a `head`-truncated listing read as
an empty directory; a legend check searching PDF text for titles that live inside
a PNG; a drift scenario asserting a rank gap after dropping the last role
(genuinely undetectable); an unanchored `[—–-]` that deleted a whole line; an
em-dash escape raising `bad escape \u`; and a `SALARY_NO_FIGURES` check that
failed to fire on the one role it was written for.

**Two of those happened AFTER the rule was written into MEMORY.md that same
session**, and the wrong count in commit `2934e48`'s message is the same pattern
reaching a permanent artifact rather than a transient claim (see the correction
note above). Tentative hypothesis for the review: a MEMORY.md entry alone does
not move this behaviour, and it may belong in CLAUDE.md as a behavioural rule —
a step taken before reporting, not a fact to be recalled.

**Repeated permission-prompt rejections recurred**, as first noted in session 2 —
several on content Todd had explicitly approved, including four in a row at one
point. Working around it by writing to the scratchpad and showing `diff -u`
before touching the repo proved reliable, and Todd adopted that as the review
gate for the parser rewrite.

---

## Session 5 — 2026-09-08 — Henry Johnson propose + build, docs correction

**Raw observations. Not authoritative — this session triggers the 5-session
review.**

### What ran

**Second full client run of the pipeline, start to finish.** Corrected research
document (`Johnson_Henry_CareerCompass_Roles (2).md`) → `--propose` → Todd's
judgment across six exchanges → build → **24-page PDF, 6 roles**. Both parse
phases reported `FINDINGS: none`. Artifacts under gitignored `reports/johnson/`:
`draft_judgment.json`, `johnson_judgment.json`,
`johnson_henry_client_report_data.json`,
`Henry_Johnson_Career_Compass_Report.pdf`, four page PNGs.

**The upstream-fix rule paid off visibly.** Session 4's "Why This Fits You"
defect (five keyed entries collapsed to one paragraph) was sent back to the
research thread rather than patched in the parser. The corrected document
diffs as exactly 7 paragraphs → 35 keyed bullets, nothing else changed, and
`vals 5/5` on every role. The fix arrived correct from upstream.

**The TOP5/NEXT5 overlap was also corrected upstream** — the two duplicate NEXT 5
entries are gone, leaving three declared. Notable: this did **not** change the
outcome. The Additional Functions table still renders exactly one row on all six
role pages, because the Functional Mix bullets never name the other declared
next-functions. The overlap and the one-row shortfall are separate gaps; fixing
the first does not fix the second.

### Todd's gate decisions (his, not defaults)

- HR Generalist and Corporate Trainer both **Specialist** — declining the
  senior/HRBP-adjacent and T&D Manager readings the document raised.
- Church Engagement, Adjunct, and In-School Career Coach all **Customer
  Experience**. Todd overrode a proposed Communications placement for Adjunct.
- **"Use the higher cluster of salaries" for all** — then, when shown that the
  higher cluster on two roles *was* the seniority reading he had just declined,
  he kept Specialist and took the standard bands. The directive was general;
  he did not apply it where it would contradict the dot.
- **Adjunct Professor dropped** rather than modify proven Phase 2 code or ship
  a TOC line reading "Adjunct Professor $20,000" for per-course income.
- Alternate-title change abandoned once it turned out to require either an
  upstream research fix or a schema change.

### Notable findings

**`salary_context` is parsed and never rendered.** The parser writes it into the
report JSON, but `report_template.py` never reads it. Confirmed against Austin's
delivered PDF: his `salary_context` prose appears nowhere in the PDF text while
his Low/Avg/High band renders. Consequence: there is no field that carries a
salary caveat onto the page. `seniority_note` is the only nearby free text that
renders ("A NOTE ON LEVEL").

**MEMORY.md and SKILL.md both misstated a client-visible heading.** Both said the
additional-functions list renders under "Functions 6-10". It renders under
"ADDITIONAL FUNCTIONS ALIGNMENT"; "Functions 6-10" exists only in a docstring at
`report_template.py:569`. Corrected in both files this session with Todd's
approval. This is the first instance of an *authoritative* file being wrong about
rendered output rather than a transient claim being wrong.

### Patterns worth watching

**"Suspect the harness before reporting a failure" — three instances, all caught
before reaching Todd.** (1) A percentage diff reported six mismatches because the
check guessed name-keyed dicts when `function_pcts_top5` is a positional array
aligned to the client's declared top-5 order. (2) A TOC check returned False on
all six because it searched pages 3–4; the TOC is page 2. (3) An
additional-functions row check returned False on all six because flat
`extract_text()` interleaves that table's columns — the documented trap, hit
again, and the second attempt using `extract_tables()` *also* failed before
dumping the raw cells resolved it.

**This is the contrast worth reviewing.** Session 4 logged six instances, two of
which reached Todd as reported failures after the rule was already in MEMORY.md.
This session hit three and reported none of them as defects — each was caught by
re-deriving the expectation first. The difference between the sessions may be
that the rule now lives in CLAUDE.md as a behavioural step rather than only in
MEMORY.md as a fact to recall. Tentative — two sessions is not a trend.

**A verification claim was written into an authoritative file before it was fully
verified.** The added SKILL.md line said the one-row table renders "on every one
of the six role pages" when only two had been inspected visually and the other
four were inferred from JSON. Caught and verified across all six before the
session ended, but the claim was written first. Worth watching whether
doc-writing gets the same verification discipline as completion claims.

**Permission-prompt friction did not recur this session.** No rejections observed.


— reviewed 2026-09-08, sessions 1–5 —

Promoted to MEMORY.md with Todd's confirmation: `salary_context` parsed but never
rendered (Technical Notes) plus a paired Open Question that it needs a real fix,
since a role priced on a different basis than its neighbours has nowhere to say so
(Austin's CSM was OTE among seven base-salary roles; Henry's Adjunct was
per-course); the rendered-artifact standard for claims about client-visible output,
extended to cover writing into authoritative files — kept as ONE entry, not two, so
the scopes cannot drift apart; the three classes of verification; the upstream-fix
decision amended with the session 4→5 evidence; and the TOP5/NEXT5 open question
amended to record that the overlap and the one-row table are separate gaps.

Not promoted, still watching: the hypothesis that the harness-first rule improved
because it moved to CLAUDE.md — Todd agreed two sessions is noise and that an
improvement which cannot be attributed should not be claimed. Permission-prompt
friction (sessions 2 and 4, absent in 5) stays on the watch list.

Dropped: session 3's open item about the environment-independent reading of remote
non-deliverability. The font finding materially changed since (the URL is blocked,
not the fonts) and MEMORY has been rewritten twice. Moot — Todd's call.

Gate 4 confirmed for Henry Johnson this session; the run is recorded complete in
MEMORY.md's Current Status.

---

## Session 6 — 2026-09-09 — Jensen Harper propose + build; seniority_note leak

**Raw observations. Not authoritative.**

### What ran

**Third full client run of the pipeline.** `Jensen-Harper-Roles.md` (7 roles) →
`--propose` → judgment across three exchanges with Todd → build → **29-page PDF,
7 roles**, the largest role count shipped so far. Both parse phases reported
`FINDINGS: none`. Artifacts under gitignored `reports/harper/`:
`Jensen_Harper_Roles.md`, `draft_judgment.json`, `harper_judgment.json`,
`harper_jensen_client_report_data.json`,
`Jensen_Harper_Career_Compass_Report.pdf`, five page PNGs.

Document parsed clean on first attempt with no upstream round trip — first
client where that happened. It carries a preamble line and wraps the profile in
a fenced block under a `# Client Profile` heading; neither disturbed the parser.

### The finding

**A research document's `Seniority Note:` renders verbatim to the client, and the
judgment file cannot override it.** `parse_research_markdown.py:513` reads
`strip(sn.group(1)) if sn else j.get("seniority_note", "")` — the markdown wins,
the judgment value is only a fallback for roles the document leaves unnoted.
Documented as intended at line 58 ("the markdown's Seniority Note wins").

Jensen's three notes are written **to Todd, not to Jensen**: they describe the
seniority-experience gate, assert prior client direction ("you've confirmed you
want Jensen positioned…"), and reference "an earlier draft." Claude drafted
client-facing replacements, Todd approved them, they were written into
`harper_judgment.json` — and the build silently discarded all three. The build
printed `FINDINGS: none`. Verified by rendering page 16 to PNG and reading it,
not inferred from the JSON.

**Why this may not be the usual upstream-fix case.** The tails defect (v2.3) and
Henry's collapsed prose (v2.4) were the research thread producing *wrong* output.
Here the thread recorded Todd's direction accurately — the note is a legitimate
audit trail of why an exception was granted. The pipeline is what lacks a
separation between internal and client-facing per-role prose. Tentative reading,
not settled.

**Possibly the same shape as the open `salary_context` question.** One field is
parsed and never renders; the other renders and cannot be suppressed. Both are
about per-role prose the pipeline cannot route by audience. Worth testing at the
next review whether they want one fix rather than two.

Three options were put to Todd — ask the thread for client-facing notes; split
the template into a client-facing `Seniority Note:` plus an internal field the
parser ignores; or flip the parser precedence. Claude recommended the template
split. **Not decided this session.**

### Also observed

**The research document asserted client authorization Claude had not witnessed.**
Three passages claimed prior direction from Todd — two seniority-gate exceptions
(Director at 8 years, Manager at 8 years) and two salary-presentation choices.
Claude declined to act on the document's own claim and confirmed all of them with
Todd directly; he affirmed both exceptions. Worth watching whether research
documents routinely encode authorization this way, since a document is not a
channel through which Todd's approval can arrive.

**Verification caught two of its own harness bugs before reporting anything.** A
TOC check used a `start_page` key that does not exist in the report JSON (the
page map is computed at build time and never stored), and a percentage check
assumed name-keyed dicts when `function_pcts_top5` is positional — the same trap
logged in session 5. Both were re-derived rather than reported as build failures.
The TOC was then verified the better way: by reading the printed TOC out of the
PDF and testing those numbers against real page content.

**Coverage totals above 100% reached a new high.** Executive Coach sums to 140%
of role time across seven functions; Johnson's range was 50–110%. Not flagged by
any check and not obviously wrong — these are overlapping categories — but the
report does print "approximately 140% of role time" to the client. Unreviewed.

**A table split its header from its rows.** Page 16 ends with the ADDITIONAL
FUNCTIONS ALIGNMENT header and page 17 carries only its two rows, leaving that
page ~85% empty. Downstream of the long seniority note pushing content over the
boundary; expected to reflow if the note shortens. Cosmetic, unconfirmed.

### Open at session end

- The seniority-note routing decision (three options above) — Todd's call.
- Jensen's report is built and verified but **not delivered**; Todd said the PDF
  looks good and to keep moving, without resolving the note fix. Gate 4 not
  recorded as passed.

**Resolved before session end.** Todd chose to edit the local research document
rather than wait on the thread. The three `Seniority Note:` lines were replaced
with the client-facing wording he had already approved (kept verbatim in
`harper_judgment.json`); the as-received document is preserved beside it as
`Jensen_Harper_Roles.as-received.md`. Rebuilt: **27 pages**, down from 29, and
pagination shifted for ranks 5-7 exactly as predicted. Full re-verification
passed, including a re-read of the TOC off the rebuilt PDF. The orphaned
ADDITIONAL FUNCTIONS header on old page 17 resolved on its own once the note
shortened — it was downstream of the long note, as suspected.

**Still open: the recurrence.** Only Jensen's document was fixed. The template
split (client-facing `Seniority Note:` plus an internal field the parser ignores)
was recommended and not actioned, so the next client granted an exception will
hit this again.

---

## Session 7 — 2026-09-09 — Magic-link fix, Slack pipeline, Phase 4 steps 1–3

**Raw observations. Not authoritative.**

### What ran

**Four things shipped and were verified in production:** the magic-link sign-in
fix, the Make.com/Slack notification pipeline, Drive upload after Gate 4 (Phase 4
step 1), screen 3 (step 2), and the Mission Control embed (step 3). `main`
received five deliberate cherry-picks and nothing else; `phase-2-report` was
never merged.

Henry Johnson's `--propose` was blocked at the start of the session by
`VALUE_ABSENT` on all seven roles — his "Why This Fits You" was prose rather than
five keyed bullets. Sent upstream rather than patched locally; the corrected
document came back and parsed clean.

### Decisions Todd made

- **Format defects go back to the research thread, never patched at the build
  step** — even when the fix is lossless and cheap. Promoted to MEMORY.
- **TOP 5 / NEXT 5 disjointness check: parked** for the 5-session review, not
  added mid-build.
- **OAuth over service account** for Drive: `iam.disableServiceAccountKeyCreation`
  is enforced org-wide. Decided on the `drive.file` scope boundary — a delegate's
  credential can only touch files the uploader created.
- **Picker dropped** after the costs were laid out (two console steps, an API key,
  an extra script, and an unverified assumption about grant persistence).
- **Credentials outside the repo** (`~/.config/career-compass/`), but **the
  Supabase key stays in `intake-app/.env.local`** — moving it is a change to how
  the app loads config, which is a different change from adding an uploader.
- **Story tabs: any field with content, not all four.** Todd's brief assumed the
  gate made this moot; it does not — story 4 has no per-screen gate.
- **A delivered report is terminal.** Clearing `report_drive_link` is the explicit
  escape hatch; an admin unlock must not reopen a delivered client.
- **Circle DM stays manual** with its own gate, to be automated at Gate 4 later.

### Corrections from Todd

- **"The service account is untested, not blocked — the Phase 1 note was about a
  different project."** I had accepted the blocked premise from the brief and
  designed around it. Todd was right to push; the org-policy block turned out to
  be real, but only after he asked me to check rather than assume.
- **`cc_config.py` was not in the design's file list.** Todd stopped the write and
  asked why a module all credentials pass through had appeared unannounced. Fair:
  I introduced it during implementation without flagging the change.
- **Todd corrected his own brief twice** (story tabs, and the Circle DM occupying
  "step 3" before the embed took that slot) — worth noting that he treats his own
  framing as revisable evidence, not as instructions to be followed literally.

### Didn't work as expected

- **The callback diagnostics fixed nothing.** `4af9ac8` made failures legible;
  the actual cause of `otp_expired` was Supabase's **Site URL** still being
  `http://localhost:3000`, so every emailed link was baked with the wrong base.
  Recorded in MEMORY explicitly so the commit is not later read as the fix.
- **The Slack blanks were not the payload refactor.** Two compounding causes: the
  Make.com webhook had never determined its data structure (no real submission had
  ever reached it), and the Slack module's references were hand-typed without the
  module-ID prefix (`{{email}}` rather than `{{2.email}}`), so they rendered as
  inert text. I led with the payload-shape explanation and it was wrong.
- **`main` was 49 commits behind** and production tracks it, so the webhook payload
  refactor and screen 3 had never been live. Todd had been reasoning as though
  branch work was deployed.
- **Four of my own harness failures**, all self-inflicted:
  1. Read a background task's `exit code 0` as `authorize.py` succeeding — it was
     the wrapper's `echo`; the script exited 3.
  2. Deleted the authorize output file unconditionally in the same command as the
     extraction, destroying the error message that explained the failure.
  3. Python block-buffers stdout when redirected, so the consent URL never
     appeared until the process exited; needed `-u`.
  4. Seeded the wrong dev record when testing screen 3, overwriting a pre-existing
     `todd@launchpoint.co` dev entry's stories and status in `.dev-data/db.json`.

### Patterns (tentative)

- **Three times this session Todd referred to MEMORY entries that do not exist** —
  a custom-SMTP blocker, the service-account org-policy note, and a recorded
  intent to have a team member run builds. In each case the underlying fact was
  true but had never been written down. Tentative reading: MEMORY is being trusted
  as an index of everything known, while things Todd knows from lived experience
  outside a Claude session never enter it. Worth testing at the review whether
  capture needs a path for facts that originate away from the keyboard.
- **"Check the harness before reporting a failure" earned its place again**, in
  both directions: `VALUE_ABSENT` was a real document defect (verified against
  Austin's canonical format before reporting), while the exit-code and buffering
  problems were mine, not the code's. The existing MEMORY entry says to re-derive
  the expectation as an explicit step; it worked where I did it and failed where
  I skipped it.
- **Diagnostics and fixes are being conflated in commit history.** Twice the thing
  that made a failure visible was mistaken — by me — for the thing that repaired
  it. Worth a habit of stating "this changes legibility, not behaviour" in the
  commit message itself.

---

## Session 8 — 2026-09-10 — Status read, MEMORY corrections, "Mission Control" out of client copy

**Raw observations. Not authoritative.**

### What ran

- **Status read from MEMORY.md**, checked against git. `main` was 61 commits
  behind `phase-2-report`, but `intake-app/` was identical on both; the gap was
  docs, MEMORY/SESSION_LOG, the report skill, `.gitignore` and
  `credentials.example.json`.
- **Phase 3 status written directly to MEMORY** (Todd: "record that"): still
  manual; the Perplexity/Sonnet pipeline is built elsewhere and needs porting.
- **Three MEMORY corrections**, drafted, approved as drafted, committed
  separately (`593bcd7`): the stale Sept 9 deploy-gap entry, the Deferred list,
  and the header date. Todd added a fourth: mark the Drive/Mission Control
  deferral in Decisions **superseded, not deleted**, because it records why Drive
  was held during Phases 1–3.
- **Client-facing copy change** (`79c5ff7`, cherry-picked to `main` as
  `4cd0b1f`, deployed): sign-in title → "Career Compass Sign In"; body names "your
  Job Tracker"; "Didn’t get it?" line drops the channel ("contact your coach");
  Wizard header → "Career Compass". `MISSION_CONTROL_ORIGIN`, identifiers and
  code comments left alone, since renaming means Vercel env vars and the CSP.
- **Verification:** Todd walked all three screens locally. I confirmed the live
  sign-in HTML serves the new title and body with no "Mission Control" and no
  "Career Compass Intake", and the CSP is unchanged. **Not observed in
  production:** the "Didn’t get it?" line and the Wizard header. Both render only
  after an interaction or sign-in, which fetching the page cannot reach.

### Decisions Todd made

- Client-facing copy says **Job Tracker**; "Mission Control" stays as the internal
  name in code, env vars and comments.
- **Line 116: drop the channel rather than name one.** "Naming Circle would be
  another guess dressed as a fact, which is exactly how 'Mission Control' got
  there."
- **Em dash, not hyphen**, in client copy. The app is consistent and a lone
  hyphen reads as a typo.
- Push `phase-2-report` alongside `main`: a branch left behind origin causes
  rebase friction later.

### Corrections from Todd

- **Line 116's "message your coach in Mission Control" was a guess made during
  the Phase 1 build with no spec behind it, and it sat in production copy until
  today.** Traced: `git log -S` puts its introduction at `51ab67f` ("wizard UI,
  admin view, error states"), and the spec contains no "check spam" or "didn't get
  it" text and says nothing about how clients reach their coach. Nothing in the
  repo records where clients actually message their coach; the only messaging on
  record is the Circle DM, which runs the other way.
- **Todd corrected his own instruction** (Wizard header → "Career Compass Sign
  In"). I held that one edit and flagged that the header sits above every intake
  step after sign-in; Todd agreed: "My instruction was wrong." This matches session
  7's note that Todd treats his own framing as revisable.
- **Hyphen:** I applied Todd's text verbatim, hyphen included, and flagged it;
  he chose the em dash. Asking first would have cost the same round trip and saved
  an edit.

### Didn't work as expected

- **`intake-app/.env.local` points at the production Supabase project and the
  live Make.com webhook.** A plain `next dev` would send real magic-link emails and
  write drafts to production. Worked around by starting the dev server with
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ORCHESTRATOR_WEBHOOK_URL` and
  `CAREER_COMPASS_WEBHOOK_SECRET` set to empty. `@next/env` only fills a variable
  that is undefined, so an empty override holds (read from
  `node_modules/@next/env`). Confirmed before any typing: `POST
  /api/auth/dev-send` returned 200, and that route refuses whenever Supabase is
  configured. Candidate for Technical Notes if it recurs.
- **No browser tools this session.** The Chrome extension was declined, so Todd
  walked the local flow himself. Fetching the page covers only server-rendered
  text, which leaves post-interaction and post-sign-in copy unobservable from
  here in production.
- **Local `main` is stale** (`3d8951e`); `main-deploy` tracks `origin/main` and
  is what gets cherry-picked onto and pushed as `main-deploy:main`.
- **`.dev-data/db.json` mtime advanced during Todd's walk (08:50)**, but every
  record's timestamps are still 2026-09-03 and no new record appeared. It is
  gitignored with no copy, so whether any content changed is unknown. Compare
  session 7, where a local walk did overwrite a dev record.

### Patterns (tentative)

- **Internal assumptions made while building reach client-facing text, and
  nothing in the pipeline catches it.** Todd asked for this to be recorded as a
  pattern, not a one-off. Two instances, different layers, same shape:

  | Instance | What was internal | How it reached the client |
  |---|---|---|
  | Line 116 (this session) | A builder's guess about where clients message their coach | Written into UI copy during the Phase 1 build; live until today |
  | `seniority_note` (session 6) | Notes written **to Todd** | Rendered verbatim into a client report; the build printed `FINDINGS: none` |

  In both, text written for an internal audience crossed to the client with no
  audience boundary, and in both it was caught only by a human reading the
  rendered client-facing output. No check fired either time.

  Possibly a second mechanism under the same pattern, **not verified:** the
  *original* sign-in body ("same email you use for Mission Control") closely
  mirrors the spec's own wording ("tied to the same email as Mission Control",
  spec line 139). If so, that line was not a guess but the spec's internal
  vocabulary copied into client copy. That would be a separate route from the
  line-116 guess: one fills a gap with an assumption, the other carries internal
  naming across unchanged. The spec still uses "Mission Control" throughout, so
  building from it could reintroduce the name.

  Worth testing at the session-10 review whether this is one problem: per-text
  audience that nothing records or enforces, in the UI and in the report
  pipeline. Note that the `seniority_note` half is itself still a raw session-6
  observation and a MEMORY open question, not a confirmed fact.

  **Addendum, Sept 10 2026 (added during the Jaleesa McCreary build, at Todd's
  direction): a third instance, and it is now three routes into the same
  problem, not two.** Found while rebuilding Harper's report to measure a
  template change; confirmed by reading the **delivered** PDF directly, not the
  rebuild.

  | Route | What was internal | How it reached the client |
  |---|---|---|
  | `seniority_note` on Jensen (session 6) | Notes written to Todd in the research doc's `Seniority Note:` field | Parser treats the document's note as authoritative; renders verbatim as "A NOTE ON LEVEL" |
  | "Mission Control" line in the sign-in copy (session 8) | Internal naming for the Job Tracker | Written into client-facing UI copy |
  | **"Flag:" note in Harper's technical requirement (this addendum)** | A research-thread flag addressed to Todd, inline in a **content** field | Technical Requirements prose is rendered verbatim; it is on page 9 of Harper's delivered report |

  The page-9 text: *"Flag: this exceeds the standard upskilling threshold. Given
  how directly this role matches Jensen's strongest functions … it's a real time
  and cost commitment he should weigh deliberately rather than assume is
  optional."* Written about the client in the third person, to Todd.

  **Why this one matters for the fix:** routes 1 and 3 both start in the
  research document, but through different fields. `seniority_note` is a
  dedicated note field, so the options on the table for it (a client-facing
  `Seniority Note:` plus an internal field the parser ignores, or asking the
  research thread for client-facing notes) would **not** reach this one. The
  flag sits inside ordinary content prose, so any fix scoped to one field
  leaves the others open. That strengthens the case for treating it as one
  problem (per-text audience that nothing records or enforces) at the
  session-10 review, not solving each field separately.

  Also found in the same scan, same PDF: page 21, in Travel, *"Flag: travel
  expectations vary widely by employer and account type — …"*. It's the same
  marker but reads as a caveat rather than a note to Todd. Not yet judged
  whether it counts. Scope of the scan: every PDF under `reports/` (Scheiwe,
  Johnson, Harper, McCreary) for `Flag:`, `Todd`, `client direction`,
  `earlier draft`, `he/she should weigh`, `graph placement`, `flagging`. Hits
  only in Harper. A phrase scan is not proof of absence.

  Also observed on that page: the same technical requirement says the
  certification takes "3+ months", then the template's appended label says
  "Time to acquire: Immediate — no barrier identified". The client sees both.
  That is the known-gap tech-requirements label, not the audience problem,
  but here it contradicts the prose rather than just repeating it.
  Unconfirmed; raw observation.

  *(Resolved later the same day in session 9: the "Immediate" label was a
  fabricated parser fallback, removed in `11153fb`. See session 9.)*

---

## Session 9 — 2026-09-10 — Jaleesa McCreary build; dangling colons; fabricated "Immediate"

**Raw observations. Not authoritative.**

### What ran

- **Jaleesa McCreary report built from Todd's research markdown**: 9 roles,
  propose clean (0 FAIL), 33-page PDF at `reports/mccreary/`. **Not delivered;
  it's waiting on Gate 4.** She has no Supabase `clients` id because she filled in
  the intake before ids were active, so this was a local build only, by Todd's
  direction. `CLIENT_ID_ABSENT` is expected on her.
- **The two Seniority Notes written to Todd (#8 Director of Events, #9 Program
  Director) were replaced** in a working copy of the markdown with client-facing
  rewrites Todd approved. The as-received file is kept alongside, following the
  Harper precedent.
- **Commits:** `b24c512` template, one-sentence bullets render as plain sentences ·
  `f50ce2c` MEMORY, where the format-defect rule stops · `4bd51ef` SESSION_LOG,
  the third audience route (session-8 addendum) · `11153fb` parser + template +
  SKILL.md, no fabricated "Time to acquire" and a new `TECH_TIME_NOT_FOUND` WARN
  · `775b62c` MEMORY, one-label-per-role deferred. All on `phase-2-report`. None
  touches `intake-app/`, so nothing needed to reach `main`.
- **Verification on each rebuild:** Functional Mix re-read from the markdown and
  diffed against the JSON; TOC page numbers against page content; zero
  `[cite:`; conditional notes only where expected; embedded fonts; dangling
  colons and time labels counted from the data, not from PDF text. Pages
  rendered and looked at each time. Drift suite 14/14 after the parser change.
  JSON diffed against the committed parser's output: only `tech_time_1` changed.

### Todd's gate decisions (his, not defaults)

- **All 9 roles ship.**
- **Base salary bands (Option A) on every role.** #2 uses the general-market
  band because the niche band states no low. #7's high is $137,000, read out of
  garbled research prose ("$137,000 at the 75th percentile near $159,000").
  Midpoints I calculated are marked as such in the judgment file.
- **Function placements:** my proposed primaries shipped — HR for #1–3, #6, #7;
  Marketing for #4, #5; Operations for #8, #9. ~~**Accepted by not objecting, not
  by explicit review.** I said they'd follow the table unless he said otherwise,
  and he didn't. Worth knowing at Gate 4.~~

  **Superseded at Gate 4, later the same session:** Todd reviewed page 6 (the
  role landscape) and approved the placements, so they were **reviewed, not
  shipped by silence**. The struck text was accurate when written and wasn't by
  session end. Todd pointed out it's a small instance of the expired-note
  pattern below. Kept rather than deleted so the change is visible.
- **Rating-led value bullets ship as written**, e.g. "Fun: Moderate — …". 35 of 45.
- **Seniority by the title rule.** #8 and #9 are Strategist; their notes pointed
  the same way.

### The sequence (Todd asked for this recorded)

One cosmetic complaint led to four findings, three of them in already-delivered
work:

1. **Dangling colons on Jaleesa's Day-to-Day pages**: every one-sentence bullet
   rendered as "lead:" with nothing after it.
2. **Checking whether that was new showed it already shipped**: 33 in Harper's
   delivered report, 12 in Johnson's. Fixed in the template (`b24c512`).
3. **Rebuilding Harper to measure that fix surfaced the "Flag:" note** on page 9,
   a research-thread flag addressed to Todd, printed inside a delivered
   technical requirement. It's the third audience-routing route (session-8
   addendum).
4. **The same page showed "3+ months" with "Time to acquire: Immediate — no
   barrier identified" under it.** That traced to a parser fallback that
   fabricated "Immediate" whenever no `N–M months` range matched: 9 of 18 roles
   across the three delivered reports. Fixed in `11153fb`.

None of the four was caught by a check. Each was found by reading a rendered
page, and #3 and #4 turned up while measuring something else. The Harper rebuild
was run to measure the colon fix, not to audit Harper.

### Corrections from Todd

- **Colons: I recommended sending them upstream under the format-defect rule.
  Wrong.** Harper and Johnson followed the format and still produced them. A
  one-sentence bullet is valid content; the template assumed two parts. The
  line, now in MEMORY: invalid research goes upstream; valid research the
  template mishandles gets fixed in the template.
- **"Time to acquire": blank plus a WARN, not a wider pattern.** Todd:
  extending the regex just moves the silent failure to the next phrasing nobody
  anticipated. Same principle as `FUNCTION_DESC_MISSING`.
- **My counts were low.** I first gave 25 / 10 / 55 from PDF text extraction,
  which misses bullets that wrap. Counted from the data: 33 / 12 / 54. Same
  family as the Corrections Log entry on truncated evidence: the extraction
  quietly undercounted, and I reported its number before cross-checking it.
- Todd interrupted my first attempt to apply the colon fix to ask whether it
  belonged upstream. That question is what produced the rule above.

### Didn't work as expected

- **The Edit tool wrote a literal `•`** where `report_template.py` uses `\u2022`
  escapes, on the first patch. Caught by `cmp` against the scratch copy I'd
  tested, then corrected. On the second patch it wrote escapes. Inconsistent,
  and output-identical either way, but byte-compare against the tested copy
  caught it where a read-through would not have. **It happened again writing
  this entry**: `\u2022` typed into an edit landed as `•`, so the tool decodes
  escape text in its input. Fixed by writing that line through Python.
- **Two bugs in my own check scripts**, both caught as harness failures before
  being reported as findings: an unquoted heredoc let bash expand `$[` into
  arithmetic, and a recursive JSON diff walked into equal strings. The Corrections
  Log step (check the harness before reporting a failure) held this time.
- **`reports/scheiwe/` holds two PDFs**: the 26-page one (Sept 4) that MEMORY
  records as delivered, and a 30-page `_v24` build (Sept 7) that nothing records
  as delivered. Its status is unknown.

### Patterns (tentative)

- **A note that expired without anyone noticing.** This is Todd's framing, and
  it's the mechanism behind finding #4. The known-gap note called the tech label
  "cosmetic redundancy", and **it was accurate when written**: Scheiwe's
  research phrased requirements as "no immediate barrier", so "Immediate" only
  repeated it. From Johnson onward the research phrased timeframes differently.
  The note didn't change, and a description that was once true is why nobody
  looked again.

  This differs from the Corrections Log entry on "Functions 6-10". That note
  was **wrong when written**; this one was **right when written and expired**.
  A wrong note fails any honest check. An expired note passes every check made
  against the inputs it was written about, and nothing ties it to those inputs,
  so a change upstream doesn't flag it. For the session-10 review, as a question
  rather than a proposal: should notes about client-visible output record which
  inputs they were observed against, so a change in input triggers a re-check?

- **Audience routing is now three routes**: the level-note field, UI copy, and a
  flag inside content prose. Detail in the session-8 addendum.

### Open at session end

- **Jaleesa's report: Gate 4 approved by Todd, Sept 10 2026.** His stated review
  (recorded for gate training): page 6 (function placements on the role
  landscape), the salary bands, and the two rewritten level notes. The PDF he
  approved is the 10:47 build, 33 pages. **Not uploaded to Drive**, because she
  has no `clients` row, so the uploader would refuse. Not yet delivered through
  the chain.
- **Next session, not now (Todd): research-only clients and the delivery chain.**
  Four clients have no Supabase row and can't use the delivery chain: Austin,
  Henry, Harper, Jaleesa. That's every real client so far; the only rows are
  Todd's test accounts. Todd: worth deciding whether research-only clients get
  rows created, because "manual for now" is quietly becoming how it works. This
  is MEMORY's existing Open Question ("Do research-only clients need a
  `clients` row"), which **still lists three clients**. Jaleesa makes four, so
  that entry is now out of date too.

  **Resolved before session end, not carried:** Todd decided it. Future clients
  come through intake. The four are transitional and get manual delivery. Matt
  Fabin is a known exception. The uploader's refusal is correct behaviour. Now in
  MEMORY Decisions Made; the Open Question is removed.
- **Delivered reports still carry what this session found.** Harper: 33 colons,
  the page-9 "Flag:" note, 7 wrong "Immediate" labels. Johnson: 12 colons, 3
  wrong "Immediate" labels. Whether to rebuild and re-deliver is Todd's call.
  **A rebuild from saved JSON reprints the fabricated label**, so it needs the
  parser's build step first. Harper's "Flag:" text is in the research prose
  itself, so a rebuild prints it too unless the markdown changes.
- Harper's page-21 Travel "Flag:" is logged as ambiguous, per Todd. It reads as a
  caveat, not a note to him.
- One label per role on technical requirements: deferred (MEMORY).
- **Session 10 is the 5-session review.**

---

## Session 8, continued — 2026-09-10 evening — Embed chain through Circle

**Raw observations. Not authoritative.** Same conversation as session 8. It lands after
session 9 in this file only because session 9 ran in between. **Not a separate session
for the review count.**

### What ran

- Todd identified that the embed is a **three-level chain**: Circle community
  (`https://www.group.ministrytomarketplace.co`, page `/job-tracker`) →
  `mc.ministrytomarketplace.co` → `career.ministrytomarketplace.co`. `frame-ancestors`
  allowed only `'self'` and mc, and it is checked against every ancestor, so the
  innermost frame is refused on the client path.
- **Fix:** Circle origin hardcoded in `next.config.ts` (`85f4eb7`; cherry-picked to
  `main-deploy` as `87b2feb`). **Not pushed; awaiting Todd's go.** The local dev server,
  with `MISSION_CONTROL_ORIGIN` set to the prod value, produced `frame-ancestors 'self'
  https://mc.ministrytomarketplace.co https://www.group.ministrytomarketplace.co;`, and
  `tsc` passed.
- **Cookie check:** the auth cookie is `SameSite=Lax` (`@supabase/ssr` 0.12.5 default,
  no override in the app). Reasoned to be fine, because all three levels are same-site
  (`https` + `ministrytomarketplace.co`) and SameSite keys on site, not origin.
  **Not observed.** It breaks if Circle adds its own intermediate iframe on another
  domain or sandboxes the embed without `allow-same-origin`.
- MEMORY narrowed (approved by Todd): Phase 4 step 3 is "verified two levels deep
  only". Todd: **leave it narrowed until he has tested through Circle; do not upgrade
  it on the strength of the fix deploying.**

### Decisions Todd made

- **Hardcode the Circle origin, not a second env var.** Reasons given: same in every
  environment, no local Circle, an unset env var would be dropped silently by
  `.filter(Boolean)` and ship the old policy with no error, and a static CSP needs a
  redeploy to change either way. `MISSION_CONTROL_ORIGIN` stays an env var because mc
  has a local instance.

### Correction from Todd — why this happened

- **The Sept 9 embed test opened mc directly in its own window.** In Todd's words: that
  was the convenient thing to do, and it happened to be a different chain than the one
  clients use. **The test was real, it just wasn't the path.** MEMORY then recorded the
  embed as "complete and verified in production" and "auth survives the frame", which
  claimed the scope of the path clients use while only having the scope of the path
  tested.
- My own gap: I read that MEMORY entry this morning and repeated "the embed is verified
  in production" in the status summary without asking what the test path was.

### Patterns (tentative)

- **The convenient test path is not the client path, and the verified claim silently
  takes the client path's scope.** Instances, same shape:

  | Instance | Path tested | Path clients take |
  |---|---|---|
  | Phase 1 "Supabase-verified" (narrowed Sept 9) | Writes + RLS; local dev bypasses auth | Magic-link sign-in in production |
  | Sept 9 embed test | mc opened directly, two levels | Circle → mc → career, three levels |
  | Today's copy walk (session 8) | Local dev mode, dev-cookie sign-in | Magic-link sign-in, inside the Circle chain |

  The third did no harm, because the copy is identical on both paths and I said so
  when reporting. It is listed because the shape is the same, not because it failed.
  Tentative countermeasure worth testing at the session-10 review: a completion claim
  for anything client-facing names the path it was tested on, and MEMORY records
  that path next to the word "verified".
- Related to, but distinct from, the audience-leak pattern logged earlier in session 8
  (and extended by session 9's third route). That one is about text crossing from an
  internal audience to the client. This one is about a test crossing from a convenient
  path to a claim about the client's path. Both are a scope silently widening between
  what was done and what gets recorded.

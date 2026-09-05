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

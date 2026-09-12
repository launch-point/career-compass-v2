# Career Compass v2 — MEMORY.md

*Last updated: Sept 10, 2026*

This file holds **confirmed** facts, decisions, and gotchas. It is authoritative — read at the start of every session and treated as settled.

Two ways things get in here:
1. **Todd says "log that"** — captured immediately, directly into the right section below.
2. **Promoted from `SESSION_LOG.md`** at a 5-session review — raw observations get examined with Todd, and only what he confirms graduates into this file.

Nothing lands here on Claude Code's inference alone. Unconfirmed observations belong in `SESSION_LOG.md`.

Keep this file short. If it's getting long, that usually means something belongs in `CLAUDE.md` (if it's behavioral) or should be pruned (if it's stale).

---

## Current Status

**Phase:** 4 — steps 1–2 (Drive upload, screen 3) **complete and verified in production**; step 3 (Mission Control embed) **verified Sept 10 2026 through the full client chain, Circle → mc → career**; Circle DM automation deferred, stays manual by decision
**State:**
- **Phase 1 (intake form + minimal admin view): built and deployed.** Live in production at `career.ministrytomarketplace.co`. Supabase-verified **on writes and RLS only** — both confirmed against the live project. **The prod magic-link sign-in path was not part of that verification and may never have had a successful end-to-end run.** `LoginPanel.tsx` routes to a dev-cookie path whenever `NEXT_PUBLIC_SUPABASE_URL` is unset, so local testing bypasses Supabase auth entirely. **Sign-in is now confirmed working end to end in production (Sept 9 2026):** a magic link signed Todd in and resumed his in-progress intake. Do not read the original "Supabase-verified" note as having covered auth — it did not. That was the same class of problem as a stale entry: a note reading broader than what was actually tested end to end. (Narrowed Sept 9 2026; auth confirmed working Sept 9 2026 — both directed by Todd.)
- **Phase 2 (report build): built, verified, and reviewed.** The full pipeline — Stage-2 research markdown → `parse_research_markdown.py` → `graph_generator.py` → `report_template.py` → branded PDF — has produced a real client report end to end: **Austin Scheiwe, 26 pages.** Independently verified against actual page content, and personally reviewed by Todd. The `career-compass-report` skill has additionally been cold-session verified multiple times across different environments. Phase 2 is not "unverified work" — treat it as proven.
- **Phase 3 (deep research / market validation): still manual.** Todd does the research himself
  and hands over the Stage-2 research markdown; the report pipeline starts from that file. **The
  automated Perplexity/Sonnet research pipeline does not exist in this repo** — it has been built
  elsewhere and mainly needs porting in, not designing from scratch. Do not go looking for it
  here, and do not conclude from its absence that Phase 3 was never started. (Stated by Todd,
  Sept 10 2026)
- **Phase 4 step 1 (Drive upload after Gate 4): built and verified end to end, Sept 9 2026.**
  `upload_report.py` uploads an approved PDF to Drive, sets link sharing to anyone-with-the-link,
  and records the link on `clients`. Proven with a real run: Henry Johnson's 822KB PDF uploaded to
  the folder `Career Compass Reports` (`1dRdVO-LSrk9diSkQQ2ysuZwYIDtfkZGo`), permissions read back
  as `type=anyone role=reader`, the link fetched with **no Google session** returning the PDF
  byte-identical to the local file, and all four `report_*` columns written and read back through
  PostgREST. Auth is OAuth (Internal consent screen, `drive.file` scope, refresh token) — **not** a
  service account: `iam.disableServiceAccountKeyCreation` is enforced org-wide. Credentials live
  **outside the repo** at `~/.config/career-compass/credentials.json`, mode 0600, and the scripts
  refuse to run if that file is readable beyond its owner. Supabase creds are *not* duplicated
  there — the uploader reads them from `intake-app/.env.local`. Migration `0002` is applied to
  production. Verified against the test row `todd+careertest1@launchpoint.co`, whose columns were
  nulled afterwards so it does not look like a real delivery.
- **Phase 4 step 2 (screen 3, results ready): complete and verified in production, Sept 9 2026.**
  The intake app's third state — the report link, with the client's Career Highlight Stories
  below it as clickable tabs, each story rendered as four labelled parts rather than run
  together as narrative. **Verified by Todd signing in to production as
  `todd+careertest1@launchpoint.co` and seeing the report link and the story tabs**, which
  closed the one gap the build could not: the Supabase read and the page render proven
  together against a real session, not separately.

  **Story tabs use "any field has content", not "all four".** The submit gate only enforces
  all-four on stories 1–3 (`wizardGating.ts`) and requires 3 of 4 complete overall
  (`answers.ts`), so a partially-filled story 4 is a legal submission; requiring all four
  would silently drop something the client wrote. Inside a tab only non-empty parts render,
  so no label ever appears over nothing.

  **The transition is one-way and enforced server-side.** `page.tsx` resolves the state and
  does not render the wizard at all when a report link exists — there is no form URL to
  reach, since `/` is the only client route. `PUT /api/draft` and `POST /api/submit` both
  refuse with **423 `delivered`**, deliberately **independent of `locked`**, so an admin
  unlock cannot reopen a delivered client. **Clearing `report_drive_link` is the explicit
  escape hatch and the revision path** — clear, re-upload, the client transitions again.
  Verified: with `locked=false` and the link still set, the form does not come back and both
  routes return 423; clearing the link reopens it and `PUT` returns 200.

  **`main` now carries screen 3 (`3ceee13`) and migration `0002` (`0ea7714`).** The migration
  was added to `main` deliberately: the columns had been applied to production by hand, so
  without the file `main` shipped code querying columns its own migration history never
  created — a trap for anyone provisioning a fresh environment.
- **Phase 4 step 3 (Mission Control embed): verified Sept 10 2026 through the full client
  chain, Circle → mc → career — page load and magic-link sign-in both confirmed.** Todd loaded
  `www.group.ministrytomarketplace.co/job-tracker`, opened Career Compass, signed in with the
  magic link, and landed signed in. **Scope of that test:** page load and sign-in through the
  three-level chain. Opening the report link was checked only on the Sept 9 two-level path,
  not through Circle.

  *How it got here:* on Sept 9 Todd opened `mc.ministrytomarketplace.co` in its own window and signed in; screen 3
  displayed and the report link opened the PDF. Auth survived that frame. **That is not how
  clients reach it.** The real chain is three levels: the Circle community
  (`https://www.group.ministrytomarketplace.co`, page `/job-tracker`) →
  `mc.ministrytomarketplace.co` → `career.ministrytomarketplace.co`. `frame-ancestors` is checked
  against *every* ancestor, not just the parent, and the policy allowed only `'self'` and mc,
  so the innermost frame is refused on the client path. The Sept 9 test was real; it just was
  not the path. (Narrowed Sept 10 2026 — directed by Todd; upgraded the same day only after
  Todd's own sign-in through Circle, not on the strength of the fix deploying.)

  **The fix, deployed Sept 10 2026 (`87b2feb`):** `next.config.ts` adds the Circle origin,
  hardcoded alongside `MISSION_CONTROL_ORIGIN` (`85f4eb7` on the branch). Production serves
  `frame-ancestors 'self' https://mc.ministrytomarketplace.co
  https://www.group.ministrytomarketplace.co;` (read from the live headers). Hardcoded because
  the origin is the same in every environment, there is no local Circle, and an unset env var
  would be dropped silently by the `.filter(Boolean)`.

  **The auth cookie is `SameSite=Lax`** (the `@supabase/ssr` default; the app does not override
  it), and it holds because all three levels are same-site (`https` +
  `ministrytomarketplace.co`). SameSite keys on site, not origin. This was reasoned first and is
  now consistent with Todd's sign-in through Circle. **It would break if Circle ever moves off
  `ministrytomarketplace.co`, wraps the embed in a further iframe on another domain, or
  sandboxes it without `allow-same-origin`.** Any of those needs a re-test through Circle.

  **The embed only works on the published domain.** The CSP is a *static* policy built in
  `next.config.ts`. Before the Circle fix, production served exactly
  `frame-ancestors 'self' https://mc.ministrytomarketplace.co;` (confirmed from the live
  response headers, Sept 9 and 10 2026). **Lovable's editor preview is a different origin and is
  refused.** That is the policy working, not a bug. **Test the embed the way clients reach it —
  through `www.group.ministrytomarketplace.co/job-tracker` — not by opening mc directly, and
  never in the preview.** Allowing another origin means a config change and a redeploy, not a
  runtime toggle.

  **The old admin PDF upload path in Job Tracker has been removed.** Reports are delivered
  through the embedded app now. **Reports uploaded that way previously are still in storage but
  unreachable from the interface** — if one is ever needed, it exists and must be retrieved from
  storage directly. Do not conclude from the UI that it is gone.

**The delivery chain is built except the Circle DM.** Intake → submit → report build →
Gate 4 → Drive upload → screen 3 are verified in production, and the Mission Control embed is
verified through the full client chain, Circle → mc → career (Sept 10 2026; see step 3 for
exactly what that covered). The **Circle DM stays manual with its own human gate by decision** — not an
unfinished piece. It is to be automated at Gate 4 later, once the chain has run cleanly across
several real clients.

*(Step numbering note: step 3 is the embed. An earlier entry called the Circle DM "step 3";
that was before the embed was scheduled ahead of it. The Circle DM is now a later step.)*

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
- ~~**Google Drive upload + Mission Control linking deferred to Phase 4.**~~ **Superseded
  Sept 10 2026 — both are now built and verified in production (Phase 4 steps 1 and 3; see
  Current Status). Kept for the reasoning behind holding them during Phases 1–3.** Do not design or build it during phases 1–3. Interim requirement: every phase writes output tied to the stable client ID in a predictable, loggable way so phase 4 wires existing IDs together rather than retrofitting. (Sept 2026)
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

  **Where the rule stops: a renderer that can't handle valid input gets fixed
  locally.** The test is whether the research produced something **invalid**, or
  something **valid that the template mishandles**. Invalid input goes upstream,
  as above. Valid input that renders badly is a template bug, and sending it
  upstream would just ask the research thread to write around the renderer.

  The case that set the line: "Problems Solved", "Actions Taken" and "Results
  That Mean Success" printed as `{lead}: {detail}`, with no fallback when there
  was no detail. Every one-sentence bullet ended in a bare colon. Jaleesa
  McCreary's document writes every bullet as one sentence (54 dangling colons),
  and it looked at first like a format drift to send back. It wasn't. Harper and
  Johnson followed the format and their delivered reports still carried 33 and 12
  of them. **A one-sentence bullet is legitimate content, not a defect**; the
  template assumed two parts. Fixed in `report_template.py`: a bullet with no
  detail renders as a plain sentence. Rebuilding Harper or Johnson changes only
  their Day-to-Day pages; page counts and the TOC are unchanged.

  **Why it's written down:** the first call on Jaleesa's colons went the wrong
  way. The upstream rule was applied without first asking whether the input was
  actually invalid. Decide which side of the line a defect is on before choosing
  where to fix it. (Sept 10 2026 — directed by Todd)
- **Audience routing ("problem A") is resolved UPSTREAM. No pipeline change is needed,
  and none should be built.** The Sept 11 2026 audit found research prose written to Todd
  rendering on client pages — Harper's two `**Flag:**` passages, Johnson's three "A NOTE ON
  LEVEL" notes that are not about level, Scheiwe v24's "passed the seniority screen". The
  cause was in the research template, not in this repo. **The research thread was following
  the instructions it had** (Todd, Sept 12 2026, after checking the research project
  against the audit's five questions):

  - Two channels for notes to Todd already existed — **Layer 2 internal notes** and the
    **handoff message**.
  - **C-1 said "flag it to Todd" without naming a destination**, so flags landed inline in
    whatever field the writer was in.
  - **E-1 described the Seniority Note purely as a build signal** and never said it prints
    verbatim to the client.

  **Fixed upstream in `00_Output_Format.md`** with five additions: a **B-0** stating every
  line in a role section is client-facing; an **E-1** addition saying the note renders under
  "A NOTE ON LEVEL"; a **C-1** rewrite naming the handoff message as the flag destination
  and stating there is no inline flag marker; and two **PART C** bullets covering voice and
  references to material the client never sees. `02` and `03` were updated to match, and
  the project instructions pane as well.

  **The two halves, so neither is mistaken for the whole:** `46cf1a9` was the **local**
  half — the confirmed judgment now wins over the document and replacements print under
  `OVERRIDDEN`. The template additions are the **upstream** half, and they are what stops
  Todd-facing prose being written into client fields in the first place. A parser-side
  audience mechanism is **not** wanted on top of this.

  Not covered by this: the salary-basis question below, which stays open, and the reports
  already delivered with the old text. (Todd, Sept 12 2026)
- **Research-only clients get manual delivery; no `clients` rows are created for
  them.** *(Moved from Open Questions, Sept 10 2026.)* Every future client comes
  through the intake form, so each has a Supabase row and the full delivery chain
  works: Drive upload, screen 3, Mission Control embed. The research-only clients
  are **transitional**: **Austin Scheiwe, Henry Johnson, Jensen Harper and Jaleesa
  McCreary**. Their reports were built from research markdown Todd supplied
  directly, not from an intake submission, and they get manual delivery. The
  open question listed only the first three; Jaleesa, built and approved at Gate
  4 on Sept 10 2026, is the fourth.

  **Known exception: Matt Fabin**, the one future client who will not come
  through the intake form. With no row, he falls under the same manual delivery.

  **`upload_report.py` refusing a report with no client id is correct behaviour,
  not a gap to work around.** Do not create rows by hand, invent a `--client-id`,
  or otherwise route these clients into the chain. The refusal is the system
  correctly saying the report isn't database-backed.

  Background from when this was open: the research path and the intake path have
  never met. It surfaced while verifying the Drive upload, which keys the report
  link to `clients.id` and had no real row to write to (verified by querying the
  table). `--client-id` bridges the gap for any client who has a row; reports
  built before it existed carry only a name. (Decided by Todd, Sept 10 2026)

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

  **`salary_context` is dormant, not safe — this question and that field are one
  problem** (Todd, Sept 11 2026). The field carries internal-voice text in every delivered
  client, and rendering it as it stands would ship exactly that. From the research prose:
  "per your direction" and "you want Jensen positioned…" (Harper), "Given her
  Director-level functional scope" (McCreary), "You have elected to keep this role despite
  the conditional read" (Scheiwe v24), "comes close to 90% of $100,000" (Johnson). From the
  judgment file, which now wins after `46cf1a9`: Todd's own integer-decision notes ("OTE
  basis, not base salary…", "Senior Development Director scenario selected"). **Both
  candidate sources are written for Todd**, so whatever renders a salary caveat needs a
  client-facing source of its own — it cannot just switch the template on.

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
- **An installed research-template file had silently drifted BACK to a pre-v2.3 format
  spec — and that stale copy is what produced two defects already blamed on the research
  thread.** Found Sept 12 2026 while fixing audience routing upstream: `02` was still
  installed carrying pre-v2.3 rules — **"Why This Fits You is ONE PROSE PARAGRAPH"** and an
  instruction for the **Functional Mix to omit functions that don't apply**.

  Those two rules are the direct cause of **Austin's missing Function 1** and **Henry's
  prose "Why This Fits You"** — the latter being the defect that was sent upstream in
  session 4 and treated as a one-off research error. It was a stale installed file
  regenerating the same output. **This is the same drift C-3 had already recorded once**,
  which is what makes it a pattern rather than an accident.

  **The corrected `02` now carries a detection test for it.** Practical rule for this repo:
  when a research document breaks a format rule that was supposedly fixed before, suspect
  the installed template copy, not only the thread that wrote the document. Those files
  live in the research project and cannot be checked from here — ask Todd to verify which
  version is actually installed. (Todd, Sept 12 2026)
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
  `career.ministrytomarketplace.co` builds from `main`. On Sept 9 2026 `main` was 49
  commits behind the branch, the webhook payload refactor had never been live, and Todd
  had been reasoning as though branch work was live.

  **That specific gap is closed.** The refactor reached `main` as `0a7bc4f` and was
  confirmed live through the Slack notification (Sept 9 2026); screen 3 (`3ceee13`) and
  migration 0002 (`0ea7714`) followed. As of Sept 10 2026 `main` is 61 commits behind,
  but `intake-app/` is identical on both. The difference is docs, MEMORY/SESSION_LOG,
  the report skill, `.gitignore` and `credentials.example.json`.

  **The rule stands:** app changes reach production only by being cherry-picked to
  `main`. Before assuming any intake-app behaviour is live, check `origin/main`, not the
  working tree or the branch. Re-measure the gap; don't trust a number written here.
  (Sept 9 2026, directed by Todd; facts updated Sept 10 2026)

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

- Circle DM automation: stays manual with its own human gate by decision. Automate at
  Gate 4 once the chain has run cleanly across several real clients (see Current Status).
- Full admin dashboard: client table, top-5 column, PDF download (Phase 4)
- Agent training loop: pattern surfacing every ~5 sessions to turn Todd's intuitive gate decisions into explicit rules (after phases 1–4)
- Fixed master role list of 50–100 real roles (Todd building in parallel, manually)
- **Technical Requirements: one "Time to acquire" label per role.** The parser collapses
  the whole section into one string (`tech_req_2` is always "None"), so a role listing
  several requirements with different timeframes shows at most one, the first
  `N–M months` range found. Left alone by decision while the fabricated-"Immediate"
  fallback was removed. Detail in the report skill's SKILL.md Known Gaps.
  (Todd, Sept 10 2026)
- **Stale boilerplate in `report_template.py` — three items, Todd's own piece of work,
  deliberately NOT part of the audience-routing fix.** All three are fixed copy written
  once into the template rather than per-client routing, and all three are in every
  delivered report. (Directed by Todd, Sept 11 2026.)
  1. **"Roles are ranked 1–5"** (`report_template.py:378`) prints whatever the role count
     is. True only of Scheiwe's 5-role report; Johnson has 6, Harper 7, Scheiwe v24 8,
     McCreary 9.
  2. **The coverage line** (`report_template.py:789`): "Combined, **the client's** Top 10
     functions account for approximately N% of role time." Three defects in one sentence —
     third-person "the client's" in client-facing copy, N above 100% (Harper 140/115/110,
     Johnson 110, Scheiwe v24 110), and "Top 10" when only 5–7 functions are ever listed.
  3. **"NARROW JOB TYPES tab in your Career Compass"** (`report_template.py:396`). No such
     tab exists in the v2 intake app (grepped). **Whether it exists anywhere clients
     actually go is unconfirmed — Todd is checking.** Do not "fix" it blind.
- Slack message cosmetics (not blocking; pipeline works): the four arrays render
  comma-separated on one line rather than one item per line, and `submittedAt` renders as
  raw ISO (`2026-09-09T14:31:59.899+00:00`) rather than a readable date. (Noted Sept 9 2026)

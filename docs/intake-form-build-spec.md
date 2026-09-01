# Career Compass 2.0 — Intake Form Build Spec

*Status: Ready for Claude Code (Cursor). This supersedes `Resources/intake-app-spec.md` and the intake app description in MEMORY.md — both describe a DESIGNED-BUT-NEVER-BUILT 10-screen flow (flat ~55-item functions list, values-before-functions order, no rating step, no stories, no auth). Confirmed via repo audit: no intake-app code, `functions.json`, `values.json`, or `/orchestrator` currently exist — this is a greenfield build, not a rebuild. One piece of the old spec is preserved and carried forward: the Mission Control iframe integration contract (see Section E) — the new form still lives inside that iframe, just with a different auth mechanism than originally designed.*

*Repo: `github.com/launch-point/career-compass-v2` (new, dedicated repo — see Section 0 below), target path: `/intake-app`*

---

## 0. Location — Read This Before Touching Any Repo

**Build location: `github.com/launch-point/career-compass-v2` — a brand new, dedicated repo.** This is a deliberate choice, not a default. Reasoning:

There are **two other things named "Career Compass" that already exist and must not be touched by this build:**

1. **`github.com/launch-point/career-compass`** — the original GitHub repo. Confirmed via repo audit: empty of any intake-app code, but does contain old design docs (`Resources/intake-app-spec.md`, old `MEMORY.md` references) describing the never-built 10-screen flow. Do not build in this repo.
2. **`/Users/toddlinder/Documents/Claude/Projects/Career Compass/` (local, not in Git)** — the **active, currently-in-use manual workflow** (v17.3 skill-based system: Step 0 profile builder, Thread 1/2/3, PDF generation, Sheets writeback, its own `Clients/` folder and audit memory). Todd is actively running real clients through this system by hand and will continue to do so while this new build's phases 2–3 (report template, deep research) are underway. **This is not legacy — it is live production. Never read from, write to, or reference this location.**

`career-compass-v2` is a clean, isolated repo containing only this build. The goal: Claude Code should never need to reason about which files in a shared space are relevant — everything in `career-compass-v2` *is* the new build, full stop. No folder-discipline burden, no risk of cross-contamination with either the empty old repo or the live manual system.

---



Client feedback on Career Compass: the current ~100-page, 20-role report is overwhelming, and many matched roles are too niche to actually exist in the market at any scale (e.g. "Director of Talent Effectiveness" — technically a role, but rarely a standalone job; more often a function embedded inside a broader title).

Root cause: the old intake produced a thin profile (flat functions list, flat values list, 8 preference questions) that fed an AI which generated candidate roles freely. Optimizing hard for fit produced titles that were theoretically ideal but not practically findable.

The fix starts here, at intake: capture a richer, more textured client profile — including tacit, intuitive signal the old form never asked for — so that later stages (role matching against a fixed master list, market validation, deep research) have something real to work with. This form, paired with a minimal admin view, is Build Priority 1 in the Career Compass 2.0 rebuild. Confirmed sequence: (1) intake form + minimal admin view, (2) report PDF template, (3) deep research/validation with its gate, (4) Circle DM delivery + full admin dashboard. Between phase 1 and phase 3 finishing, Todd will run role matching and research manually using the new intake data — this build does not need to wait for the rest of the pipeline before providing value.

---

## 2. What This Form Replaces

Currently a Google Sheet: client checks boxes, uses dropdowns for top-10/top-5 narrowing. Manual, static, does not enforce sequencing, does not brancn logic based on prior answers.

This becomes a **stateful, multi-step, branching React app** (per existing architecture decision: React, deployed to Vercel, replaces the Google Sheet entirely — client never sees or touches a spreadsheet).

---

## 3. Full Screen Flow

### Section A — Functions Track (Phase 1–4)

**Phase 1: Elimination (hierarchical, walked by category)**

Data source: `/config/functions.json` (does not exist yet — needs to be built, see Section 5 below for full hierarchy).

Structure:
- 3 Job Category Functions: **Information-Oriented**, **Things-Oriented**, **People-Oriented**
- Information-Oriented → 5 categories, straight to categories (no intermediate split)
- Things-Oriented → 7 categories, straight to categories (no intermediate split)
- People-Oriented → splits FIRST into two branches, and only here:
  - **Primarily One-on-One** → 3 categories
  - **Primarily with Groups, Organizations, the Public, or Humanity** → 4 categories
- Each category contains ~4–17 individual checkable function items, plus one free-text "Other" field per category

Screen behavior:
- One screen per **category** (the leaf grouping — this is the correct unit of navigation, not a deeper "subcategory" level; category and what Todd initially called "subcategory" are the same level)
- Each screen shows the category name, its short list of checkable items, and an "Other: ___" text field
- Client checks every function they have done before in a **paid job** — no skill or enjoyment judgment yet, pure "have I done this"
- Walk order: Information's 5 categories → Things' 7 categories → People's One-on-One 3 categories → People's Group 4 categories (19 category-screens total)
- Progress indicator should reflect position within this 19-screen walk

**Phase 2: Natural Ability Rating**

- Fires only after all 19 elimination screens are complete
- Flatten the full checked list (no longer grouped by category)
- Client rates each checked item 1–5 (5 = highest natural ability)
- One consolidated screen or a short paginated rating flow — Claude Code's judgment on UX, but must NOT re-introduce the category walk here; this list is flat

**Phase 3: Narrow to Top 10**

- Filter: only items rated 4 or 5 from Phase 2 are eligible
- **Minimum required: at least 10 items must be rated 4 or 5.** If fewer than 10 qualify, do not proceed to narrowing — send the client back to Phase 2 (or Phase 1) with a message prompting them to reconsider ratings or check additional functions, rather than letting narrowing run on a pool smaller than 10.
- Client selects top 10 from that filtered pool, weighing enjoyment subjectively (no separate enjoyment rating field — this is a gut-call selection, not another rating step)

**Phase 4: Narrow to Top 5**

- From the 10, client selects final 5
- Include this framing prompt in the UI copy: *"Imagine performing each of these for several hours a day, for the rest of your working life. If it loses its appeal under that lens, don't include it."*

### Section B — Values Track (3 phases, no hierarchy, no rating)

Data source: `/config/values.json` (does not exist yet — needs to be built, see Section 5).

- ~90 values, flat list (alphabetical), ending in one free-text "Other" field
- Phase 1: Elimination checklist — check all that resonate (single flat screen or short paginated list, no category walk). **Minimum required: at least 10 values must be checked.** If fewer than 10 are checked, prompt the client to reconsider before allowing them to proceed to narrowing.
- Phase 2: Narrow checked list to top 10
- Phase 3: Narrow top 10 to top 5

No rating step exists on this track — do not add one. This is intentionally simpler than the functions track.

### Section C — Work Requirements (8 fields, mostly open text)

Exact current field labels (preserve wording):

1. What is your current job title?
2. What is the minimum salary requirement for your next job?
3. What is the maximum amount of travel days per month that would be acceptable to you?
4. Where do you live? (City, State)
5. What is your office preference? (Remote, Hybrid, In Office, a combination)
6. Do you have any advanced degrees in anything besides what you would get at seminary or bible school?
7. How many years have you been in the workforce working full time?
8. Any other notes about your preferences we should take into account?

All open text entry in the current form — carry forward as-is unless Claude Code identifies an obvious structured-input opportunity (e.g. salary as number input) worth flagging to Todd, not deciding unilaterally.

**Confirmed intentional exclusions (do not add back):**
- **No repeatable job-history screen.** An earlier design had a repeatable full-time job history screen feeding a "last 15 years" weighting rule in Thread 1. That rule is no longer needed — the Career Highlight Stories (Section D) already capture last-15-years signal narratively. Current job title stays a single plain-text field (Q1 above), not a repeatable history list.
- **No upskilling-tolerance question.** An earlier design had a question here whose answer fed a runtime gate in Thread 2 (skip the gate if tolerance was already known). That question is intentionally removed. It's replaced by a flat, rule-based cutoff applied later at the verification/research stage: **any role requiring more than 3 months of upskilling is automatically excluded.** This is downstream logic, not an intake field — do not add an upskilling question back into this form.

### Section D — Career Highlight Stories (NEW — does not exist in old form)

Four separate screens, one per story, labeled sequentially:
- **Career Highlight Story 1**
- **Career Highlight Story 2**
- **Career Highlight Story 3**
- **Career Highlight Story 4**

Each page asks the same set of four sub-questions (4 stories × 4 sub-questions = 16 text fields total):

1. *Think back through the last 15 years of your career. In one of your jobs, identify a specific task, project, responsibility, or moment where the work came naturally to you. This should be a time when you were at your best and felt deeply satisfied. Make sure to include any details that are important to you.*
2. *What got you involved in this task, project, responsibility, or moment?*
3. *What specific actions did you take?*
4. *What about those actions were particularly enjoyable to you?*

Each field is open text entry (long-form textarea). No length constraints specified — do not impose arbitrary min/max unless Todd requests it. Progress indicator should show "Story X of 4" so the client knows how much of this section remains. **Minimum required to submit: at least 3 of the 4 stories fully completed** (all 4 sub-questions answered for that story). The 4th story may be left thin or blank — do not hard-block submission on all 4 being complete.

### Section E — Account, Session & Edit Handling (NEW/REVISED — Mission Control iframe architecture confirmed)

**Mission Control iframe — confirmed, not standalone.** The intake form lives inside an iframe within Mission Control, and that iframe has **three distinct states** depending on where the client is in the pipeline:

1. **Form state** — client logs in and fills out the intake form (this spec, Sections A–D, F).
2. **Waiting state** — after submission, a screen reading *"Waiting on your coach to complete your Career Compass."* Shown while Todd/the pipeline works through matching, validation, research, and report generation.
3. **Ready state** — once the PDF is generated and uploaded to Google Drive, a screen titled *"Your Career Compass results are ready"* with a download button linking to the Drive file.

This build (Priority 1) only needs to implement **state 1** fully. States 2 and 3 depend on downstream phases that don't exist yet (gate decisions, PDF, Drive upload) — build the iframe/state-switching mechanism now if reasonable, but the content of states 2 and 3 can be simple placeholders until those phases land. Flag to Todd if state-switching architecture is easier to build once vs. retrofitted later.

**Authentication: magic link, tied to the same email as Mission Control.**
- Client is already logged into Mission Control before reaching this iframe. They use the **same email address** to authenticate into the intake form via magic link.
- **No complex identity linking needed.** Email is the shared identifier across Mission Control and Career Compass — do not build a separate `user_id`-to-magic-link-account reconciliation system. Confirmed simple by design: one email, used consistently, is the join key.
- This is still a real auth component (magic-link email delivery, token/session handling) — treat as its own build piece. Flag in plan mode: what auth provider/library, how magic-link emails get sent, token expiry handling, and how the iframe hosting configuration (`X-Frame-Options`/CSP) needs to be set to allow framing inside Mission Control.

**Cross-device resume.**
- Client can close the form, return later on a different device, log in again via magic link (same email), and pick up where they left off. `localStorage` remains a same-session safety net only, not the primary resume mechanism.

**Mid-session navigation vs. post-submit editing — two different things:**
- **Mid-session (not yet submitted):** client can freely navigate backward and change answers, no restriction.
- **Post-submit editing:** once a client has submitted, their intake is "locked." If they need to change an answer afterward, an **admin (Todd) must unlock the submission** before the client can edit it again. Confirmed, needed feature — has come up with real clients before. Requires a locked/unlocked state on each submission record, and an admin action to toggle it.

**Mobile support:** the form must work well on a phone — confirmed requirement, not optional. This affects screen layout choices throughout, especially the functions category-walk screens.

### Section F — Review & Submit

- Summary screen showing: top 5 functions, top 5 values, all 8 requirement answers, all 4 Career Highlight Stories (each with its 4 sub-answers)
- Client can go back and edit any section before submitting
- Confirmation screen after submit

---

## 4. Data & Submission

On submit, per existing architecture pattern (confirmed in MEMORY.md, carries forward):
1. Write full submission to "Intake Submissions" tab in Master Data Sheet (ID: `1hgBOWdDzMzEvun5Vv0CxU7AKRAToohgnSDABQ1jdMpg`)
2. Fire webhook to orchestrator with full client payload

New columns needed vs. old spec (old spec had: function selections, value selections, 8 work preference answers, run ID):
- Add: 4 Career Highlight Stories × 4 sub-questions each = 16 text fields (e.g. `story1_moment`, `story1_involvement`, `story1_actions`, `story1_enjoyment`, repeated for stories 2–4)
- Functions data shape changes — old was flat select/top10/top5/not; new needs to preserve category grouping through Phase 1, then flatten for Phases 2–4, and must also capture the **1–5 rating value** per item, not just selection state
- Add: submission lock state (locked/unlocked) — set to locked on submit, only an admin action flips it back to unlocked
- Add: stable client ID tied to the magic-link account — this ID is what later build phases (gate decisions, top 5 roles, PDF, Google Drive file link, Circle DM status) will attach to. Design this now so those phases can simply reference an existing client record rather than each one inventing its own storage shape.

`localStorage` should preserve state if the client closes the tab mid-form as a same-session safety net, but the **primary resume mechanism is the magic-link account** — a client must be able to close the form entirely, come back days later on a different device, log in via magic link, and resume exactly where they left off.

---

## 5. Open Items Before/During Build

These need Todd's input — flag rather than assume:

1. **`functions.json` and `values.json` build** — these files have never been created (confirmed via repo audit — greenfield, not a rebuild). Build them from the full hierarchy and ~90-value list gathered in the planning conversation (Todd has confirmed the full text — pull from that session or ask Todd to re-supply for direct use as build source).
2. **Rating UI pattern for Phase 2** — one long scroll vs. paginated; Claude Code should propose, not silently decide, since this affects client experience on what's already a long form.
3. **Salary field structure** — currently open text; confirm with Todd whether to keep as-is or convert to structured input.

Career Highlight Stories (Section D) are now fully specified — no longer an open item.

Per project rule: do not silently resolve these — surface them in plan mode and get Todd's answers before finalizing that portion of the build.

---

## 6. Scope for This Build

**Revised build sequence (confirmed by Todd, supersedes earlier ordering):**
1. **Intake form + minimal admin view** ← this spec covers both
2. Report PDF template/shell
3. Deep research / market validation, with its gate
4. Circle DM delivery + full admin dashboard (client table, top 5 column, Drive-linked PDF download)

**In scope for this build:**
- The full intake form as specified in Sections A–F
- A **minimal admin view**: Todd can see a list of clients who have submitted, open any one submission to view their full answers (functions, values, requirements, all 4 stories), and unlock a locked submission for client editing. This is intentionally scoped down — no top-5 column, no PDF download button, no Circle DM trigger yet, since none of that data exists until later phases. Build it so those columns can be added later without restructuring the underlying client record (see stable client ID note in Section 4).

**Downstream coupling this build creates (not this build's job to fix, but worth knowing):** The existing orchestrator's Step 0.3 currently *computes* a functions top-5 by summing per-story ratings from an old form shape that no longer exists under this spec (client now selects top 5 directly in Phase 4). Step 0.3's current logic will need to be rewritten to consume the client-selected top 5 directly once that phase of work begins — this is not a reason to change anything in this spec, which stands as specified, but Todd should know Step 0.3 is now stale the moment this form ships real data in the new shape.

**Explicitly out of scope for this build (later phases):**
- Role matching, fixed master role list, Gates 1–4 logic — Todd will run this manually for real clients using the new intake data while these are being built
- Report PDF generation
- Deep research / Perplexity integration
- Google Drive upload of the finished PDF, and the Drive-linked "Download" button in the full admin dashboard
- Circle DM delivery (Gate 9 in the existing 9-gate pipeline — already planned, confirmed still in scope for the project overall, just not this phase)
- Any change to the existing writeback Python scripts (`prepare_writeback.py`, `write_all_sheets.py`, `write_dtd_to_sheets.py`, `write_client_titles.py`) — these must not change

**Why this sequencing:** Todd wants clients using the new, richer intake as soon as possible. Once the form and minimal admin view exist, he can view submissions and do the matching/validation/research manually — the same process as today, just fed by better intake data — while the rest of the pipeline gets built underneath that workflow.

---

## 7. Error States — Must Be Specified, Not Discovered

The spec above describes the happy path. These failure cases are real and must have defined behavior. Where the right answer isn't obvious, propose an approach to Todd rather than picking silently.

**Auth / session:**
- Magic link email fails to send, or lands in spam — what does the client see? Is there a resend, and is it rate-limited?
- Magic link expires before the client clicks it
- Session expires mid-form (this is the costly one — a client 40 functions into rating should never lose that work; confirm the save-on-progress strategy handles it)
- Client opens the same in-progress form in two tabs or on two devices simultaneously

**Submission:**
- Google Sheets write succeeds but webhook fails, or vice versa — these must not silently half-complete. Define which is authoritative and how a partial submit is detected and recovered.
- Duplicate submission (client double-clicks, or resubmits after an unlock)
- Submission attempted while the record is locked

**Iframe / Mission Control:**
- Form loaded outside the Mission Control iframe (directly, or embedded elsewhere) — allowed or blocked?
- Iframe fails to load, or CSP/`X-Frame-Options` blocks it

**Validation edges:**
- Client rates fewer than 10 functions at 4–5 (spec'd: send back — confirm the UX doesn't feel punitive)
- Client checks fewer than 10 values
- Client completes fewer than 3 of 4 stories
- Client checks an unusually large number of functions (e.g. 80+) and faces a very long rating phase — is there a nudge?

Every error state needs UI, not just a console error. Note any case where you believe no UI is needed and why.

---

## 8. Required Documentation Artifacts

Per the Field Guide's frontend-handover pattern, produce these in `docs/` as part of this build — not afterward. They're what makes phases 2–4 cheap instead of archaeological.

**`docs/architecture.md`** — project overview, tech stack with versions, annotated directory tree, component map (which are stateful vs. presentational), state management approach and how state flows across the multi-phase form, route map.

**`docs/api-contracts.md`** — this is the important one, because the orchestrator consumes it:
- **Data models as typed interfaces**, with a comment on every field. Especially: the functions record (must carry category grouping, selection state, *and* 1–5 rating), the values record, the 16 story fields, lock state, and the stable client ID.
- **Webhook contract** — exact payload shape fired on submit, with a realistic example.
- **Sheets write contract** — exact columns written to the Intake Submissions tab, in order.
- **Auth expectations** — what the magic-link flow issues and what downstream consumers can rely on.

**Environment variables** — every one needed, with description and example value. Reuse `CAREER_COMPASS_WEBHOOK_SECRET` (already exists in the old repo's `.env.example`) rather than inventing a new secret.

**Known gaps** — anything deliberately left unbuilt, so phase 2 doesn't mistake a decision for an oversight.

---

## 9. Claude Code Entry Point & Verification

**Entry:** Start in plan mode on this file. Interview Todd on Section 5's open items and anything in Section 7 where the right behavior is unclear. Propose the component/state architecture for the branching functions flow (Section A) and the auth/iframe architecture (Section E). Get plan approval before writing code.

**Verification — run the `career-compass-v2-verification` skill before any completion claim.** That skill governs the general standard; the items below are the intake-form-specific checks it should cover here:

1. **Run the actual flow in a browser**, start to finish: all 19 category screens, the rating phase, both narrowing steps, values track, requirements, all 4 stories, review, submit. Not a unit test standing in for the flow — the real thing.
2. **Show real output.** Paste the actual Intake Submissions row and the actual webhook payload. Do not describe what they should contain.
3. **Confirm the data shape matches Section 4 exactly** — 1–5 rating values present per function, all 16 story fields, lock state set, stable client ID present.
4. **Test the resume path for real:** start a form, close it, log back in from a different browser/session, confirm state restored.
5. **Test at least three error states from Section 7 deliberately** — including the mid-form session expiry, since that's the one that loses the most client work.
6. **Test on an actual phone**, not just a narrowed desktop window.
7. **State plainly what you verified and what you didn't.** Unverified is not the same as working.

**Manual before automated:** the minimal admin view must be used by hand — Todd opening a real submission, unlocking it, client editing it — before any of it is treated as reliable.

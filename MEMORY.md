# Career Compass v2 — MEMORY.md

*Last updated: [date of first session]*

This file holds **confirmed** facts, decisions, and gotchas. It is authoritative — read at the start of every session and treated as settled.

Two ways things get in here:
1. **Todd says "log that"** — captured immediately, directly into the right section below.
2. **Promoted from `SESSION_LOG.md`** at a 5-session review — raw observations get examined with Todd, and only what he confirms graduates into this file.

Nothing lands here on Claude Code's inference alone. Unconfirmed observations belong in `SESSION_LOG.md`.

Keep this file short. If it's getting long, that usually means something belongs in `CLAUDE.md` (if it's behavioral) or should be pruned (if it's stale).

---

## Current Status

**Phase:** 2 — Report PDF template (in progress)
**State:**
- **Phase 1 (intake form + minimal admin view): built and deployed.** Live in production at `career.ministrytomarketplace.co`. Supabase-verified (writes and RLS confirmed against the live project).
- **Phase 2 (report build): in progress** on branch `phase-2-report`. Report skill scaffolding and the standalone graph generator are committed but not yet verified.

*(Status confirmed by Todd, Sept 4 2026.)*

---

## Decisions Made

*Decisions that are settled and shouldn't be re-litigated. Add the reasoning, not just the conclusion.*

- **New repo, not a folder in the old one.** `career-compass-v2` is deliberately separate from `github.com/launch-point/career-compass` so there's no need to reason about which files are relevant — everything here is in scope. (Sept 2026)
- **Client picks their own top 5 functions.** In v1's design the system computed a top 5 by summing ratings. In v2 the client selects it directly in Phase 4 of the functions track. Any downstream logic must consume the client's selection, not recompute it. (Sept 2026)
- **Email is the join key between Mission Control and Career Compass.** Clients are already logged into Mission Control before reaching the intake iframe; they use the same email for the magic link. No separate identity reconciliation system. (Sept 2026)
- **No upskilling-tolerance question in intake.** Replaced by a flat downstream rule: any role requiring more than 3 months of upskilling is excluded at the validation stage. (Sept 2026)
- **No job-history screen.** The four Career Highlight Stories capture last-15-years signal narratively. Current job title is a single text field. (Sept 2026)
- **Google Drive upload + Mission Control linking deferred to Phase 4.** Do not design or build it during phases 1–3. Interim requirement: every phase writes output tied to the stable client ID in a predictable, loggable way so phase 4 wires existing IDs together rather than retrofitting. (Sept 2026)

---

## Open Questions

*Things that need Todd's input before they can be resolved. Remove once answered — move the answer to Decisions.*

- Rating UI pattern for functions Phase 2 (one long scroll vs. paginated) — propose to Todd, don't decide unilaterally
- Salary field: keep as open text or convert to structured number input?

---

## Technical Notes & Gotchas

*Things that cost time to figure out once and shouldn't cost time again.*

- **A fresh clone has no venv and no `reports/` — both gitignored by design.** `.claude/skills/career-compass-report/.venv/` and `reports/` are both in `.gitignore`, so any new clone gets the report skill's scripts (`SKILL.md`, the three `.py` files, `assets/`, `fixtures/`) but no Python interpreter and no client artifacts — no research markdown, judgment file, generated JSON, or PDF. Verified directly on a fresh remote clone, Sept 5 2026. **Practical rule: use a remote/cloud session to inspect or structurally verify the pipeline; run the real client build locally.** Note the two halves of that rule have different causes — the missing venv is only setup friction (build it per SKILL.md's pins and it's gone), whereas what actually makes remote output non-deliverable is the egress policy blocking the brand-font host (`github.com/google/fonts` → 403 → silent DejaVu fallback; SKILL.md Known Gaps, verified Sept 2026). That second one is a property of the environment's network policy, not of this repo, and it would flip if the font host were ever allowlisted. (Sept 5 2026)
- **matplotlib: `scatter(..., transform=ax.transAxes)` still autoscales the axes' *data* limits from the raw offset values.** It does not "opt out" of data space the way it looks like it should. Consequence: on an `axis("off")` legend axes, those scatter calls silently collapsed the data limits to `(-0.055, 0.055)`, and a sibling `text()` left in data coords at `y=1.0` was flung to figure-fraction y=3.07 — three figure-heights above the canvas. `bbox_inches="tight"` then grew the saved PNG to ~20in tall to contain it. **Rule: on any axes used purely for layout, pin `set_xlim(0,1)`/`set_ylim(0,1)` and give *every* artist an explicit `transform=`. Mixing coordinate systems on one axes is the trap.** Cost a full diagnostic cycle in the Phase 2 graph generator; regression fixture at `.claude/skills/career-compass-report/fixtures/`. (Sept 4 2026)

---

## Corrections Log

*When Todd corrects something, capture it here so the same mistake doesn't repeat. Include what was wrong and what the right behavior is.*

- (empty — add as they occur)

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

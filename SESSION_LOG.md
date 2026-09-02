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

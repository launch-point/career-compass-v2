---
name: career-compass-v2-session-capture
description: "Captures decisions, corrections, and observed patterns from Career Compass v2 work sessions so they compound instead of evaporating. Has two triggers: (1) automatically at the end of every session, log what happened; every 5th session, stop and review noticed patterns with Todd before writing anything permanent. (2) Any time Todd says 'log that' (or clearly equivalent phrasing), capture the correction immediately without waiting for the review cycle."
metadata:
  author: Launch Point
  version: '1.0'
---

## When to Use This Skill

Two distinct triggers — they behave differently. Do not merge them.

**Trigger A — End of every session (passive logging).** Run this automatically as a session wraps up. Todd does not need to ask.

**Trigger B — Todd says "log that" (or similar explicit instruction).** Run immediately, any time, mid-session. Do not wait for session end or the 5-session mark.

## Mechanism A — Passive Logging + 5-Session Review

### Every session (sessions 1–4, and every session that isn't a multiple of 5)

At session end, append to `SESSION_LOG.md` — the holding area for raw, unconfirmed observations:
- Decisions made this session
- Anything Todd corrected, and what the correction was
- Anything that didn't work as expected
- Patterns you're starting to notice (even tentative ones)

`SESSION_LOG.md` is append-only evidence, not settled fact. Do not write these into MEMORY.md yet, and do not treat prior `SESSION_LOG.md` entries as authoritative when starting a session — MEMORY.md is the trusted file; the log is raw material awaiting review.

Each entry should be dated and note the session number.

### Every 5th session (session 5, 10, 15, ...)

Count sessions across all Career Compass v2 work — not scoped to any single phase or workflow. At the start (or end — whichever fits the session naturally) of every 5th session, read the `SESSION_LOG.md` entries since the last review and run a structured review with Todd:

1. **"Here's what I've noticed"** — summarize the raw observations logged since the last review.
2. **"Here's what I think I'm learning"** — surface any pattern across those 5 sessions, stated as a hypothesis, not a fact.
3. **"Here are the patterns and decisions"** — list anything that looks like a settled decision or a recurring correction.

Ask Todd to confirm, correct, or reject each item. **Only what Todd confirms gets promoted into MEMORY.md.** Unconfirmed observations stay in `SESSION_LOG.md` for more evidence, or get struck through as rejected — do not promote your own inference to permanent memory without Todd's sign-off.

After the review, mark the reviewed range in `SESSION_LOG.md` (e.g. "— reviewed [date], sessions 1–5 —") so the next review knows where to start.

## Mechanism B — Explicit "Log That"

When Todd says "log that" (or unambiguously equivalent — e.g. "remember this," "write that down"):

1. Identify exactly what Todd wants logged from the immediate context.
2. Write it **directly to MEMORY.md** right away, in the correct section (Decisions Made, Open Questions, Technical Notes & Gotchas, or Corrections Log, per MEMORY.md's structure). This path bypasses `SESSION_LOG.md` entirely.
3. Confirm back to Todd what was written, briefly.

This path skips the review cycle — Todd is issuing the correction directly, so no separate confirmation step is needed before it becomes permanent.

## Where Captured Items Go

Match to MEMORY.md's existing sections:
- Settled, reasoned decisions → **Decisions Made**
- Things still needing Todd's input → **Open Questions**
- Hard-won technical facts → **Technical Notes & Gotchas**
- Mistakes made and the correct behavior going forward → **Corrections Log**

## Gotchas

*(Empty by design — fills in as real failure points are hit. Do not pre-populate.)*

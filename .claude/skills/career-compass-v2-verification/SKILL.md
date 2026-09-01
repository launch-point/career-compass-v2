---
name: career-compass-v2-verification
description: "Verifies a completed piece of Career Compass v2 work against its spec before it can be marked done. Use this skill before telling Todd that any build task, screen, phase, or feature is complete — including intake form sections, the admin view, and later phases (report template, research/validation, Drive/dashboard). Do not report something as finished without running this skill first."
metadata:
  author: Launch Point
  version: '1.0'
---

## When to Use This Skill

Trigger this skill any time you are about to tell Todd that something is done — a screen, a phase, a bug fix, a feature. This is not optional or occasional; per Launch Point's standing rule, no output-producing work gets reported as complete without verification first.

Do not use this skill for planning, discussion, or answering questions — only before a completion claim.

## What "Verified" Means Here

Verified means you observed the real behavior yourself. It does not mean you reasoned about what the code should do, or read the code and concluded it looks correct. Per CLAUDE.md's Verification Standard: never describe a result you haven't actually observed.

## Procedure

1. **Identify what's being claimed done.** Name the specific screen, phase, or feature.

2. **Run the actual thing, not a proxy for it.**
   - For UI work: open it in a browser and walk the real flow a client would take, end to end for that section — not a shortcut through it.
   - For data/backend work: run it and capture the actual output (the real payload, the real sheet row, the real file) — not a description of what it should contain.

3. **Check the observed behavior against the build spec**, section by section for whatever was built. Note any mismatch, however small.

4. **Check relevant error states**, per Section 7 of the build spec, if any apply to what was built. Don't skip this because the happy path worked.

5. **Confirm file edits actually landed** — mtime advance and a targeted grep for the specific change, per CLAUDE.md.

6. **Report plainly:**
   - What you verified, specifically (not "the form works" — "ran all 19 category screens, submitted, confirmed the Sheets row and webhook payload match Section 4's data shape")
   - What you did NOT verify, if anything
   - Any mismatch found against the spec, and whether you fixed it or are flagging it for Todd

## Gotchas

*(Empty by design — this section fills in as real failure points are hit during the build. Do not pre-populate.)*

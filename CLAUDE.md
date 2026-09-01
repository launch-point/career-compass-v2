# Career Compass v2 — CLAUDE.md

## Identity

This repo is the ground-up rebuild of Career Compass, the career assessment tool Launch Point uses to help ministry leaders identify realistic next-career roles.

The v1 system produced a ~100-page report with 20 job matches. Clients found it overwhelming, and many matched roles were too niche to actually exist in the market — technically good fits, practically un-findable. v2 fixes this: a richer intake, a curated master list of real roles, Todd's expert judgment as a gate, and a focused 5-role report.

You are building this system. Todd is the decision-maker on every design and scope question.

## Memory System

Three files, three different trust levels. Keep them distinct.

| File | What it is | Trust level |
|---|---|---|
| `CLAUDE.md` | Behavioral rules. Prescriptive, stable. | Authoritative — always follow |
| `MEMORY.md` | Confirmed facts, decisions, gotchas. | Authoritative — read at start of every session |
| `SESSION_LOG.md` | Raw observations awaiting review. | **Not authoritative** — evidence only |

At the start of every session, read `MEMORY.md`. Use what you find. Don't announce it. Do **not** treat `SESSION_LOG.md` contents as settled — that file holds unconfirmed observations, and reading them back as fact is exactly the failure it exists to prevent.

**Where things go:**
- Prescribes behavior (always, never, before X do Y) → `CLAUDE.md`
- Confirmed fact that could change (decisions, status, gotchas, paths) → `MEMORY.md`
- Unconfirmed observation or tentative pattern → `SESSION_LOG.md`
- Unsure → suggest which file and ask Todd.

**Capture is not optional or ad-hoc.** Use the `career-compass-v2-session-capture` skill. It has two triggers: passive logging at the end of every session (with a structured review with Todd every 5th session), and immediate capture whenever Todd says "log that." Corrections that don't get captured get repeated — that's the whole point.

## Non-Negotiables

- **Nothing ships without Todd's explicit approval.** This is a global Launch Point rule, not specific to this repo. No "low-stakes" or "narrow exception" framing grants authority to skip it. This includes deploying, sending anything to a client, or writing to any production data store.
- **Plan before building.** Start in plan mode for any non-trivial work. Interview Todd on anything ambiguous rather than guessing. A wrong assumption caught in planning costs minutes; caught after building, hours.
- **Verify before claiming done.** Never describe a result you haven't actually observed. Confirm every file edit via mtime advance and targeted grep. Run the code and show real output — do not summarize what you believe the output would be. Fabricated or described-rather-than-shown results are a known, previously-observed failure mode here.
- **Present the full proposed fix before editing.** When you identify a problem, show Todd the complete proposed change and get approval before touching the file. No silent fixes, even small ones.
- **Test manually before automating.** Never schedule or automate a process that hasn't been run by hand successfully first.
- **Ask when unsure.** Don't guess. Say so.

## Forbidden Locations

Two other things share the "Career Compass" name. Never read from or write to either:

| Location | What it is |
|---|---|
| `github.com/launch-point/career-compass` | The original repo. Contains stale design docs for a never-built version. Not relevant. |
| `/Users/toddlinder/Documents/Claude/Projects/Career Compass/` | **Todd's live, in-use manual workflow** (v17.3 skill system) for real clients today. Actively running production. Never touch. |

Everything you need is in this repo.

## Build Sequence

Work in this order. Do not start a later phase before Todd confirms the prior one is done.

1. **Intake form + minimal admin view** — see `docs/intake-form-build-spec.md`
2. **Report PDF template**
3. **Deep research / market validation** (includes a research-review gate)
4. **Google Drive upload + Circle DM + full admin dashboard**

Between phases 1 and 3, Todd runs role matching and research manually. The system must be useful before it is complete.

## Human Gates

This system is designed around Todd's judgment, not around removing it. Four gates:

| Gate | What happens |
|---|---|
| 1 | Todd reviews the client profile and picks ~10 likely roles from the master list |
| 2 | System validates those 10 (availability, salary, location); Todd narrows to 5 |
| 3 | Todd reviews the deep research before it goes into the report |
| 4 | Todd approves the finished report before the client sees it |

Gates are also the training mechanism. Log Todd's reasoning at each one — not just the outcome. Over time these decisions teach the system to reason the way Todd does.

Do not propose removing a gate. Todd decides that, and not before a long track record of unedited approvals.

## Verification Standard

**Run the `career-compass-v2-verification` skill before telling Todd anything is done.** Not occasionally — every time you're about to make a completion claim.

The standard it enforces:

1. Run it. Show the actual output, not a description of it.
2. Confirm file edits landed — check mtime, grep for the specific change.
3. Trace every claim you make back to real file content.
4. For UI work: open it in a browser and walk the actual flow.
5. State plainly what you verified and what you did not.

If you can't verify something, say that instead of implying it works.

## Skills

| Skill | Fires when... |
|---|---|
| `career-compass-v2-verification` | Before claiming any build task, screen, or phase is complete |
| `career-compass-v2-session-capture` | End of every session; every 5th session triggers a review with Todd; also any time Todd says "log that" |

Both skills have a Gotchas section that starts empty by design. Add to it only when something actually goes wrong — don't pre-populate with imagined failure modes. Those accumulated gotchas are where the real value builds over time.

## Commits

- Scope commits with explicit pathspecs. Don't bundle unrelated changes.
- Use temp-file commit messages to avoid accidental inclusion.
- Commit working increments; don't leave large amounts of unverified work uncommitted.

## References

| File | Read when... |
|---|---|
| `MEMORY.md` | Start of every session |
| `SESSION_LOG.md` | Only during a 5-session review — not at session start |
| `docs/intake-form-build-spec.md` | Building or modifying the intake form |
| `docs/architecture.md` | Understanding current structure (create during phase 1) |
| `docs/api-contracts.md` | Any work touching the webhook or data shape |

# Career Compass v2 — Report Build Spec (Graph + 5-Role Adaptation)

*Status: Ready for Claude Code. Builds on the existing, working `career-compass-report` v15 skill (uploaded — full `SKILL.md`, `report_template.py`, and brand assets already provided). This is an adaptation of a proven system, not a from-scratch build.*

---

## 1. Context

The existing v15 skill produces a 20-role, 3-page-per-role branded PDF from a structured JSON file, using a Python/ReportLab template (`report_template.py`). It's fully working and battle-tested — brand colors, typography, two-pass TOC page numbering, sanitization, all proven.

Two changes are needed for Career Compass v2:
1. **Role count: 20 → 5.** No "reserve" roles, no honorable mentions — exactly 5 full entries, full stop.
2. **New: a function/seniority graph**, in two display modes, inserted into the report for the first time.

Per Todd's sequencing decision: **build and verify the graph as a standalone image first, independent of the PDF.** Only integrate it into `report_template.py` once the graph itself is confirmed correct.

---

## 2. Data Input — Near-Term Approach vs. Eventual Pipeline

**These are two different things. Don't conflate them.**

### 2.1 Near-term (this build): markdown → JSON, done by this skill

For now, Todd will paste or provide a **markdown file containing all 5 roles' research** — the deep research output — directly to Claude Code. The report-build skill's job, **new work not present in the uploaded v15 `SKILL.md`**, is to **parse that markdown and build the required JSON itself** (matching the JSON schema documented in the uploaded `SKILL.md`'s "JSON Schema (v15 fields)" section), rather than assuming the JSON already exists.

This is a real gap versus the existing skill: v15's prerequisites section assumes `{client}_client_report_data.json` is already produced by a separate skill (`career-compass-extract-and-render`). That skill is not part of this build. **This report-build skill needs to absorb that markdown-to-JSON parsing step itself**, at least for now — Claude Code should propose how it will reliably extract the structured fields (function alignments, value alignments, day-to-day breakdown, salary, etc.) from Todd's markdown, and flag if the markdown's format needs any consistent structure/headers to parse reliably.

**Todd's stated priority: get this part working now.** The eventual live pipeline (2.2) is documented here for context and to keep this spec forward-compatible, but is explicitly **not being built in this phase**.

**"Your Job Search Profile" page (existing skill content — top 5 functions, top 5 values, work preferences):** for now, this should also be populated from Todd's pasted markdown/manual input, the same as the role data — not pulled live from the intake app's Supabase data. Wiring the real intake submission into the report automatically is part of the eventual pipeline (2.2), not this phase. Flag to Todd if the existing v15 skill's approach to this page assumes a different data source that needs adapting.

### 2.2 Eventual pipeline (not this build — context only, do not build)

For future reference, so this spec doesn't contradict later design work: the intended full flow is intake (Supabase) → Todd + Claude Code work through Gate 1 (pick ~10 roles) conversationally → Sonnet validates → Todd narrows to 5 (Gate 2) → Perplexity deep research on those 5 → a review gate → Todd triggers this report-build skill → the skill builds the JSON from that research and generates the PDF. None of the Gate 1/2/research/Perplexity automation is in scope here — only the final step (JSON-building + PDF generation) is being built now, and for now its input is a pasted markdown file rather than a live pipeline handoff.

### 2.3 This Is a Skill, and Triggering It Is the Human Gate

This report-build capability should be a **standalone Claude Code skill** — Todd wants a simple trigger (e.g. a slash command or short phrase, added to the existing `career-compass-report` skill's trigger list) that starts the whole process: parse the provided markdown → build the JSON → determine graph placement → generate the graph → generate the PDF.

**Triggering the skill is itself the human gate — not a step that happens before or after a separate approval.** When Todd invokes it with a markdown file, that act already represents his deliberate decision that the research is complete and ready to become a report. The skill does not need an additional internal "are you sure?" pause after being triggered. It should, however, still show Todd the generated JSON and its graph-placement reasoning as part of doing the work (per Section 7's verification requirements) — that's transparency into what it did, not a second gate blocking progress.

**Critical design requirement: this skill must work independently of the rest of the Career Compass v2 pipeline.** It must not depend on Supabase, the intake app, Gates 1/2, or the Perplexity research automation existing, running, or being healthy. Its only real input requirement is a markdown file containing role research, from any source. This means Todd can generate a report for any client, at any time — including entirely outside this system, using research gathered some other way — as long as a markdown file exists. Do not introduce any code path that assumes the rest of the pipeline is present or that fetches data from Supabase as part of this skill.

---

## 3. Role Count Change (20 → 5)

- `report_template.py`'s role-rendering loop should run exactly 5 times, not 20.
- TOC's two-pass page-number build must still function correctly at the new length — verify real page numbers land correctly, not just that the loop runs without erroring.
- Remove any reference to a 21-30 reserve pool — that concept doesn't apply to this build; there is no reserve, no Sheets writeback of extra ranked roles.
- Everything else in the existing skill (cover, TOC, How to Read, What to Do, Your Job Search Profile, the 3-page-per-role structure, brand colors, fonts, sanitization) stays exactly as-is unless the graph integration (Section 4) requires a placement change.

---

## 4. The Graph — Build and Verify Standalone First

### 4.1 Structure

- **X-axis: 9 fixed business functions**, always in this order: Product, Marketing, Sales, Customer Experience, Operations, Human Resources, Finance and Accounting, Legal, Communications. This list is fixed — not dynamically generated per client or per role.
- **Y-axis: 3 seniority bands**, bottom to top: Specialist, Integrator, Strategist.
- Each of the client's 5 roles is plotted as exactly one point, positioned at the intersection of its primary function (one of the 9) and its seniority level (one of the 3).

### 4.2 Two Display Modes

**Mode 1 — Overview graph:**
- All 5 roles plotted together on the same 9×3 grid.
- Each dot is numbered 1–5 (matching the roles' rank order in the report).
- A legend (separate from the graph itself) maps each number to its full job title, listed in rank order.
- Placement in the PDF: **after Table of Contents + How to Read This Report + What to Do With This Report, and before the first role entry.** This becomes its own page (or pages, if the legend needs its own space) — not folded into "Your Job Search Profile."

**Mode 2 — Per-role graph:**
- Same 9×3 grid, all 5 roles still shown for context.
- The current role's dot is enlarged and colored (using its rank number, styled distinctly).
- The other 4 roles' dots are small and grayed out.
- **No label, no legend on this smaller version** — the surrounding role-section context makes it clear which role is highlighted.
- Placement within each role's existing 3-page layout: **top-right of Page 1**, alongside the existing header (rank/title/alt titles/salary) and above the Function Alignment tables. Claude Code should confirm this doesn't crowd or conflict with the existing header content at that position — flag if the graph's size needs adjusting to fit cleanly, rather than shrinking the header content to make room without asking.

### 4.3 Dot Styling

- Each dot displays its rank number inside it (not the job title as an on-graph label).
- Job titles live only in the separate legend (overview mode) or are implied by context (per-role mode).

### 4.4 Data Source & the Conversational-Correction Workflow

This is the most important design requirement, and it should shape the implementation choice directly:

**Claude Code determines each role's function and seniority placement itself, from the role's title and research/context** — Todd will not be supplying `{function, seniority_level}` values as a separate input. When Claude Code has a role like "Director of Brand Strategy," it should use its own judgment (informed by the role's title, alt titles, day-to-day responsibilities, and any other research context already available for that role) to intuitively place it at the correct intersection of one of the 9 functions and one of the 3 seniority levels.

**Todd wants to move a role's position on the graph by describing the change in natural language to Claude Code afterward** (e.g., "move the Director of Brand Strategy role from Integrator to Strategist") — this is a correction to Claude Code's initial placement, not the primary input mechanism. Todd is reviewing and adjusting Claude Code's judgment call, not feeding it the answer from scratch.

**Rank/legend numbering must match the role's position elsewhere in the report** — the role Todd and Claude Code have ranked #1 in the report (and in the role-entry ordering) is dot #1 on the graph, using the same number throughout the TOC, the role entries, and the graph legend. No separate or independent numbering scheme for the graph.

This means:
- The graph must be **regenerable from a small, clean, structured data source** — something like a list of `{role_title, rank, function, seniority_level}` objects, one per role. Claude Code populates this itself as part of building each role's entry (see Section 5, item 3 for where this data should live), using its own judgment on function/seniority placement.
- Claude Code's job when Todd requests a correction: translate the natural-language instruction into an edit of that structured data (change the `function` or `seniority_level` value for the named role), then **regenerate the graph image from scratch** — not hand-edit pixels or attempt to patch an existing image.
- The graph does **not** need to be interactive or draggable in any UI sense. It's a static image, regenerated on request.
- Since initial placement is Claude Code's judgment call rather than a known input, **flag any role where the function or seniority level feels genuinely ambiguous** (e.g., a hybrid role that could reasonably sit at two seniority levels) rather than silently picking one — this is exactly the kind of judgment call Todd should get visibility into before approving the graph, not after.

### 4.5 Implementation Approach

**Generate as a standalone image first** (per Todd's explicit sequencing decision), independent of PDF embedding:
- Use a Python charting library (matplotlib is the natural fit, given `report_template.py`'s existing Python/ReportLab stack) to render the 9×3 grid, dots, numbers, and axis labels as an image file (PNG or similar).
- This image should be inspectable and approvable on its own — Todd should be able to look at just the graph, request corrections, and see it regenerate, before it's ever inserted into a PDF.
- Match the existing brand design system where sensible: brand colors (`#CF631D` orange, `#343432` charcoal, `#CCD0C8` sage), function colors (the 5 listed in the existing skill), DM Sans/Inter typography if the charting library can reasonably match fonts. Propose to Todd where exact brand-matching isn't practical in a charting library, rather than silently approximating.

**Only after the graph is confirmed correct in isolation:** integrate it into `report_template.py` as an embedded image, the same way the existing logo images (`Orange.jpg`, `Black-2.jpg`) are already embedded — this is a proven, working pattern in the existing template, not new territory.

---

## 5. Open Items — Resolve With Todd, Don't Decide Silently

1. **Image format and resolution** for the graph (PDF embedding quality matters) — Claude Code's technical call to propose, not something Todd needs to specify.
2. **How brand fonts/colors translate into a charting library** — flag any place matplotlib (or whatever's used) can't cleanly match the existing design system, rather than silently approximating and hoping it looks right.
3. **The data source format** for the 5 roles' `{function, seniority_level}` values — where does this live? A small JSON file alongside the existing `{client}_client_report_data.json`? A new field within that same file? Propose an approach; this should integrate cleanly with the existing JSON schema rather than becoming a second, disconnected data source Todd has to keep in sync by hand.
4. **Output file naming/location:** the existing skill outputs `{first}_{last}_career_compass_report.pdf` to "the workspace." Confirm what this means in the `career-compass-v2` repo context — propose a sensible location (e.g., a `reports/` or `output/` directory) rather than assuming the original skill's environment still applies.

---

## 6. Explicitly Out of Scope for This Phase

- Google Drive upload of the finished PDF (deferred to Phase 4, per existing project memory).
- The Circle DM to clients (deferred to Phase 4).
- Any change to how the 5 roles themselves get selected, researched, or validated (Gates 1–3) — this spec is purely about the report artifact once role data already exists.
- Sheets-related content in the existing skill (the "21-30 reserve lives only in the Sheet" concept) — not applicable, not being ported forward.

---

## 7. Verification

Before calling any part of this done:
1. **Markdown-to-JSON parsing (new capability, not in the existing v15 skill):** using a real or realistic sample markdown file covering 5 roles, show Todd the actual generated JSON — real output, not a description. Confirm every required field per the v15 schema is correctly extracted (function alignments, value alignments, day-to-day breakdown, salary, alt titles, etc.), and flag any field the markdown didn't reliably contain rather than silently leaving it blank or guessing.
2. **Graph, standalone:** generate the image, show Todd the actual file — real output, not a description. Confirm the 9×3 grid, correct dot placement for a real or realistic test case, numbered dots matching a legend, and the grayed-out per-role variant. Since initial placement is Claude Code's own judgment call, **explicitly walk Todd through the reasoning for each role's function/seniority placement** as part of presenting the graph — not just the finished image — so Todd can catch a wrong judgment call before approving, and flag any role Claude Code itself found ambiguous per Section 4.4.
3. **Test the conversational-correction workflow directly:** have Todd (or simulate) a natural-language correction request, confirm the underlying data updates correctly and the graph regenerates correctly — this is a core requirement, not a nice-to-have, and should be proven before considering the graph "done."
4. **PDF integration, only after the graph is approved standalone:** confirm the 5-role report builds correctly end-to-end, TOC page numbers are accurate at the new length, both graph modes appear in their correct locations, and the existing brand/formatting/sanitization rules from v15 are all still intact.

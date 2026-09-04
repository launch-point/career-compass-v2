---
name: career-compass-report
description: Generate the Career Compass Results Report PDF after completing Steps 1-5 of the Career Compass workflow (v15). Produces a branded multi-page PDF with cover, table of contents, how-to-read, what-to-do, client profile, and 20 job type detail entries — each role rendered as 3 pages (Function Alignment with Top 5 + Additional Functions tables, Value Alignment, Day-to-Day Operational Breakdown). Uses Launch Group brand colors and logos, with two-pass build for accurate page numbers. Trigger phrases include Career Compass report, generate report, build PDF, create report, Step 5.
metadata:
  author: Launch Group
  version: '15.0'
---

# Career Compass Results Report — v15

## When to Use This Skill

Use this skill when:

- The Career Compass workflow has completed Steps 1-4 (consolidated JSON exists in workspace).
- The user asks to generate the Career Compass report or PDF.
- The user says "Step 5" or asks for the results report.

## What's New in v15

- **3 pages per role** (was 2). Each role now renders as:
  - **Page 1** — Header (rank, title, alt titles, salary), `Function Alignment` section containing two tables: **Top 5 Functions Alignment** (full narrative) and **Additional Functions Alignment** (Functions 6-10, one-sentence narrative). The Additional table is conditionally omitted if no Functions 6-10 appear in the role.
  - **Page 2** — `Value Alignment` (one bullet per Top 5 value, colored labels, 25-50 word narratives).
  - **Page 3** — `Day-to-Day Operational Breakdown` (Problems Solved, Actions Taken, Results That Mean Success), then `Technical Requirements`, then `Travel`.
- 20 roles total in the PDF (reserve 21-30 lives only in the client Google Sheet and Master Data; never in the PDF).
- Function Alignment / Value Alignment split onto separate pages improves readability and prevents truncation when narratives run long.
- Input JSON schema adds `function_pcts_top5`, `function_descriptions_top5`, `additional_functions` array. The Top 5 fields replace v14's flat `function_pcts` / `function_descriptions` arrays.

## Prerequisites

This skill requires a single consolidated JSON file containing all client and role data:

1. **`{client}_client_report_data.json`** — produced by `career-compass-extract-and-render` (v15). Schema lives in that skill's references.

Logo files bundled in `assets/`:

- `assets/Orange.jpg` — white Launch Group cross on orange (1080x1080) — cover page only.
- `assets/Black-2.jpg` — white Launch Group cross on black (1080x1081) — top-right of every content page.
- `assets/White.jpg` — black Launch Group cross on white (1080x1081) — reserved for future dark-bg use.

**Before running the template**, copy logo files to the workspace:

```bash
cp skills/user/career-compass-report/assets/Orange.jpg /home/user/workspace/
cp skills/user/career-compass-report/assets/Black-2.jpg /home/user/workspace/
```

The template resolves logos by checking the skill assets directory first, then the workspace root.

## Report Structure

The PDF contains, in order:

1. **Cover Page** — Charcoal background, "CAREER COMPASS" title, "RESULTS REPORT" subtitle, client name, date, orange logo, copyright.
2. **Table of Contents** — Front matter + 20 job types with right-aligned page numbers (two-pass build).
3. **How to Read This Report** — Explains the structure of each role's 3 pages.
4. **What to Do With This Report** — 6-step process referencing the NARROW JOB TYPES tab in the client sheet.
5. **Your Job Search Profile** — Top 5 values (color-coded), Top 5 functions (color-coded), Work Preferences table.
6. **20 Job Type Entries** — 3 pages per role (60 role pages total):
   - **Page 1**: Rank + Title + Alt Titles + Salary Range + Function Alignment (Top 5 Functions Alignment table + Additional Functions Alignment table when applicable).
   - **Page 2**: Value Alignment.
   - **Page 3**: Day-to-Day Operational Breakdown + Technical Requirements + Travel.

## Function Alignment Page Layout (v15-specific)

### Top 5 Functions Alignment Table

3-column table:

| Function | % of Time | How It Shows Up in This Role |
|---|---|---|
| (colored function name) | (numeric percentage) | (full narrative, 15-40 words ending with period) |

- Always 3-5 rows (Top 5 functions, omitting any with 0% in the role per Function Alignment Rules).
- Uses the 5 Function Colors from the design system on the Function name column.
- `% of Time` is sourced from the JSON's `function_pcts_top5` array; descriptions from `function_descriptions_top5`.

### Additional Functions Alignment Table (conditional)

Same 3-column structure, but each row's narrative is **one sentence only**. Header `ADDITIONAL FUNCTIONS ALIGNMENT`. Hidden entirely when `additional_functions` is empty.

| Function | % of Time | How It Shows Up in This Role |
|---|---|---|
| (function name, no special color — uses Sage text) | (numeric percentage) | (one-sentence narrative, 15-25 words) |

- 1-5 rows depending on how many of Functions 6-10 appear in the role at ≥15% of role time.
- Visually lighter weight than the Top 5 table — no row color stripes, smaller font, sage divider lines.
- Sourced from JSON `additional_functions` array of `{name, pct, description}` objects.

### Total Coverage Note

Below both tables, a single italicized sentence: *"Combined, the client's Top 10 functions account for approximately {X}% of role time."* Sourced from JSON `total_function_coverage` field. Omitted if field is null.

## Design System (unchanged from v14)

### Brand Colors
- **Orange** `#CF631D` — accent, rank numbers, section headers.
- **Charcoal** `#343432` — cover background, table headers, body text.
- **Sage** `#CCD0C8` — dividers, table borders, bottom strip.

### Function Colors
1. `#B8530D` — Burnt sienna
2. `#2E7D6F` — Teal
3. `#4A6FA5` — Steel blue
4. `#8B6B2F` — Dark gold
5. `#6B4C8A` — Plum

### Value Colors
1. `#1A7A4C` — Forest green
2. `#2D6E96` — Ocean blue
3. `#9B5A2E` — Bronze
4. `#7B3B5D` — Mulberry
5. `#4B7B3E` — Olive green

### Typography
- Headings: DM Sans (Google Fonts).
- Body: Inter (Google Fonts).

### Page Elements
- Colored strip at bottom of every content page (sage | orange | charcoal thirds).
- Black logo top-right on content pages.
- Orange logo on cover.
- Footer: `Career Compass Results | [Client Name] | [Date]` + page number.
- Cover copyright: `© [Year] Launch Group, LLC. All rights reserved.`

## Writing Framework

All Career Compass writing standards from v14 carry forward unchanged. The Function Alignment narratives, Value Alignment paragraphs, Day-to-Day prose, Travel sentence, Alternative Titles, and static page copy all follow the same rules.

### Top 5 vs Additional — Length Targets

- **Top 5 Functions Alignment narrative**: 15-40 words, one to two complete sentences. Same standard as v14.
- **Additional Functions Alignment narrative**: 15-25 words, **exactly one sentence**. By design lighter than the Top 5 narrative — gives users a quick read on adjacent function fit without dominating the page.

### Sanitization Checklist

Before rendering, every narrative is passed through `sanitize_html()`. Verify:

1. No unescaped ampersands.
2. No markdown link syntax `[text](url)`.
3. No markdown bold `**text**`.
4. No double colons.
5. No trailing horizontal rules.
6. No trailing/leading whitespace.

## JSON Schema (v15 fields)

The unified JSON file uses the following per-role structure. The `career-compass-extract-and-render` skill produces this format from Thread 2 markdown.

```json
{
  "rank": 1,
  "title": "Learning & Development Specialist",
  "alt_titles": ["L&D Specialist", "Talent Development Specialist", "Corporate Trainer"],
  "salary_low": 65000,
  "salary_avg": 78000,
  "salary_high": 92000,
  "salary_context": "Mid-size company, 100-500 employees, US average",

  "function_pcts_top5": [25, 20, 20, 20, 15],
  "function_descriptions_top5": [
    "Designs and delivers training curricula for new hires and ongoing skill development across all departments.",
    "...",
    "...",
    "...",
    "..."
  ],

  "additional_functions": [
    {
      "name": "Coaching",
      "pct": 10,
      "description": "Provides one-on-one coaching to managers on giving developmental feedback."
    }
  ],

  "total_function_coverage": 85,

  "value_alignments": [
    "Single-paragraph narrative (25-50 words) ending with a period.",
    "...",
    "...",
    "...",
    "..."
  ],

  "day_to_day": {
    "problems_solved": [
      {"title": "Title sentence ending with a period.", "description": "30-50 word description."}
    ],
    "actions_taken": [
      {"problem_label": "Problem 1 — Brief Descriptor:", "actions": ["Action sentence."]}
    ],
    "success_metrics": [
      {"title": "Metric Name", "description": "2-3 sentence description."}
    ]
  },

  "tech_req_1": "LMS platforms (Workday Learning, Cornerstone, LinkedIn Learning)",
  "tech_time_1": "30-90 days hands-on",
  "tech_req_2": "Microsoft Office Suite",
  "tech_time_2": "1-2 weeks self-paced",

  "travel": "Typically 2-6 days/month for multi-site facilitation and offsites.",

  "bias_prevention_note": "1-2 sentence statement passed through from research markdown."
}
```

Notes:

- `function_pcts_top5` replaces v14's `function_pcts`. Always exactly 5 entries (one per client Top 5 function). A function that does NOT appear in the role at ≥15% gets a value of 0 — the row is rendered with "—" in the % column and "Not a core function of this role." in the description column.
- `additional_functions` is a possibly-empty array of `{name, pct, description}` objects. If empty, the Additional Functions Alignment table is omitted entirely from the page.
- `total_function_coverage` is the integer percentage sum across Top 10 functions. May be null if Thread 2 omitted the coverage statement.
- `bias_prevention_note` is captured from research but NOT rendered in the PDF — it lives in the JSON for audit and Master Data writeback only.

## How to Generate the Report

### Run the Template Script

```bash
cp skills/user/career-compass-report/assets/Orange.jpg /home/user/workspace/
cp skills/user/career-compass-report/assets/Black-2.jpg /home/user/workspace/
python skills/user/career-compass-report/assets/report_template.py {client}_client_report_data.json
```

Output: `{first}_{last}_career_compass_report.pdf` in the workspace.

The script uses a two-pass build:
- **Pass 1**: Builds the PDF with placeholder page numbers to measure pagination.
- **Pass 2**: Rebuilds with the correct page numbers in the TOC.

### Share and Upload

1. Spot-check the PDF for layout, wrapping, and broken pages.
2. `share_file` the PDF with the user.
3. Upload to Google Drive via `export_files` (source_id `google_drive`) — only after the user has approved the v15 build.

## Key Implementation Notes

- The template script (`assets/report_template.py`) is ~870 lines, fully parameterized — no hardcoded client data.
- v15 changes `build_job_page` from a 2-page layout to a 3-page layout via two explicit `PageBreak()` calls.
- v15 adds the `build_function_alignment_section()` helper which renders Top 5 + Additional tables and the coverage note.
- All client data comes from the JSON file passed as a command-line argument.
- Day-to-day data is read from structured JSON objects (not parsed from markdown at runtime).
- Technical Requirements + Travel are wrapped in `KeepTogether` to prevent orphan pages on Page 3.
- The What to Do With This Report page references the NARROW JOB TYPES tab and Ministry To Marketplace community — update if the workflow changes.

## What v15 Drops from v14

- Single combined Function Alignment + Value Alignment page (now split into two pages).
- Flat `function_pcts` / `function_descriptions` arrays (replaced with `function_pcts_top5` / `function_descriptions_top5` + `additional_functions`).

## What v15 Keeps from v14

- Cover, TOC, How to Read, What to Do, Profile pages.
- Two-pass build for TOC page numbers.
- All brand colors, function colors, value colors.
- DM Sans / Inter font stack.
- All writing framework rules.
- `sanitize_html()` safety net.
- Day-to-Day structure (Problems / Actions / Metrics) — only the page placement changes.
- KeepTogether on Tech + Travel.

## What v15 Adds vs v14

- 3-page-per-role layout (was 2).
- Additional Functions Alignment table for Functions 6-10 at ≥15% role time.
- `total_function_coverage` line under both function tables.
- JSON schema fields: `function_pcts_top5`, `function_descriptions_top5`, `additional_functions`, `total_function_coverage`, `bias_prevention_note` (stored, not rendered).

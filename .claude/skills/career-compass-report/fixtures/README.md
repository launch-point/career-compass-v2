# Graph generator regression fixture

`regression_graph.json` — 5 roles, deliberately shaped to exercise the parts of
`graph_generator.py` that have actually broken:

- **All three seniority bands** used (Specialist / Integrator / Strategist).
- **Four of the nine functions** used, spread across the x-axis including the
  last column (Communications), which catches right-edge clipping.
- **A collision cell**: ranks 1 and 4 both sit at Human Resources / Strategist,
  exercising the horizontal-offset logic in `_positions()`.

## What it caught

Sept 2026 — overview mode rendered a ~20-inch-tall PNG with the grid crushed
into the bottom quarter. Cause: the "ROLES" legend heading was the one call in
the legend block missing `transform=lax.transAxes`, so it was placed in *data*
coordinates. The sibling `scatter(..., transform=...)` calls had already
collapsed that axes' data limits to (-0.055, 0.055), putting the heading at
figure-fraction y=3.07 — three figure-heights above the canvas. `bbox_inches=
"tight"` then grew the output to contain it. Fixed by pinning the legend axes
limits to (0,1) and giving the heading an explicit transform.

## Usage

    PY=.claude/skills/career-compass-report/.venv/bin/python
    GEN=.claude/skills/career-compass-report/graph_generator.py
    FIX=.claude/skills/career-compass-report/fixtures/regression_graph.json

    $PY $GEN $FIX --mode overview --out reports/graph-test/overview.png
    $PY $GEN $FIX --mode role --role-rank 1 --out reports/graph-test/role1.png

Expected at 300 DPI: overview ~2541x1856 px (8.47 x 6.19 in), role ~2541x1280
px (8.47 x 4.27 in). A wildly taller overview means the layout bug is back.

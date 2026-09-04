#!/usr/bin/env python3
"""
Career Compass v2 — Function/Seniority Graph Generator (standalone).

Renders the fixed 9x3 grid (9 business functions x 3 seniority bands) with the
client's 5 roles plotted as numbered dots. Two modes:

  overview : all 5 dots, colored by rank, + a legend (number -> full title).
  role     : all 5 dots, the target rank enlarged + colored, others small/grayed,
             no legend (surrounding PDF context identifies it).

Input: a graph JSON file — a list of role objects:
  [{"rank": 1, "role_title": "Director of Brand Strategy",
    "function": "Marketing", "seniority_level": "Strategist"}, ...]

Usage:
  python graph_generator.py <graph.json> --mode overview --out overview.png
  python graph_generator.py <graph.json> --mode role --role-rank 1 --out role1.png

Brand: #CF631D orange, #343432 charcoal, #CCD0C8 sage. Fonts: DM Sans / Inter
(downloaded once to /tmp/fonts, same as report_template.py). Output PNG @ 300 DPI.
"""

import argparse
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # headless
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Rectangle

# ─── Fixed axes (never dynamic) ──────────────────────────────────────────────
FUNCTIONS = [
    "Product", "Marketing", "Sales", "Customer Experience", "Operations",
    "Human Resources", "Finance and Accounting", "Legal", "Communications",
]
SENIORITY = ["Specialist", "Integrator", "Strategist"]  # y=0 bottom -> y=2 top

# ─── Brand ───────────────────────────────────────────────────────────────────
ORANGE = "#CF631D"
CHARCOAL = "#343432"
SAGE = "#CCD0C8"
SAGE_VERY_LIGHT = "#F2F4F0"
GRAY_DOT = "#BFC4BB"      # grayed-out dots (per-role mode)
GRAY_TEXT = "#8A8A88"

# Rank is NOT encoded by hue. Every dot is brand orange; the numeral inside the
# dot (plus the legend in overview mode) carries rank on its own. Hue-encoding
# rank would need a third palette kept permanently distinct from FUNC_COLORS and
# VAL_COLORS in report_template.py, for no information the numeral doesn't
# already give the reader.
DOT_COLOR = ORANGE

# Dot sizes (matplotlib scatter `s`, points^2). Sized so two dots sharing one
# cell stay clear of each other and of the grid edge — see _positions().
SIZE_OVERVIEW = 520
SIZE_TARGET = 700        # highlighted role, per-role mode
SIZE_CONTEXT = 170       # the other four, per-role mode

# Horizontal padding (in cell widths) added outside the grid so a dot in the
# first or last function column is never pressed against the frame.
EDGE_PAD = 0.18

FONT_HEAD = "DejaVu Sans"  # replaced by DM Sans if the font loads
FONT_BODY = "DejaVu Sans"  # replaced by Inter if the font loads


def ensure_fonts():
    """Register DM Sans / Inter with matplotlib; fall back silently to DejaVu."""
    global FONT_HEAD, FONT_BODY
    import urllib.request
    font_dir = Path("/tmp/fonts")
    font_dir.mkdir(parents=True, exist_ok=True)
    fonts = {
        "DMSans.ttf": "https://github.com/google/fonts/raw/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf",
        "Inter.ttf": "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf",
    }
    for filename, url in fonts.items():
        dest = font_dir / filename
        if not dest.exists():
            try:
                urllib.request.urlretrieve(url, dest)
            except Exception:
                pass  # offline: keep DejaVu fallback
    try:
        for fname, target in (("DMSans.ttf", "head"), ("Inter.ttf", "body")):
            p = font_dir / fname
            if p.exists():
                font_manager.fontManager.addfont(str(p))
                name = font_manager.FontProperties(fname=str(p)).get_name()
                if target == "head":
                    FONT_HEAD = name
                else:
                    FONT_BODY = name
    except Exception:
        pass  # any font issue -> DejaVu; caller sees a note printed in main()


def load_graph(path):
    """Load role placement data.

    Accepts either form:
      * the full client report JSON — {"roles": [{rank, title, function,
        seniority_level, ...}]} — so graph placement lives as per-role fields
        in the same file the PDF is built from, not a second file kept in sync
        by hand;
      * a flat list of {rank, role_title, function, seniority_level} objects,
        which is what the standalone regression fixture uses.
    """
    with open(path) as f:
        data = json.load(f)

    if isinstance(data, dict) and "roles" in data:
        data = [
            {
                "rank": r.get("rank"),
                "role_title": r.get("title", r.get("role_title")),
                "function": r.get("function"),
                "seniority_level": r.get("seniority_level"),
            }
            for r in data["roles"]
        ]
    if not isinstance(data, list):
        raise ValueError(
            "graph JSON must be a list of role objects, or an object with a 'roles' list"
        )
    missing = [r.get("rank") for r in data
               if r.get("function") is None or r.get("seniority_level") is None]
    if missing:
        raise ValueError(
            "roles missing graph placement fields (function / seniority_level): "
            + ", ".join(f"rank {m}" for m in missing)
        )
    errors = []
    for r in data:
        if r.get("function") not in FUNCTIONS:
            errors.append(f"  rank {r.get('rank')}: function {r.get('function')!r} is not one of the 9 fixed functions")
        if r.get("seniority_level") not in SENIORITY:
            errors.append(f"  rank {r.get('rank')}: seniority_level {r.get('seniority_level')!r} is not Specialist/Integrator/Strategist")
    if errors:
        raise ValueError("Invalid graph data:\n" + "\n".join(errors))
    return sorted(data, key=lambda r: r["rank"])


def _positions(roles):
    """Return {rank: (x, y)} with small horizontal offsets when dots collide."""
    cells = {}
    for r in roles:
        key = (FUNCTIONS.index(r["function"]), SENIORITY.index(r["seniority_level"]))
        cells.setdefault(key, []).append(r["rank"])
    pos = {}
    for (x, y), ranks in cells.items():
        n = len(ranks)
        if n == 1:
            pos[ranks[0]] = (x, y)
        else:
            # Spread evenly within the cell, centered. The gap has to clear the
            # *enlarged* target dot, not the small context dots — at the old
            # fixed 0.34 an enlarged dot overlapped its cell-mate. Scale the
            # span with occupancy, capped so dots stay inside the cell.
            gap = 0.42
            span = min(gap * (n - 1), 0.88)
            offs = [(-span / 2) + span * i / (n - 1) for i in range(n)]
            for rank, off in zip(sorted(ranks), offs):
                pos[rank] = (x + off, y)
    return pos


def _draw_grid(ax):
    # Pad beyond the grid frame so a dot in the first or last function column
    # (especially an offset one sharing a cell) is never pressed against the
    # edge. The frame itself is still drawn at the true cell bounds below.
    ax.set_xlim(-0.5 - EDGE_PAD, len(FUNCTIONS) - 0.5 + EDGE_PAD)
    ax.set_ylim(-0.5, len(SENIORITY) - 0.5)
    # alternating row shading for readability
    for y in range(len(SENIORITY)):
        if y % 2 == 0:
            ax.add_patch(Rectangle((-0.5, y - 0.5), len(FUNCTIONS), 1,
                                   facecolor=SAGE_VERY_LIGHT, edgecolor="none", zorder=0))
    # grid lines
    for x in range(len(FUNCTIONS) + 1):
        ax.axvline(x - 0.5, color=SAGE, linewidth=0.7, zorder=1)
    for y in range(len(SENIORITY) + 1):
        ax.axhline(y - 0.5, color=SAGE, linewidth=0.7, zorder=1)
    ax.set_xticks(range(len(FUNCTIONS)))
    ax.set_xticklabels(FUNCTIONS, rotation=32, ha="right", fontsize=8.5,
                       fontfamily=FONT_BODY, color=CHARCOAL)
    ax.set_yticks(range(len(SENIORITY)))
    ax.set_yticklabels(SENIORITY, fontsize=10, fontfamily=FONT_HEAD, color=CHARCOAL)
    ax.tick_params(length=0)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.set_axisbelow(True)


def _draw_dot(ax, x, y, rank, color, size, text_color="white", fontsize=11, alpha=1.0):
    ax.scatter([x], [y], s=size, c=color, edgecolors="white", linewidths=1.2,
               zorder=5, alpha=alpha)
    ax.text(x, y, str(rank), ha="center", va="center", color=text_color,
            fontsize=fontsize, fontfamily=FONT_HEAD, fontweight="bold", zorder=6)


def render(roles, mode, role_rank, out_path):
    pos = _positions(roles)

    if mode == "overview":
        fig = plt.figure(figsize=(9.0, 6.4), dpi=300)
        # grid on top, legend beneath
        ax = fig.add_axes([0.13, 0.42, 0.83, 0.52])
        _draw_grid(ax)
        for r in roles:
            x, y = pos[r["rank"]]
            _draw_dot(ax, x, y, r["rank"], DOT_COLOR,
                      size=SIZE_OVERVIEW, fontsize=12)
        # legend area
        lax = fig.add_axes([0.13, 0.02, 0.83, 0.32])
        lax.axis("off")
        lax.set_xlim(0, 1)  # pin data space so transAxes == data coords
        lax.set_ylim(0, 1)  # and stray autoscaling can't move anything
        lax.text(0, 1.0, "ROLES", fontsize=10, fontfamily=FONT_HEAD,
                 color=ORANGE, fontweight="bold", va="top",
                 transform=lax.transAxes)
        for i, r in enumerate(roles):
            yy = 0.82 - i * 0.17
            lax.scatter([0.015], [yy + 0.02], s=210, c=DOT_COLOR, edgecolors="white",
                        linewidths=1.0, transform=lax.transAxes, clip_on=False)
            lax.text(0.015, yy + 0.02, str(r["rank"]), ha="center", va="center",
                     color="white", fontsize=8.5, fontfamily=FONT_HEAD,
                     fontweight="bold", transform=lax.transAxes)
            lax.text(0.05, yy + 0.02, r["role_title"], va="center", fontsize=10.5,
                     fontfamily=FONT_BODY, color=CHARCOAL, transform=lax.transAxes)
    else:  # role mode
        if role_rank is None:
            raise ValueError("--role-rank is required for --mode role")
        fig = plt.figure(figsize=(9.0, 4.2), dpi=300)
        ax = fig.add_axes([0.13, 0.22, 0.83, 0.74])
        _draw_grid(ax)
        # others first (small, gray), target last (big, colored) so it sits on top
        for r in roles:
            if r["rank"] == role_rank:
                continue
            x, y = pos[r["rank"]]
            _draw_dot(ax, x, y, r["rank"], GRAY_DOT, size=SIZE_CONTEXT,
                      text_color=GRAY_TEXT, fontsize=8, alpha=0.9)
        target = next((r for r in roles if r["rank"] == role_rank), None)
        if target is None:
            raise ValueError(f"no role with rank {role_rank} in graph data")
        x, y = pos[target["rank"]]
        _draw_dot(ax, x, y, target["rank"], DOT_COLOR,
                  size=SIZE_TARGET, fontsize=14)

    fig.savefig(out_path, dpi=300, facecolor="white", bbox_inches="tight", pad_inches=0.15)
    plt.close(fig)


def main():
    ap = argparse.ArgumentParser(description="Career Compass function/seniority graph")
    ap.add_argument("graph_json")
    ap.add_argument("--mode", choices=["overview", "role"], default="overview")
    ap.add_argument("--role-rank", type=int, default=None)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    ensure_fonts()
    if FONT_HEAD == "DejaVu Sans":
        print("NOTE: DM Sans/Inter not available — rendered with DejaVu Sans fallback.")

    try:
        roles = load_graph(args.graph_json)
    except (ValueError, FileNotFoundError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    render(roles, args.mode, args.role_rank, args.out)
    print(f"Wrote {args.mode} graph -> {args.out}  ({len(roles)} roles)")


if __name__ == "__main__":
    main()

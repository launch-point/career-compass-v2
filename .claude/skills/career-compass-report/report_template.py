#!/usr/bin/env python3
"""
Career Compass Report — Parameterized Template
Multi-page PDF with title page, TOC, intro, and 5 job type detail pages.
Brand colors: #CF631D (orange), #343432 (charcoal), #CCD0C8 (sage)

USAGE:
    python report_template.py <path_to_client_report_data.json> [output.pdf]

The JSON file must conform to the client_report_data schema.
Logos (Orange.jpg, Black-2.jpg) are loaded from the same directory as this script.
"""

import json
import re
import sys
import os
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Image, KeepTogether, Flowable, HRFlowable
)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

# ─── FONTS ───────────────────────────────────────────────────────────────────
def ensure_fonts():
    """Download Google Fonts (DM Sans, Inter) if not already cached."""
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
            print(f"Downloading {filename}...")
            urllib.request.urlretrieve(url, dest)

ensure_fonts()
pdfmetrics.registerFont(TTFont("DMSans", "/tmp/fonts/DMSans.ttf"))
pdfmetrics.registerFont(TTFont("Inter", "/tmp/fonts/Inter.ttf"))

FONT_HEAD = "DMSans"
FONT_BODY = "Inter"

# ─── COLORS ──────────────────────────────────────────────────────────────────
ORANGE = HexColor("#CF631D")
CHARCOAL = HexColor("#343432")
SAGE = HexColor("#CCD0C8")
SAGE_LIGHT = HexColor("#E8EBE5")
SAGE_VERY_LIGHT = HexColor("#F2F4F0")
WHITE = white
TEXT_DARK = HexColor("#2B2B29")
TEXT_MID = HexColor("#5A5A58")
TEXT_LIGHT = HexColor("#8A8A88")

# Function colors (warm/earthy palette, distinct from each other)
FUNC_COLORS = [
    "#B8530D",  # F1: Burnt sienna
    "#2E7D6F",  # F2: Teal
    "#4A6FA5",  # F3: Steel blue
    "#8B6B2F",  # F4: Dark gold
    "#6B4C8A",  # F5: Plum
]

# Value colors (complementary palette, distinct from function colors)
VAL_COLORS = [
    "#1A7A4C",  # V1: Forest green
    "#2D6E96",  # V2: Ocean blue
    "#9B5A2E",  # V3: Bronze
    "#7B3B5D",  # V4: Mulberry
    "#4B7B3E",  # V5: Olive green
]

# ─── PAGE SETUP ──────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = letter
MARGIN_L = 0.75 * inch
MARGIN_R = 0.75 * inch
MARGIN_T = 0.75 * inch
MARGIN_B = 0.85 * inch

CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

# ─── STYLES ──────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

s_title_cover = ParagraphStyle(
    "TitleCover", fontName=FONT_HEAD, fontSize=42, leading=48,
    textColor=WHITE, alignment=TA_LEFT, spaceAfter=0
)
s_subtitle_cover = ParagraphStyle(
    "SubtitleCover", fontName=FONT_BODY, fontSize=16, leading=22,
    textColor=HexColor("#FFFFFFCC"), alignment=TA_LEFT, spaceAfter=0
)
s_toc_title = ParagraphStyle(
    "TOCTitle", fontName=FONT_HEAD, fontSize=28, leading=34,
    textColor=CHARCOAL, alignment=TA_LEFT, spaceAfter=20
)
s_toc_entry = ParagraphStyle(
    "TOCEntry", fontName=FONT_BODY, fontSize=11, leading=22,
    textColor=TEXT_DARK, alignment=TA_LEFT, leftIndent=12
)
s_toc_rank = ParagraphStyle(
    "TOCRank", fontName=FONT_HEAD, fontSize=11, leading=22,
    textColor=ORANGE, alignment=TA_RIGHT
)
s_page_title = ParagraphStyle(
    "PageTitle", fontName=FONT_HEAD, fontSize=24, leading=29,
    textColor=CHARCOAL, spaceAfter=4
)
s_page_subtitle = ParagraphStyle(
    "PageSubtitle", fontName=FONT_BODY, fontSize=11, leading=15,
    textColor=TEXT_MID, spaceAfter=16
)
s_section_head = ParagraphStyle(
    "SectionHead", fontName=FONT_HEAD, fontSize=12, leading=16,
    textColor=ORANGE, spaceAfter=4, spaceBefore=10
)
s_subsection_head = ParagraphStyle(
    "SubSectionHead", fontName=FONT_HEAD, fontSize=10.5, leading=14,
    textColor=CHARCOAL, spaceAfter=3, spaceBefore=8
)
s_body = ParagraphStyle(
    "Body", fontName=FONT_BODY, fontSize=9, leading=13,
    textColor=TEXT_DARK, alignment=TA_LEFT, spaceAfter=4
)
s_body_justify = ParagraphStyle(
    "BodyJustify", fontName=FONT_BODY, fontSize=9, leading=13,
    textColor=TEXT_DARK, alignment=TA_JUSTIFY, spaceAfter=4
)
s_bullet = ParagraphStyle(
    "Bullet", parent=s_body, leftIndent=18, firstLineIndent=-10,
    bulletFontName=FONT_BODY, bulletFontSize=9, spaceAfter=2
)
s_label = ParagraphStyle(
    "Label", fontName=FONT_HEAD, fontSize=8, leading=10,
    textColor=TEXT_MID, spaceAfter=2
)
s_value = ParagraphStyle(
    "Value", fontName=FONT_HEAD, fontSize=18, leading=22,
    textColor=CHARCOAL, spaceAfter=4
)
s_intro_title = ParagraphStyle(
    "IntroTitle", fontName=FONT_HEAD, fontSize=28, leading=34,
    textColor=CHARCOAL, spaceAfter=16
)
s_intro_body = ParagraphStyle(
    "IntroBody", fontName=FONT_BODY, fontSize=10.5, leading=16,
    textColor=TEXT_DARK, alignment=TA_LEFT, spaceAfter=10
)
s_intro_head = ParagraphStyle(
    "IntroHead", fontName=FONT_HEAD, fontSize=14, leading=18,
    textColor=CHARCOAL, spaceAfter=6, spaceBefore=14
)
s_footer = ParagraphStyle(
    "Footer", fontName=FONT_BODY, fontSize=7, leading=9,
    textColor=TEXT_LIGHT
)
s_table_header = ParagraphStyle(
    "TableHeader", fontName=FONT_HEAD, fontSize=8.5, leading=11,
    textColor=WHITE
)
s_table_cell = ParagraphStyle(
    "TableCell", fontName=FONT_BODY, fontSize=8.5, leading=12,
    textColor=TEXT_DARK
)
s_table_cell_small = ParagraphStyle(
    "TableCellSmall", fontName=FONT_BODY, fontSize=8, leading=11,
    textColor=TEXT_DARK
)


# ─── LOAD CLIENT DATA FROM JSON ─────────────────────────────────────────────

def load_client_data(json_path):
    """Load and return the client report data from JSON file."""
    with open(json_path) as f:
        data = json.load(f)
    return data


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def sanitize_html(text):
    """Escape ampersands and other HTML-special chars in text for ReportLab Paragraph."""
    # Convert markdown links [text](url) to just the text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Replace & that are not already part of an entity
    text = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|#)', '&amp;', text)
    # Remove trailing markdown separators
    text = re.sub(r'\s*---\s*$', '', text)
    # Remove stray markdown bold markers
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    # Clean up double dashes after colons (from problem titles)
    text = re.sub(r':\s*\u2014\s*', ': ', text)
    # Clean double colons
    text = re.sub(r'::', ':', text)
    # Remove trailing ---
    text = re.sub(r'\s*-{3,}\s*$', '', text)
    return text


def fmt_salary(n):
    """Format number as salary."""
    return f"${n:,.0f}"


# ─── PDF BUILDING ────────────────────────────────────────────────────────────

class GradientRect(Flowable):
    """A colored rectangle as a flowable (for horizontal rules, etc)."""
    def __init__(self, width, height, color):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.color = color

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 0, self.width, self.height, stroke=0, fill=1)


class AccentLine(Flowable):
    """Orange accent line."""
    def __init__(self, width=2*inch, height=3):
        Flowable.__init__(self)
        self.width = width
        self.height = height

    def draw(self):
        self.canv.setFillColor(ORANGE)
        self.canv.rect(0, 0, self.width, self.height, stroke=0, fill=1)


def build_cover_page(story, client_name, report_date):
    """Build the title/cover page."""
    story.append(Spacer(1, 2.2 * inch))
    story.append(Paragraph("CAREER", ParagraphStyle(
        "CoverLine1", fontName=FONT_HEAD, fontSize=48, leading=52,
        textColor=WHITE
    )))
    story.append(Paragraph("COMPASS", ParagraphStyle(
        "CoverLine2", fontName=FONT_HEAD, fontSize=48, leading=52,
        textColor=WHITE
    )))
    story.append(Spacer(1, 6))
    story.append(AccentLine(width=80, height=4))
    story.append(Spacer(1, 16))
    story.append(Paragraph("RESULTS REPORT", ParagraphStyle(
        "CoverLabel", fontName=FONT_HEAD, fontSize=14, leading=18,
        textColor=HexColor("#FFFFFFBB")
    )))
    story.append(Spacer(1, 2.5 * inch))
    story.append(Paragraph(f"PREPARED FOR: {client_name.upper()}", ParagraphStyle(
        "CoverClient", fontName=FONT_BODY, fontSize=11, leading=15,
        textColor=HexColor("#FFFFFFCC")
    )))
    story.append(Paragraph(f"DATE: {report_date.upper()}", ParagraphStyle(
        "CoverDate", fontName=FONT_BODY, fontSize=11, leading=15,
        textColor=HexColor("#FFFFFF99")
    )))
    story.append(PageBreak())


def _toc_row(label, page_num, is_job=False, rank_str=None, salary=None):
    """Build a TOC table row with dot leaders and page number."""
    if is_job and rank_str and salary:
        left_text = f'<font name="{FONT_HEAD}" color="#CF631D">{rank_str}</font>&nbsp;&nbsp;&nbsp;{label}<font color="#8A8A88">&nbsp;&nbsp;{salary}</font>'
    else:
        left_text = f'<font color="#CF631D">\u2022</font>&nbsp;&nbsp;&nbsp;{label}'
    left = Paragraph(left_text, ParagraphStyle(
        "TOCLeft", fontName=FONT_BODY, fontSize=10.5, leading=20, textColor=TEXT_DARK
    ))
    right = Paragraph(str(page_num), ParagraphStyle(
        "TOCRight", fontName=FONT_BODY, fontSize=10.5, leading=20, textColor=TEXT_MID, alignment=TA_RIGHT
    ))
    return [left, right]


def build_toc_page(story, roles, job_page_map):
    """Build the table of contents with page numbers."""
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("TABLE OF CONTENTS", s_toc_title))
    story.append(AccentLine(width=60, height=3))
    story.append(Spacer(1, 0.2 * inch))

    toc_rows = []

    # Front matter entries (fixed pages: cover=1, TOC=2, HowToRead=3, WhatToDo=4, Profile=5)
    toc_rows.append(_toc_row("How to Read This Report", 3))
    toc_rows.append(_toc_row("What to Do With This Report", 4))
    toc_rows.append(_toc_row("Your Job Search Profile", 5))

    # Divider row with spacing
    toc_rows.append([Spacer(1, 4), Spacer(1, 4)])
    toc_rows.append([HRFlowable(width="100%", thickness=0.5, color=SAGE), Paragraph("", s_body)])
    toc_rows.append([Spacer(1, 6), Spacer(1, 6)])

    # Job entries with calculated page numbers
    for role in roles:
        rank = role["rank"]
        rank_str = f"{rank:02d}"
        title = role["title"]
        salary = fmt_salary(role["salary_avg"])
        page = job_page_map.get(rank, "")
        toc_rows.append(_toc_row(title, page, is_job=True, rank_str=rank_str, salary=salary))

    toc_table = Table(toc_rows, colWidths=[CONTENT_W - 30, 30])
    toc_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(toc_table)

    story.append(PageBreak())


def build_intro_page(story, client_name):
    """Build the intro/how-to page — fits on one page."""
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("HOW TO READ THIS REPORT", s_intro_title))
    story.append(AccentLine(width=60, height=3))
    story.append(Spacer(1, 0.15 * inch))

    s_intro_tight = ParagraphStyle("IntroTight", parent=s_intro_body, spaceAfter=6, fontSize=10, leading=14.5)
    s_intro_head_tight = ParagraphStyle("IntroHeadTight", parent=s_intro_head, spaceBefore=10, spaceAfter=4)
    s_intro_bullet = ParagraphStyle("IntroBullet", parent=s_intro_tight, leftIndent=16, firstLineIndent=-12, spaceAfter=4)

    story.append(Paragraph(
        f"This Career Compass report identifies 5 marketplace job types that align with {client_name}\u2019s unique combination of values, job functions, and work preferences. The Client Profile on the following page summarizes the inputs that drive every recommendation. Each role has been individually researched and evaluated for fit.",
        s_intro_tight
    ))

    story.append(Paragraph("What Each Job Page Contains", s_intro_head_tight))
    items = [
        "<b>Salary Range</b> \u2014 Realistic low, average, and high salary targeted to the right organization size and market tier.",
        "<b>Function Alignment</b> \u2014 How each of the top 5 job functions maps to daily work, with a description of how it shows up in the role.",
        "<b>Value Alignment</b> \u2014 A narrative explanation of how each of the top 5 values is expressed and protected.",
        "<b>Day-to-Day Breakdown</b> \u2014 Three sections that show the real work: <b>Problems Solved</b> (the recurring challenges the role addresses), <b>Actions Taken</b> (the specific steps taken to solve each problem), and <b>Results That Mean Success</b> (the KPIs and outcomes that define high performance).",
        "<b>Technical Requirements</b> \u2014 Essential tools or certifications (80%+ of job descriptions) with estimated time to acquire.",
        "<b>Travel</b> \u2014 Expected travel frequency relative to the stated ceiling.",
    ]
    for item in items:
        story.append(Paragraph(f"\u2022&nbsp;&nbsp;{item}", s_intro_bullet))

    story.append(Paragraph("How to Read the Rankings", s_intro_head_tight))
    story.append(Paragraph(
        "Roles are ranked 1\u20135 based on function alignment, value alignment, salary fit, and experience transferability. Higher-ranked roles represent a stronger overall match, but every role on this list is a viable career path. The rankings are a starting point for conversation \u2014 personal interests, geographic preferences, and networking opportunities may elevate a lower-ranked role above a higher-ranked one.",
        s_intro_tight
    ))

    story.append(PageBreak())


def build_action_page(story):
    """Build the 'What to Do With This Report' page."""
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("WHAT TO DO WITH THIS REPORT", s_intro_title))
    story.append(AccentLine(width=60, height=3))
    story.append(Spacer(1, 0.15 * inch))

    s_action = ParagraphStyle("ActionBody", parent=s_intro_body, fontSize=10, leading=14.5, spaceAfter=6)
    s_action_step = ParagraphStyle("ActionStep", parent=s_action, leftIndent=20, firstLineIndent=-20, spaceAfter=8)

    story.append(Paragraph(
        'Complete the following in the <b>"NARROW JOB TYPES"</b> tab in your Career Compass. '
        'Move across the page right to left, completing each column.',
        s_action
    ))
    story.append(Spacer(1, 6))

    steps = [
        'After reviewing the notes from this report, for any Job Types you are interested in, '
        'click the check box next to it in the <b>"Interested"</b> column.',

        'Next, with the information from this report, check the boxes where you already have '
        'all the required technical skills (or it wouldn\u2019t be difficult for you to obtain them).',

        'For each of the Job Types, add any notes you find important from the report or other '
        'personal notes for your reference.',

        'Now it is time to start having your Confirmation Conversations. You can find how to '
        'discover and have confirmation conversations in your Action Plan under the <b>Job Clarity</b> '
        'section in the Ministry To Marketplace community. Watch those videos and start setting '
        'up conversations.',

        'After having at least one conversation about a specific job type, check the box in the '
        '<b>"Vision"</b> column next to the job type if it aligns with your personal vision '
        'exercise. Continue until you have a sense of which 3\u20135 job types you would really '
        'enjoy and would fit you.',

        'Finally, put a check next to the job types that make it into your Top 3\u20135 job types '
        'in the <b>"Top 3\u20135 Job Types"</b> column. You want to end up with 2\u20133 that you '
        'want to pursue in the <b>#Translation + Resume</b> section in the Action Plan.',
    ]

    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"<b>{i}.</b>&nbsp;&nbsp;{step}", s_action_step))

    story.append(PageBreak())


def build_profile_page(story, client_name, values, functions, work_preferences):
    """Build the client profile summary page — fits on one page."""
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph("YOUR JOB SEARCH PROFILE", s_intro_title))
    story.append(AccentLine(width=60, height=3))
    story.append(Spacer(1, 0.12 * inch))

    s_profile = ParagraphStyle("ProfileBody", parent=s_intro_body, fontSize=10, leading=14.5, spaceAfter=6)
    s_profile_note = ParagraphStyle("ProfileNote", parent=s_body, textColor=TEXT_MID, spaceAfter=6, fontSize=9, leading=13)
    s_profile_head = ParagraphStyle("ProfileHead", parent=s_intro_head, spaceBefore=8, spaceAfter=3)
    s_profile_item = ParagraphStyle("ProfileItem", parent=s_profile, spaceAfter=2, spaceBefore=1)

    story.append(Paragraph(
        f"The following profile was used as the foundation for {client_name}\u2019s Career Compass analysis. "
        f"These inputs drive every ranking, alignment score, and recommendation in this report.",
        s_profile
    ))

    # Top 5 Values
    story.append(Paragraph("Top 5 Values", s_profile_head))
    story.append(Paragraph(
        "Ranked in order of importance. Each job type is evaluated against these values.",
        s_profile_note
    ))
    for j, val in enumerate(values):
        vc = VAL_COLORS[j]
        story.append(Paragraph(
            f'<font name="{FONT_HEAD}" color="{vc}" size="10.5">{j+1}. {val}</font>',
            s_profile_item
        ))
    story.append(Spacer(1, 4))

    # Top 5 Job Functions
    story.append(Paragraph("Top 5 Job Functions", s_profile_head))
    story.append(Paragraph(
        "Ranked in order of priority. Each job type is evaluated for how much of the daily work aligns with these activities.",
        s_profile_note
    ))
    for j, func in enumerate(functions):
        fc = FUNC_COLORS[j]
        story.append(Paragraph(
            f'<font name="{FONT_HEAD}" color="{fc}" size="10.5">{j+1}. {sanitize_html(func)}</font>',
            s_profile_item
        ))
    story.append(Spacer(1, 4))

    # Work Preferences
    story.append(Paragraph("Work Preferences", s_profile_head))
    wp = work_preferences
    prefs = [
        ("Minimum Salary Requirement", wp["min_salary"]),
        ("Maximum Travel", wp["max_travel_days"]),
        ("Advanced Degrees", wp["advanced_degree"]),
        ("Years in Workforce (Full-Time)", wp["years_workforce"]),
        ("Years in Similar/Aspirational Work", wp["years_similar_work"]),
    ]
    pref_rows = [[Paragraph("Preference", s_table_header), Paragraph("Response", s_table_header)]]
    for label, value in prefs:
        pref_rows.append([
            Paragraph(f"<b>{label}</b>", s_table_cell),
            Paragraph(value, s_table_cell),
        ])
    pref_table = Table(pref_rows, colWidths=[CONTENT_W * 0.55, CONTENT_W * 0.45])
    pref_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), CHARCOAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), FONT_HEAD),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, SAGE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SAGE_VERY_LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(pref_table)

    story.append(PageBreak())


def _build_top5_functions_table(role, functions):
    """v15: Build the Top 5 Functions Alignment table. 3 columns: Function | % of Time | How It Shows Up.

    Reads function_pcts_top5 and function_descriptions_top5 from the role dict.
    Rows where pct == 0 render with em-dash in % column and "Not a core function of this role." description.
    """
    pcts = role.get("function_pcts_top5", role.get("function_pcts", [0] * 5))
    descs = role.get("function_descriptions_top5", role.get("function_descriptions", [""] * 5))

    header = [
        Paragraph("Function", s_table_header),
        Paragraph("% of Time", s_table_header),
        Paragraph("How It Shows Up in This Role", s_table_header),
    ]
    rows = [header]
    for j, func in enumerate(functions):
        fc = FUNC_COLORS[j]
        short_func = func if len(func) <= 48 else func[:45] + "..."
        pct = pcts[j] if j < len(pcts) else 0
        desc = sanitize_html(descs[j]) if j < len(descs) else ""
        if not pct or pct == 0:
            pct_cell = "\u2014"  # em dash
            if not desc.strip():
                desc = "Not a core function of this role."
        else:
            pct_cell = f"{pct}%"
        rows.append([
            Paragraph(f'<font color="{fc}"><b>{short_func}</b></font>', s_table_cell_small),
            Paragraph(pct_cell, s_table_cell_small),
            Paragraph(desc, s_table_cell_small),
        ])

    col_func = 165
    col_pct = 45
    col_desc = CONTENT_W - col_func - col_pct
    tbl = Table(rows, colWidths=[col_func, col_pct, col_desc])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), CHARCOAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), FONT_HEAD),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, SAGE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SAGE_VERY_LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tbl


def _build_additional_functions_table(additional_functions):
    """v15: Build the Additional Functions Alignment table (Functions 6-10).

    Visually lighter than the Top 5 table — no row stripes, sage divider lines only,
    one-sentence narratives. Returns None if additional_functions is empty.
    """
    if not additional_functions:
        return None

    header = [
        Paragraph("Function", s_table_header),
        Paragraph("% of Time", s_table_header),
        Paragraph("How It Shows Up in This Role", s_table_header),
    ]
    rows = [header]
    for item in additional_functions:
        name = sanitize_html(item.get("name", ""))
        if len(name) > 48:
            name = name[:45] + "..."
        pct = item.get("pct", 0)
        desc = sanitize_html(item.get("description", ""))
        pct_cell = f"{pct}%" if pct else "\u2014"
        rows.append([
            Paragraph(f'<font color="#5A5A58"><b>{name}</b></font>', s_table_cell_small),
            Paragraph(pct_cell, s_table_cell_small),
            Paragraph(desc, s_table_cell_small),
        ])

    col_func = 165
    col_pct = 45
    col_desc = CONTENT_W - col_func - col_pct
    tbl = Table(rows, colWidths=[col_func, col_pct, col_desc])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SAGE),
        ("TEXTCOLOR", (0, 0), (-1, 0), CHARCOAL),
        ("FONTNAME", (0, 0), (-1, 0), FONT_HEAD),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, SAGE),
        ("BOX", (0, 0), (-1, -1), 0.4, SAGE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tbl


def build_job_page(story, role, values, functions):
    """v15: Build a single job role as 3 pages.

    Page 1: Header + Salary + Function Alignment (Top 5 table + Additional table + coverage line)
    Page 2: Value Alignment
    Page 3: Day-to-Day + Tech Requirements + Travel
    """
    rank = role["rank"]
    title = role["title"]

    # ===== PAGE 1: HEADER + SALARY + FUNCTION ALIGNMENT =====

    rank_display = f'<font name="{FONT_HEAD}" size="32" color="#CF631D">{rank:02d}</font>'
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph(rank_display, ParagraphStyle(
        f"Rank{rank}", fontName=FONT_HEAD, fontSize=32, leading=36, textColor=ORANGE
    )))
    story.append(Spacer(1, 2))
    story.append(Paragraph(title, s_page_title))

    alt_titles_safe = [sanitize_html(t) for t in role["alt_titles"]]
    alt_str = " &nbsp;|&nbsp; ".join(alt_titles_safe)
    story.append(Paragraph(f'Also known as: {alt_str}', s_page_subtitle))

    story.append(AccentLine(width=CONTENT_W, height=2))
    story.append(Spacer(1, 10))

    # Salary row
    sal_data = [
        [Paragraph("SALARY RANGE", s_label), Paragraph("", s_label), Paragraph("", s_label)],
        [
            Paragraph(f'<font name="{FONT_HEAD}" size="11" color="#343432">Low: {fmt_salary(role["salary_low"])}</font>', s_body),
            Paragraph(f'<font name="{FONT_HEAD}" size="14" color="#CF631D">Avg: {fmt_salary(role["salary_avg"])}</font>', s_body),
            Paragraph(f'<font name="{FONT_HEAD}" size="11" color="#343432">High: {fmt_salary(role["salary_high"])}</font>', s_body),
        ]
    ]
    sal_table = Table(sal_data, colWidths=[CONTENT_W/3]*3)
    sal_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SAGE_VERY_LIGHT),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
        ("TOPPADDING", (0, 1), (-1, 1), 2),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("BOX", (0, 0), (-1, -1), 0.5, SAGE),
    ]))
    story.append(sal_table)
    story.append(Spacer(1, 14))

    # Top 5 Functions Alignment
    story.append(Paragraph("TOP 5 FUNCTIONS ALIGNMENT", s_section_head))
    story.append(_build_top5_functions_table(role, functions))
    story.append(Spacer(1, 12))

    # Additional Functions Alignment (conditional)
    additional_functions = role.get("additional_functions", []) or []
    add_tbl = _build_additional_functions_table(additional_functions)
    if add_tbl is not None:
        story.append(Paragraph("ADDITIONAL FUNCTIONS ALIGNMENT", s_section_head))
        story.append(add_tbl)
        story.append(Spacer(1, 8))

    # Total coverage italic line
    total_cov = role.get("total_function_coverage")
    if total_cov is not None:
        coverage_style = ParagraphStyle(
            "CoverageItalic", parent=s_body, fontSize=8.5, leading=11,
            textColor=TEXT_MID, alignment=TA_LEFT
        )
        story.append(Paragraph(
            f'<i>Combined, the client\u2019s Top 10 functions account for approximately {int(total_cov)}% of role time.</i>',
            coverage_style
        ))

    story.append(PageBreak())

    # ===== PAGE 2: VALUE ALIGNMENT =====

    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph(
        f'<font name="{FONT_HEAD}" size="14" color="#CF631D">Rank {rank:02d}</font> &nbsp; '
        f'<font name="{FONT_BODY}" size="10" color="#5A5A58">{sanitize_html(title)}</font>',
        ParagraphStyle("RoleSubhead", fontName=FONT_BODY, fontSize=10, leading=14, spaceAfter=4)
    ))
    story.append(Paragraph("VALUE ALIGNMENT", s_section_head))
    story.append(AccentLine(width=CONTENT_W, height=2))
    story.append(Spacer(1, 8))

    val_style = ParagraphStyle(
        "ValueP2", parent=s_body_justify, fontSize=10, leading=14, spaceAfter=10
    )
    val_alignments = role.get("value_alignments", [])
    for j, val in enumerate(values):
        vc = VAL_COLORS[j]
        alignment_text = val_alignments[j] if j < len(val_alignments) else ""
        alignment_text_safe = sanitize_html(alignment_text)
        story.append(Paragraph(
            f'<font name="{FONT_HEAD}" size="11" color="{vc}">{val}</font><br/>'
            f'<font name="{FONT_BODY}" size="10" color="#2B2B29">{alignment_text_safe}</font>',
            val_style
        ))

    story.append(PageBreak())

    # ===== PAGE 3: DAY-TO-DAY + TECH + TRAVEL =====

    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph(
        f'<font name="{FONT_HEAD}" size="14" color="#CF631D">Rank {rank:02d}</font> &nbsp; '
        f'<font name="{FONT_BODY}" size="10" color="#5A5A58">{sanitize_html(title)}</font>',
        ParagraphStyle("RoleSubhead3", fontName=FONT_BODY, fontSize=10, leading=14, spaceAfter=4)
    ))

    day_to_day = role.get("day_to_day")
    if day_to_day:
        story.append(Paragraph("DAY-TO-DAY OPERATIONAL BREAKDOWN", s_section_head))
        story.append(AccentLine(width=CONTENT_W, height=2))
        story.append(Spacer(1, 4))

        problems = day_to_day.get("problems_solved", [])
        if problems:
            story.append(Paragraph("Problems Solved", s_subsection_head))
            for p in problems:
                title_text = sanitize_html(p["title"])
                desc_text = sanitize_html(p["description"])
                story.append(Paragraph(f"\u2022&nbsp;&nbsp;{title_text}: {desc_text}", s_bullet))

        action_groups = day_to_day.get("actions_taken", [])
        if action_groups:
            story.append(Paragraph("Actions Taken", s_subsection_head))
            for group in action_groups:
                label_clean = sanitize_html(group["problem_label"])
                story.append(Paragraph(
                    f'<font name="{FONT_HEAD}" color="{CHARCOAL.hexval()}">{label_clean}</font>',
                    ParagraphStyle("ActionLabel", parent=s_body, fontSize=8.5, leading=12, spaceBefore=5, spaceAfter=1, textColor=CHARCOAL)
                ))
                for action in group["actions"]:
                    action_clean = sanitize_html(action)
                    story.append(Paragraph(f"\u2022&nbsp;&nbsp;{action_clean}", s_bullet))

        metrics = day_to_day.get("success_metrics", [])
        if metrics:
            story.append(Paragraph("Results That Mean Success", s_subsection_head))
            for mi, m in enumerate(metrics):
                title_text = sanitize_html(m["title"])
                desc_text = sanitize_html(m["description"])
                bstyle = s_bullet
                if mi == len(metrics) - 1:
                    bstyle = ParagraphStyle("BulletKeep", parent=s_bullet, keepWithNext=True)
                story.append(Paragraph(f"\u2022&nbsp;&nbsp;{title_text}: {desc_text}", bstyle))

    # Tech + Travel kept together at the end of Page 3
    tail_items = []
    tail_items.append(Paragraph("TECHNICAL REQUIREMENTS", s_section_head))
    if role["tech_req_1"] != "None":
        tr1 = sanitize_html(role["tech_req_1"])
        tail_items.append(Paragraph(
            f'\u2022&nbsp;&nbsp;<b>{tr1}</b> \u2014 Time to acquire: {role["tech_time_1"]}',
            s_bullet
        ))
    if role["tech_req_2"] != "None":
        tr2 = sanitize_html(role["tech_req_2"])
        tail_items.append(Paragraph(
            f'\u2022&nbsp;&nbsp;<b>{tr2}</b> \u2014 Time to acquire: {role["tech_time_2"]}',
            s_bullet
        ))
    if role["tech_req_1"] == "None" and role["tech_req_2"] == "None":
        tail_items.append(Paragraph("No essential technical requirements at the 80%+ threshold.", s_body))
    tail_items.append(Paragraph("TRAVEL", s_section_head))
    tail_items.append(Paragraph(sanitize_html(role["travel"]), s_body))
    story.append(KeepTogether(tail_items))

    story.append(PageBreak())


# ─── PAGE TEMPLATE CALLBACKS ─────────────────────────────────────────────────

def make_cover_page_bg(orange_logo_path):
    """Return a cover page background callback with the correct logo path."""
    def cover_page_bg(canvas_obj, doc):
        canvas_obj.saveState()
        w, h = PAGE_W, PAGE_H

        # Full-page charcoal background
        canvas_obj.setFillColor(CHARCOAL)
        canvas_obj.rect(0, 0, w, h, stroke=0, fill=1)

        # Sage accent bar at bottom
        canvas_obj.setFillColor(SAGE)
        canvas_obj.rect(0, 0, w, 6, stroke=0, fill=1)

        # Orange accent bar
        canvas_obj.setFillColor(ORANGE)
        canvas_obj.rect(0, 6, w, 3, stroke=0, fill=1)

        # Orange logo on charcoal cover
        try:
            logo_size = 0.65*inch
            logo_x = w - 1.15*inch
            logo_y = 0.4*inch
            canvas_obj.drawImage(orange_logo_path, logo_x, logo_y, width=logo_size, height=logo_size,
                               preserveAspectRatio=True, mask='auto')
        except:
            pass

        # Copyright notice
        canvas_obj.setFont(FONT_BODY, 7)
        canvas_obj.setFillColor(HexColor("#FFFFFF88"))
        canvas_obj.drawString(MARGIN_L, 16,
            "\u00a9 2026 Launch Group, LLC. All rights reserved.")

        canvas_obj.restoreState()
    return cover_page_bg


def make_later_pages_bg(client_name, report_date, black_logo_path):
    """Return a content page background callback with the correct logo path and client info."""
    def later_pages_bg(canvas_obj, doc):
        canvas_obj.saveState()
        w, h = PAGE_W, PAGE_H

        # Colored strip at bottom
        strip_height = 8
        seg_w = w / 3
        canvas_obj.setFillColor(SAGE)
        canvas_obj.rect(0, 0, seg_w, strip_height, stroke=0, fill=1)
        canvas_obj.setFillColor(ORANGE)
        canvas_obj.rect(seg_w, 0, seg_w, strip_height, stroke=0, fill=1)
        canvas_obj.setFillColor(CHARCOAL)
        canvas_obj.rect(seg_w * 2, 0, seg_w + 1, strip_height, stroke=0, fill=1)

        # Footer text
        canvas_obj.setFont(FONT_BODY, 7)
        canvas_obj.setFillColor(TEXT_LIGHT)
        canvas_obj.drawString(MARGIN_L, 18,
            f"Career Compass Results | {client_name} | {report_date}")
        canvas_obj.drawRightString(w - MARGIN_R, 18, f"{doc.page}")

        # Thin sage line at top
        canvas_obj.setStrokeColor(SAGE)
        canvas_obj.setLineWidth(0.5)
        canvas_obj.line(MARGIN_L, h - 0.5*inch, w - MARGIN_R, h - 0.5*inch)

        # Black logo top-right
        try:
            canvas_obj.drawImage(black_logo_path, w - MARGIN_R - 0.3*inch, h - 0.45*inch,
                               width=0.28*inch, height=0.28*inch,
                               preserveAspectRatio=True, mask='auto')
        except:
            pass

        canvas_obj.restoreState()
    return later_pages_bg


# ─── MAIN BUILD ──────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python report_template.py <client_report_data.json> [output.pdf]")
        sys.exit(1)

    json_path = sys.argv[1]
    data = load_client_data(json_path)

    client = data["client"]
    roles = data["roles"]
    client_name = client["name"]
    first_name = client.get("first_name", client_name.split()[0])
    report_date = client["report_date"]
    values = client["values"]
    functions = client["functions"]
    work_preferences = client["work_preferences"]

    # Output path: argument or derived from client name
    if len(sys.argv) >= 3:
        output_path = sys.argv[2]
    else:
        safe_name = client_name.lower().replace(" ", "_")
        reports_dir = Path.cwd() / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        output_path = str(reports_dir / f"{safe_name}_career_compass_report.pdf")

    # Resolve logo paths — brand assets live in the skill assets directory (same dir as this script)
    script_dir = Path(__file__).parent
    orange_logo = str(script_dir / "assets" / "Orange.jpg")
    black_logo = str(script_dir / "assets" / "Black-2.jpg")
    # Brand assets ship alongside this script; fail loudly rather than
    # silently rendering a report with missing logos.
    for asset in (orange_logo, black_logo):
        if not Path(asset).exists():
            raise FileNotFoundError(f"Brand asset missing: {asset}")

    # Two-pass build: first pass calculates page numbers, second pass writes final PDF
    import tempfile, pdfplumber

    on_first_page = make_cover_page_bg(orange_logo)
    on_later_pages = make_later_pages_bg(client_name, report_date, black_logo)

    def build_story(job_page_map):
        story = []
        build_cover_page(story, client_name, report_date)
        build_toc_page(story, roles, job_page_map)
        build_intro_page(story, client_name)
        build_action_page(story)
        build_profile_page(story, client_name, values, functions, work_preferences)
        for role in roles:
            build_job_page(story, role, values, functions)
        return story

    # Pass 1: build with placeholder page numbers to measure actual pages
    print("Pass 1: measuring page layout...")
    placeholder_map = {r: 0 for r in range(1, len(roles) + 1)}
    tmp_path = tempfile.mktemp(suffix=".pdf")
    doc1 = SimpleDocTemplate(
        tmp_path, pagesize=letter,
        title=f"Career Compass Results \u2014 {client_name}",
        author="Launch Group, LLC",
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T, bottomMargin=MARGIN_B,
    )
    story1 = build_story(placeholder_map)
    doc1.build(story1, onFirstPage=on_first_page, onLaterPages=on_later_pages)

    # Extract actual page numbers from pass 1
    job_page_map = {}
    with pdfplumber.open(tmp_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            for line in text.split("\n")[:8]:
                if re.match(r"^\d{1,2}$", line.strip()):
                    num = int(line.strip())
                    if 1 <= num <= len(roles) and num not in job_page_map:
                        job_page_map[num] = i + 1
    print(f"  Page map: {job_page_map}")

    # Clean up temp file
    os.remove(tmp_path)

    # Pass 2: build final PDF with correct page numbers
    print("Pass 2: building final PDF...")
    doc2 = SimpleDocTemplate(
        output_path, pagesize=letter,
        title=f"Career Compass Results \u2014 {client_name}",
        author="Launch Group, LLC",
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T, bottomMargin=MARGIN_B,
    )
    story2 = build_story(job_page_map)
    doc2.build(story2, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    print(f"PDF saved to: {output_path}")
    print(f"Total pages: {doc2.page}")


if __name__ == "__main__":
    main()

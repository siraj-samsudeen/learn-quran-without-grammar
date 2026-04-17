# Picker UI Design Reference

_Saved from 2026-04-17 brainstorm session. Visual companion mockups in `.superpowers/brainstorm/` are ephemeral — this file preserves the final designs._

> Use this as the implementation reference for picker UI. The audit spec ([2026-04-17-picker-ux-audit-and-validators.md](../superpowers/specs/2026-04-17-picker-ux-audit-and-validators.md)) has the decisions; this file has the visual details.

---

## 1 · Controls Bar (always visible)

```
Show: [30▾]  |  Scoring: [★ Recommended] [Short] [Frequency]  [⚙ Fine-tune Ranking]
```

- **Show count**: dropdown (20/30/50/All)
- **Preset pills**: 3 options, active one has highlighted border (2px solid #f59e0b, background #fef3c7)
  - ★ Recommended: D1=35, D2=25, D3=40
  - Short: D1=20, D2=20, D3=60
  - Frequency: D1=50, D2=25, D3=25
- **"⚙ Fine-tune Ranking" button**: `padding:3px 10px; border-radius:6px; background:#f1f5f9; border:1px solid #cbd5e1; font-size:11px; color:#64748b`
- Active preset **deactivates** (unhighlights) when any slider is dragged manually

### Expanded slider panel (hidden by default)

Appears below controls bar when "⚙ Fine-tune Ranking" is clicked. Background: #f8fafc, border-top: 1px solid #e2e8f0.

Four sliders, horizontal layout:

| Slider | Label | Default | Color |
|---|---|---|---|
| D1 | Favor common words | 35 | #3b82f6 (blue) |
| D2 | Favor new vocabulary | 25 | #8b5cf6 (purple) |
| D3 | Favor short sentences | 40 | #f59e0b (amber) |
| Diversity | Form diversity | 0.70 | #64748b (gray) |

- D1/D2/D3 codes shown only as tooltips, not in labels
- Each slider: label left, value right (colored, font-weight:700), thin track (height:5px)
- "▲ Collapse" text button at bottom right of panel
- Re-ranking is automatic — no Apply button

---

## 2 · Selection Bar (sticky, two rows)

Green left border (`border-left:4px solid #34d399`), background `#f0fdf4`.

### Row 1 — Budget gauges

```
[10 / 10-12 SENTENCES]  |  [86 / 100-120 WORDS]  |  [10 / 5-7 FORMS]
```

Each gauge:
- Large number: `font-size:20px; font-weight:800`
- Target: `font-size:11px; color:#64748b`
- Label below: `font-size:9px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px`
- Number color: green (#059669) = in range, yellow (#f59e0b) = outside range
- Separated by `1px solid #d1d5db` vertical dividers, height 28px

No buttons in this row.

### Row 2 — Traffic-light heatmap chips

Background: #f8fdf8, border-top: 1px solid #e2e8f0.

#### Root group headers
```
ILĀH 1/4  │  KABURA 9/16
```
- `font-size:9px; color:#64748b; font-weight:700`
- Fraction shows covered/total forms
- Separated by `│` character in #d1d5db

#### Chip styles (each chip = one form)

| State | Border | Background | Text color | When |
|---|---|---|---|---|
| ×1 (weak) | `2px solid #ef4444` | `#fef2f2` | `#1f2937` | 1 selected sentence |
| ×2 (adequate) | `2px solid #f59e0b` | `#fffbeb` | `#1f2937` | 2 selected sentences |
| ×3+ (strong) | `2px solid #22c55e` | `#f0fdf4` | `#1f2937; font-weight:600` | 3+ selected sentences |
| Not picked | `1.5px dashed #d1d5db` | `#fafafa` | `#cbd5e1` | Exists but not selected |

All chips: `padding:2px 8px; border-radius:6px; font-family:'Amiri',serif; font-size:11px; direction:rtl; cursor:pointer`

- Superscript count shown **only on green (×3+)** chips: `<sup style="font-size:8px;font-family:system-ui;color:#16a34a;">3</sup>`
- No count superscript on red or yellow — the color is self-explanatory

#### Legend (below chips)
```
□ not picked  ■ ×1  ■ ×2  ■ ×3+
```
`font-size:9px; color:#94a3b8` — small colored squares matching the border colors above

---

## 3 · Chip Filter Interaction

### Default state
All chips at full opacity, clickable. Small hint text below: "Click any form or root to filter the table below" (`font-size:9px; color:#94a3b8`)

### Form filter active (clicked a specific form chip)

- **Clicked chip**: inverted — `background:#1f2937; border:2px solid #1f2937; color:white; font-weight:600; box-shadow:0 0 0 2px #3b82f6`
- **All other chips**: dimmed — `opacity:0.35`
- **"✕ Clear filter" button** appears: `padding:3px 10px; border-radius:6px; background:#1f2937; color:white; font-size:10px`
- **Status line**: "Showing **12 sentences** containing **كُبْرَى** · click another chip or clear" (`font-size:9px; color:#64748b`)

### Root filter active (clicked a root label like "KABURA")

- **Clicked root label**: inverted — `color:white; background:#1f2937; box-shadow:0 0 0 2px #3b82f6`
- **Other root's chips + label**: dimmed — `opacity:0.35`
- **Active root's chips**: stay full opacity (can click one to drill further)
- **"✕ Clear filter" button** appears
- **Status line**: "Showing **187 sentences** from root **kabura** · click a form to narrow further"

### Toggle behavior
- Click same chip again → clears filter
- Click different chip while filtered → switches filter directly
- Clicking a dashed (uncovered/ghost) chip → shows sentences containing that form (discovery)

---

## 4 · Table

### Columns (8 total)

| # | Header | Width | Align | Font | Notes |
|---|---|---|---|---|---|
| 1 | Score | 50px | right | system, weight:700 | Color by rank: green (#059669) rank 1-10, blue (#0369a1) 11-20, gray (#64748b) 21+ |
| 2 | Ref | 100px | left | system, 11px | "Al-Baqarah 2:255 (3/9)" — fragment indicator inline |
| 3 | Forms | 100px | left | — | Form tag chips: `padding:1px 5px; border-radius:6px; font-size:10px` |
| 4 | Arabic | flex | right | Amiri, 14px, direction:rtl | Solid blue right-border = full ayah; dashed gray = waqf fragment |
| 5 | English | flex | left | system, 11px, color:#64748b | Sahih International draft |
| 6 | Words | 36px | right | system | Word count, sortable |
| 7 | Bar | 60px | — | — | Stacked D1/D2/D3 bar (blue/purple/amber), height:8px, border-radius:2px |
| 8 | Hook | 80px | left | system, 10px, color:#94a3b8 | hookReason truncated. Full text on hover tooltip. Empty if no scores. |

### Table header
`background:#f8fafc; font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px`

### Row states
- **Default**: white background, `cursor:pointer`
- **Selected**: `background:#f0fdf4` (green tint)
- **Hover**: light gray tint

### Stacked bar (column 7)
```html
<div style="display:flex;height:8px;width:50px;border-radius:2px;overflow:hidden;">
  <div style="width:{d1%};background:#3b82f6;"></div>
  <div style="width:{d2%};background:#8b5cf6;"></div>
  <div style="width:{d3%};background:#f59e0b;"></div>
</div>
```

### Arabic column border indicator
- Full ayah (no waqf split): `border-right:3px solid #3b82f6` (blue)
- Waqf sentence (fragment): `border-right:3px dashed #94a3b8` (gray dashed)

---

## 5 · Color Palette Summary

| Use | Color | Hex |
|---|---|---|
| D1 / frequency | Blue | #3b82f6 |
| D2 / coverage | Purple | #8b5cf6 |
| D3 / length | Amber | #f59e0b |
| Diversity | Gray | #64748b |
| ×1 weak (traffic light) | Red | #ef4444 |
| ×2 adequate (traffic light) | Yellow/Amber | #f59e0b |
| ×3+ strong (traffic light) | Green | #22c55e |
| Selected row | Green tint | #f0fdf4 |
| Budget in-range | Green | #059669 |
| Budget out-of-range | Yellow | #f59e0b |
| Muted text | Slate | #94a3b8 |
| Body text | Near-black | #1f2937 |
| Borders | Light gray | #e2e8f0 |
| Filter active (inverted) | Dark | #1f2937 |
| Filter ring | Blue | #3b82f6 |

---

_Reference for implementation. See audit spec for decisions and rationale._

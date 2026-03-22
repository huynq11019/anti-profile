# Design System Specification: The Obsidian Logic

## 1. Overview & Creative North Star
**Creative North Star: "The Ghost in the Machine"**

This design system is for Anti-Detech — a high-end desktop anti-fingerprint browser manager. It moves beyond the utility of a standard browser manager into the realm of high-end digital espionage tools. The interface should feel invisible yet authoritative — like a high-end editorial piece.

Key aesthetic: **Organic Layering** and **Intentional Asymmetry**. Vast negative space contrasted against hyper-dense data clusters. Overlapping glassmorphic elements over deep, monochromatic surfaces create a sense of infinite depth.

---

## 2. Colors & Surface Philosophy

### Color Tokens
| Token | Hex | Role |
|-------|-----|------|
| `background` / `surface` | `#0c0e12` | Global background |
| `surface_dim` | `#0c0e12` | Non-interactive bg |
| `surface_container_lowest` | `#000000` | Extreme contrast only |
| `surface_container_low` | `#111318` | Main content areas |
| `surface_container` | `#171a1f` | Cards, panels |
| `surface_container_high` | `#1d2025` | Modals, elevated UI |
| `surface_container_highest` | `#23262c` | Input fields |
| `surface_bright` | `#292c32` | Row hover, active states |
| `primary` | `#81ecff` | Cyan — primary accent |
| `primary_dim` | `#00d4ec` | Gradient end for CTAs |
| `on_primary_fixed` | `#003840` | Text on cyan buttons |
| `on_surface` | `#f6f6fc` | Primary text |
| `on_surface_variant` | `#aaabb0` | Secondary/muted text |
| `outline` | `#74757a` | Borders |
| `outline_variant` | `#46484d` | Ghost borders |
| `tertiary` | `#c5ffc9` | Active/running status green |
| `tertiary_container` | `#6bff8f` | Glow behind status dot |
| `error` | `#ff716c` | Error, delete |

### Surface Hierarchy & The "No-Line" Rule
**1px solid borders are prohibited for sectioning.** Define boundaries through tonal shifts.
- Foundation: `surface` (#0c0e12) — global background
- Nesting: `surface_container_low` (#111318) — main content areas
- Cards: `surface_container` (#171a1f) or `surface_container_high` (#1d2025)
- Transition: visual separation via tonal gradient, not strokes
- Ghost border (when required): `outline_variant` at 15% opacity

### The Glass & Gradient Rule
- **Sidebar**: `rgba(255, 255, 255, 0.04)` with `12px` backdrop blur — "frosted obsidian"
- **CTAs**: Linear gradient `primary` (#81ecff) → `primary_dim` (#00d4ec) at 135deg

---

## 3. Typography: Editorial Precision

Font: **Inter** exclusively (headline, body, label all Inter)

| Scale | Size | Usage |
|-------|------|-------|
| display-lg | 3.5rem | Empty state hero stats, letter-spacing -0.02em |
| headline-sm | 1.5rem | Module titles, section headers |
| body-md | 0.875rem | Table data, descriptions |
| label-sm | 0.6875rem | Status tags, fingerprint hashes, font-weight 600 |

Pair headline-sm with label-md uppercase sub-header for editorial "kick".

---

## 4. Elevation & Depth

No CSS box-shadows on cards. Use tonal surface tiers.

- **Tonal Layering**: `surface_container_highest` on `surface` = visual lift
- **Modal shadows**: `0 0 40px rgba(0,0,0,0.5)` with slight cyan tint
- **Ghost Border**: `1px outline_variant at 15% opacity` — creates edge "glint"

---

## 5. Components

### High-Density Tables
- No divider lines. Use `spacing-2.5` for vertical cell padding
- Row hover: background → `surface_bright` (#292c32) + `2px` left-border `primary`
- Status indicators: `tertiary` (#c5ffc9) dot with `tertiary_container` glow (4px blur) = "live LED"

### Buttons
- **Primary**: Gradient fill (#81ecff → #00d4ec), 8px radius, dark text (#003840)
- **Secondary**: `surface_container_highest` fill + Ghost Border
- **Tertiary/Ghost**: Only `primary` text, underline on hover
- **Danger**: `error` (#ff716c) ghost — red text, no fill

### Stat Cards
- Background: `surface_container_low` (#111318)
- Top-right corner glint: 10% opacity primary gradient
- Internal padding: `spacing-5`
- No hard borders — rely on tonal shift from background

### Input Fields
- Default: `surface_container_highest` (#23262c) background
- Focus: border → `primary` + `0 0 8px rgba(129,236,255,0.3)` outer glow

### Sidebar Navigation
- Background: `rgba(255,255,255,0.04)`, blur `12px`
- Item hover: `rgba(0,255,255,0.08)`
- Active item: `3px` left border `primary` (#81ecff) + slightly lighter bg
- Icons: 20px, `on_surface_variant` default, `primary` when active

---

## 6. Design System Notes for Stitch Generation

When generating screens, include this exact design token block in your prompt:

**Design System: Cyber Shield**
- `colorMode: DARK`, `font: INTER`, `roundness: ROUND_EIGHT`
- `customColor: #00E5FF` (overridePrimaryColor)
- Surface stack: #0c0e12 → #111318 → #171a1f → #1d2025 → #23262c
- Primary gradient: #81ecff → #00d4ec at 135deg
- Active/running: #c5ffc9 (tertiary) with glow
- Error/delete: #ff716c
- Typography: Inter only. Headline-sm for module titles. Body-md for table content.
- No hard dividers. No drop shadows on cards. No pure black backgrounds.
- Sidebar: glassmorphism rgba(255,255,255,0.04) blur 12px
- Row hover: surface_bright #292c32 + 2px left cyan border

---
name: Warm Tactile Utility
colors:
  surface: '#f9f9ff'
  surface-dim: '#d9d9e0'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fa'
  surface-container: '#ededf4'
  surface-container-high: '#e8e7ef'
  surface-container-highest: '#e2e2e9'
  on-surface: '#1a1b21'
  on-surface-variant: '#444655'
  inverse-surface: '#2e3036'
  inverse-on-surface: '#f0f0f7'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2d4edf'
  primary: '#002cb6'
  on-primary: '#ffffff'
  primary-container: '#2446d8'
  on-primary-container: '#c4ccff'
  inverse-primary: '#bac3ff'
  secondary: '#2c4ed2'
  on-secondary: '#ffffff'
  secondary-container: '#4a69ec'
  on-secondary-container: '#fffbff'
  tertiary: '#0334a6'
  on-tertiary: '#ffffff'
  tertiary-container: '#2c4ebd'
  on-tertiary-container: '#c2ccff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee1ff'
  primary-fixed-dim: '#bac3ff'
  on-primary-fixed: '#001159'
  on-primary-fixed-variant: '#0031c5'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b9c3ff'
  on-secondary-fixed: '#001356'
  on-secondary-fixed-variant: '#0435bc'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b7c4ff'
  on-tertiary-fixed: '#001552'
  on-tertiary-fixed-variant: '#123bac'
  background: '#f9f9ff'
  on-background: '#1a1b21'
  surface-variant: '#e2e2e9'
typography:
  display:
    fontFamily: IBM Plex Sans
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.005em
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.625rem
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.4375rem
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.1875rem
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.04em
  mono-num:
    fontFamily: IBM Plex Sans
    fontSize: 1.125rem
    fontWeight: '500'
    lineHeight: 1.5rem
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a warm, tactile utility environment tailored for UK tradespeople and service operators. Rooted in dependability, clarity, and physical presence, the interface strips away modern tech veneer—no gratuitous gradients, synthetic glows, or floating cards—in favor of honest, paper-and-ink materiality. 

The aesthetic is influenced by industrial shop manuals, dense ledger forms, and classic British trade documentation. It evokes calm precision during high-pressure quoting tasks: quiet, durable, and deliberate. Every screen prioritizes "one confident input" at a time, preventing decision paralysis and honoring the user's manual trade discipline through crisp tabular alignment, mechanical typography, and reassuring physical feedback.

## Colors

The palette reproduces physical drafting paper, indelible printing ink, and workmanlike blue accents.

### Palette Architecture
- **Primary Blue (`#2446D8`)**: The definitive utility signal. Applied to focal actions, selected toggles, and direct interactive states.
- **Brand Mid (`#4A69EC`)**: Used for active press states, hover variations on primary surfaces, and focused perimeter rings.
- **Brand Light (`#6F8DFF`)**: Reserved for subtle selection indicators, highlights, and secondary informative chips.
- **Neutral Ink (`#16181D`)**: High-contrast, dense charcoal black used for core typography and primary iconography.
- **Muted Text (`#5E5B55`)**: A warm stone gray engineered for secondary labels, metadata, units of measure, and inactive helper text.
- **Surface (`#FFFFFF`)**: Pure sheet tone for foreground cards, inputs, and active interactive containers.
- **Surface Muted (`#FAFAF8`)**: Subtle tonal backing for secondary groupings, table striping, and embedded breakdown panels.
- **Canvas (`#F4F3EF`)**: Warm paper canvas underpinning entire view layouts, eliminating clinical screen glare.
- **Border (`#D9D6CE`)**: Standard divider line specifying crisp, physical seams across containers.
- **Border Strong (`#C9C6BE`)**: Heavy structural rule used for table headers, active element edges, and key component anchors.
- **Disabled (`#E4E2DC`)**: Desaturated stone tone applied to inactive borders and unfillable surfaces.

## Typography

Type is set exclusively in IBM Plex Sans. Its mechanical rhythm, open counters, and engineered terminals evoke precision instruments and technical documentation.

- **Numerics & Calculations**: For line items, monetary sums, VAT additions, and dimensions, leverage tabular lining numbers (`font-variant-numeric: tabular-nums`) to ensure strict vertical column alignment across rows.
- **Hierarchy Rules**: Primary section heads utilize `headline-lg` at weight 600. All small sub-labels, unit indicators, and status indicators strictly employ `label-sm` with slight uppercase tracking (`0.04em`) to maintain legibility at arm's length on field tablets and mobile devices.
- **Legibility**: Line heights are spaced generously to avoid collision during rapid scanning on job sites.

## Layout & Spacing

The layout is structured around an honest 12-column grid system (4 columns on mobile, 8 on tablet, 12 on desktop) centered on a warm `#F4F3EF` paper canvas with a maximum container width of 1120px for high-density quoting layouts.

### Density & Rhythms
- **Single-Focus Entry**: Critical multi-step workflows conform to a centered 600px column ("One Confident Input") ensuring operators can focus on one rate, dimension, or trade fee without peripheral distraction.
- **Section Breaks**: Main layout divisions leverage structural horizontal borders (`#D9D6CE`) paired with `space-xl` spacing rather than arbitrary empty gaps.
- **Alignment**: Every input edge, card boundary, and summary column snaps flush to the grid gutters.

## Elevation & Depth

This design system is strictly flat. It completely rejects box-shadows, dropshadows, and decorative blurs. Depth is achieved purely through paper layering and structural line weight:

- **Surface Tiers**: Base background canvas sits at `#F4F3EF`. Working cards and input sheets elevate through opaque `#FFFFFF` fills. Subordinate areas (headers, inactive sections, line item summaries) use `#FAFAF8`.
- **Crisp Structural Rules**: Spatial separation relies exclusively on 1px flat borders (`#D9D6CE`). When an element commands elevated visual importance—such as a focused card or active summary drawer—it upgrades to a 1.5px or 2px solid boundary in `#C9C6BE` or the primary `#2446D8`.
- **States Without Shadows**: Focus states and active items do not hover upward. They respond with structural color shifts, sharp border transitions, or flat interior fills.

## Shapes

The shape philosophy reflects machined sheet material: subtly softened corners that retain their architectural edge. 

- **Token Profile (`roundedness: 1`)**: Standard buttons, inputs, tags, and small containers utilize a tight 0.25rem (`4px`) radius. 
- **Large Panels (`rounded-lg`)**: Larger modules, summary panels, and structured invoice blocks use a maximum of 0.5rem (`8px`) corner rounding.
- **No Pill Radii**: Completely circular or pill-shaped buttons are prohibited; all interactive elements maintain definitive corner geometry to preserve a utilitarian tool character.

## Components

### Buttons
- **Primary**: Solid background `#2446D8`, text `#FFFFFF`, border 1px solid `#2446D8`. Hover state darkens to `#1E3BB8`; active state triggers background `#4A69EC`. Border radius `4px`.
- **Secondary**: Background `#FFFFFF`, text `#16181D`, border 1px solid `#D9D6CE`. Hover state applies background `#FAFAF8` and border `#C9C6BE`.
- **Tertiary / Utility**: Ghost styling with text `#5E5B55`, no border, hovering to `#FAFAF8` with text `#16181D`.

### Inputs & Quoting Fields
- **One Confident Input**: Text inputs sit on `#FFFFFF` with 1px border `#D9D6CE` and 0.25rem radius. Height is fixed to a tactile 44px (field-accessible). Text is `#16181D`, placeholder is `#5E5B55`.
- **Focus State**: 2px border in `#2446D8` with no glow ring.
- **Prefix / Suffix Elements**: Currency flags (`£`) and unit labels (`sq m`, `hrs`) feature `#FAFAF8` background fills with a fixed interior 1px divider in `#D9D6CE`.

### Cards & Ledger Blocks
- Single-plane `#FFFFFF` panels bounded by a 1px `#D9D6CE` border.
- Card headers utilize a 1px bottom border `#D9D6CE` with interior padding of `space-md` (`1rem`).
- Summary line items apply alternating borders or `#FAFAF8` zebra rows for legible ledger scanning.

### Checkboxes & Radios
- Square 18px boxes with 2px radius. Inactive borders are 1.5px `#C9C6BE` over a `#FFFFFF` fill.
- Checked state fills with `#2446D8` showing a sharp white tick mark.
- Radios follow identical structural styling with a centered solid circle indicator.

### Chips & Badges
- Small metadata tags set at `label-sm` with uppercase tracking.
- Neutral Chip: Background `#FAFAF8`, text `#5E5B55`, border 1px solid `#D9D6CE`.
- Active / Status Chip: Background `#FFFFFF`, text `#2446D8`, border 1.5px solid `#2446D8`.

### Tables & Line Item Breakdowns
- Strict grid table with 1px solid `#C9C6BE` header underlines.
- Numbers right-aligned using tabular figures (`mono-num`).
- Total rows framed with a double-rule top border (`#16181D`) echoing classic trade bookkeeping.
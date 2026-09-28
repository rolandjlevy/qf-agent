# QuoteFetch /quote/new (Step 1) — Claude Code Handover Specification

> **Target Screens:** `QuoteFetch - New Quote (Desktop - Vibrant)` and `QuoteFetch - New Quote (Mobile - Vibrant)`  
> **Target Audience:** Front-end engineers / Claude Code agents working in Next.js (App Router), Tailwind CSS v4, shadcn/ui, Lucide React, and React Dropzone.  
> **Design Philosophy:** *Warm Tactile Utility* — Clean, functional, and fast. Built for UK tradespeople (mobile in the van or desktop in the evening). One confident input, not an overwhelming form.

---

## 1. Executive Summary & Core Changes

This redesign updates `/quote/new` (Step 1: Describe Job) from a passive form to an active, single-composer flow with vibrant accents and micro-elevation.

### What is changing:
1. **Header & Navigation:**
   - Wordmark with official 3-bar stack SVG (`#6F8DFF`, `#4A69EC`, `#2446D8`) + wordmark.
   - Active page tab ("New quote") indicated with royal blue underline (`#2446D8`) and 600 weight.
   - Desktop user avatar/profile button; mobile header collapses to 44px tap hamburger menu.
2. **Step Indicator:**
   - Reusable across steps 1, 2, and 3.
   - Desktop: Numbered step circles (filled vibrant blue for current step) joined by connector lines.
   - Mobile: High-contrast compact badge `"STEP 1"` with progress pill (`w-1/3 bg-primary`), label `"Describe job"`, and trailing `"Next: Materials"`.
3. **Trade Chip ("Quoting as"):**
   - Compact pill button defaulting to user's saved trade profile (e.g. `Bathroom fitter`).
   - Active green indicator dot (`#16A34A` / `bg-emerald-500`) signaling live trade-rate profile sync.
   - Clicking opens searchable popover command list of 20 UK trade specialisms.
4. **Unified Job Composer:**
   - Auto-growing textarea with zero internal borders, resting on a crisp white card with subtle focus ring.
   - Integrated photo attachment dock:
     - Desktop: "Upload photos" button + drag-and-drop target (`up to 8 photos`) + counter pill (`2 / 8 attached`).
     - Mobile: Dual quick-action buttons `[Camera]` (rear camera trigger) and `[Photos]` (gallery picker) with count badge.
     - Inline thumbnail previews (`72x72px`, rounded 8px) with floating top-right remove button (`X`).
5. **Trade-Specific Contextual Guidance Card:**
   - Blue lightbulb tip card (`#EFF6FF` / `border-blue-200`) offering tailored advice for the active trade.
   - Actionable secondary link: `"No photos yet? Ask customer for photos"` (`Send` icon).
6. **Example Chips ("Try an example"):**
   - Trade-filtered quick-fill pills (e.g. "Full bathroom refit", "Replace basin & taps", "Retile shower enclosure").
   - Single tap populates the composer textarea and transitions focus.
7. **Primary Action ("Get materials list"):**
   - High-visibility royal blue button (`#2446D8` to `#1D3BBF` gradient/solid, `box-shadow: 0 4px 14px -1px rgba(36, 70, 216, 0.35)`).
   - Desktop: Inline next to helper caption `"Instant material takeoff in ~1 min · You can verify merchant codes & quantities before drafting."`
   - Mobile: Sticky bottom bar respecting `env(safe-area-inset-bottom)`.
8. **Recent Quotes Grid (Desktop):**
   - 3-card quick-start shelf with trade tag pills (`REFIT`, `PLUMBING`, `TILING`), job title, customer initials avatar, name, and relative timestamp.

---

## 2. Design Tokens & Global CSS

Add or verify these tokens in `app/globals.css` (Tailwind CSS v4 `@theme` format):

```css
@import "tailwindcss";

:root {
  /* Surface & Canvas */
  --background: #F4F3EF;               /* Warm stone neutral page background */
  --surface: #FFFFFF;                  /* Pure white card and container surface */
  --surface-muted: #FAFAF8;            /* Off-white composer utility dock */
  --surface-accent: #EEF2FF;           /* Ice-blue badge & tip fill */

  /* Text & Typography */
  --foreground: #16181D;               /* Primary high-contrast body & titles */
  --foreground-muted: #5E5B55;         /* Secondary descriptive labels & metadata (passes AA 6.6:1) */
  --foreground-subtle: #8A8780;        /* Tertiary helper notes, captions, and placeholders */
  --foreground-inverse: #FFFFFF;       /* White text on dark/vibrant elements */

  /* Brand Vibrant Primary */
  --primary: #2446D8;                  /* QuoteFetch electric royal blue */
  --primary-hover: #1B37B5;            /* Darker royal hover state */
  --primary-subtle: #EEF2FF;           /* Tinted ice-blue background */
  --primary-subtle-border: #BFDBFE;    /* Border for tip cards */

  /* Semantic Feedback */
  --success: #15803D;                  /* Forest green for confirmed / active indicators */
  --success-subtle: #DCFCE7;           /* Tinted green badge fill */

  /* Borders & Dividers */
  --border: #D9D6CE;                   /* Default 1px card and container border */
  --border-subtle: #E4E2DC;            /* Subtle card dividers and table lines */
  --border-focus: #2446D8;             /* Active focus state outline */

  /* Elevation & Shadows */
  --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.04);
  --shadow-card: 0 4px 16px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03);
  --shadow-primary-btn: 0 4px 14px -1px rgba(36, 70, 216, 0.35), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

  /* Corner Radii */
  --radius-sm: 8px;                    /* Chips, photo thumbnails, micro pills */
  --radius-md: 10px;                   /* Inputs, dropdowns */
  --radius-lg: 12px;                   /* Primary CTA buttons, recent cards */
  --radius-xl: 16px;                   /* Main composer card */
  --radius-pill: 9999px;               /* Trade pills, status badges */
}

@theme inline {
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-surface-muted: var(--surface-muted);
  --color-surface-accent: var(--surface-accent);
  --color-foreground: var(--foreground);
  --color-foreground-muted: var(--foreground-muted);
  --color-foreground-subtle: var(--foreground-subtle);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-subtle: var(--primary-subtle);
  --color-border: var(--border);
  --color-border-subtle: var(--border-subtle);
  --font-sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

---

## 3. Component Architecture & Props

Implement the screen using modular components in `components/quote/`:

```
components/
└── quote/
    ├── app-header.tsx               # Top navigation (desktop links + mobile hamburger)
    ├── step-indicator.tsx           # Step 1 of 3 progress (desktop dots, mobile bar)
    ├── trade-selector.tsx           # "Quoting as [Trade]" popover & status dot
    ├── job-composer.tsx             # Textarea + integrated photo drop dock
    ├── photo-thumbnail-strip.tsx    # 72x72 previews with remove button
    ├── photo-guidance-card.tsx      # Trade-tailored suggestions + Ask customer link
    ├── example-chips.tsx            # One-tap pre-fill chips
    ├── primary-cta-bar.tsx          # Action button (desktop inline, mobile sticky)
    └── recent-quotes-grid.tsx       # Desktop 3-column recent quote cards
```

### Detailed Component Specifications

#### A. `AppHeader` (`components/quote/app-header.tsx`)
- **Height:** Desktop `64px`, Mobile `56px`.
- **Background:** White `#FFFFFF`, border-bottom `1px solid var(--border)`.
- **Brand Mark:** Official QuoteFetch SVG (`3-bar stack` in `#6F8DFF`, `#4A69EC`, `#2446D8` + "QuoteFetch" bold wordmark).
- **Navigation Links (Desktop):**
  - "New quote" (`text-primary font-semibold border-b-2 border-primary pb-[18px]`).
  - "Quotes" (`text-foreground-muted hover:text-foreground font-medium`).
  - "Profile" (`text-foreground-muted hover:text-foreground font-medium`).
- **Right Action:**
  - Desktop: User avatar button (40x40 circle, outline `1px solid var(--border)` with Lucide `User`).
  - Mobile: Menu icon button (44x44 tap target, Lucide `Menu` in `#16181D`).

#### B. `StepIndicator` (`components/quote/step-indicator.tsx`)
- **Desktop:**
  - Ordered list `<ol>` with 3 steps: `Describe job`, `Check materials`, `Send quote`.
  - Active step: Solid royal blue circle (`bg-primary text-white 24px`), label `font-semibold text-foreground`.
  - Inactive steps: Outlined muted circle (`border border-border text-foreground-muted`), label `text-foreground-muted`.
  - Connecting line: `h-[1px] bg-border flex-1 mx-3`.
- **Mobile:**
  - Badge: `bg-primary text-white text-[11px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase`.
  - Text: `"Describe job"` (`font-semibold text-sm`) with right-aligned `"Next: Materials"` (`text-xs text-foreground-muted`).
  - Bar: Two-segment bar (`bg-primary h-1 rounded-full w-1/3` over `bg-border h-1 rounded-full w-full`).

#### C. `JobComposer` & Photo Dock (`components/quote/job-composer.tsx`)
- **Container:** Pure white `#FFFFFF`, `border: 1px solid var(--border)`, `rounded-2xl` (`16px`), `overflow-hidden`.
- **Focus State:** `focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20`.
- **Textarea:**
  - Min-height: Desktop `180px`, Mobile `140px`.
  - Padding: `16px 20px`. Font: `IBM Plex Sans 15px`, line-height `1.55`.
  - Placeholder: `"Rip out existing peach suite and wall tiles in 2.2m x 1.9m first floor bathroom..."`
- **Photo Thumbnails Strip:**
  - Displayed directly below textarea when photos exist.
  - Image size: `72x72px`, `rounded-lg`, `object-cover`.
  - Delete button: Floating top-right `24px` circle, `bg-black/75 hover:bg-black text-white` with Lucide `X` icon.
  - Desktop "Add photo" dashed drop target placeholder (`72x72px border-dashed border-2 border-border rounded-lg`).
- **Attachment Dock (Bottom Bar):**
  - Background: `bg-surface-muted` (`#FAFAF8`), `border-t border-border-subtle`, padding `10px 16px`.
  - Desktop: Button `"Upload photos"` (`Lucide Camera`), hint `"or drop images here · up to 8 photos"`, counter pill `"2 / 8 attached"`.
  - Mobile: Dual buttons `[Camera]` (`capture="environment"`) and `[Photos]` (`multiple`), counter `"2 / 8"`.

#### D. `PhotoGuidanceCard` (`components/quote/photo-guidance-card.tsx`)
- **Card:** `bg-blue-50/60 border border-blue-200/80 rounded-xl p-4`.
- **Icon:** Lucide `Lightbulb` in royal blue (`text-primary`).
- **Header:** `"Key details for bathroom fitting:"` (dynamic based on selected trade).
- **Body:** `"Include room dimensions (e.g. 2.2m x 1.9m), existing fittings to remove, and pipe layout. Best photos: doorway panorama, shower/bath plumbing point, and boiler model badge."`
- **Secondary Action:**
  - Divider: `border-t border-blue-200/50 my-2.5`.
  - Link: `"No photos yet? Ask customer for photos"` (`text-primary hover:underline font-medium text-xs flex items-center gap-1.5`).

#### E. `ExampleChips` (`components/quote/example-chips.tsx`)
- **Label:** `"TRY AN EXAMPLE TEMPLATE:"` (`text-[11px] font-semibold tracking-wider text-foreground-subtle uppercase`).
- **Chips:**
  - Style: `bg-white hover:bg-neutral border border-border text-foreground text-xs font-medium px-3.5 py-2 rounded-full transition-all active:scale-[0.98]`.
  - Bathroom fitters examples: `"Full bathroom refit"`, `"Replace basin & taps"`, `"Retile shower enclosure"`.
- **Interaction:** Clicking any chip fills the composer textarea and moves focus to it.

#### F. `PrimaryCtaBar` (`components/quote/primary-cta-bar.tsx`)
- **Button:**
  - Label: `"Get materials list →"` (`font-semibold text-base text-white`).
  - Style: `bg-primary hover:bg-primary-hover h-[50px] px-7 rounded-xl flex items-center justify-center gap-2 transition-all`.
  - Shadow: `shadow-md shadow-primary/25 active:translate-y-[1px]`.
- **State Logic:**
  - Enabled when `description.trim().length > 0` OR `photos.length > 0`.
  - Disabled state: `bg-muted text-foreground-subtle cursor-not-allowed shadow-none`.
- **Helper Note:**
  - Desktop: Beside the button with shield icon: `"Instant material takeoff in ~1 min · You can verify merchant codes & quantities before drafting."`
  - Mobile: Centered below the button with check circle icon: `"Takes ~1 min · You'll inspect & edit materials first"`.
- **Mobile Sticky Container:**
  - Fixed bottom dock: `fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border p-3.5 z-40 pb-[calc(14px+env(safe-area-inset-bottom))]`.

#### G. `RecentQuotesGrid` (`components/quote/recent-quotes-grid.tsx`)
- **Section Header:** `"Start from a recent quote"` (`font-bold text-lg text-foreground`) with trailing link `"View all quotes (14) →"`.
- **3-Column Grid:**
  - Card: `bg-white border border-border hover:border-primary/50 rounded-xl p-4 transition-all hover:shadow-sm cursor-pointer`.
  - Badge row: Trade badge (e.g. `REFIT` in blue-subtle, `PLUMBING` in sky-subtle, `TILING` in indigo-subtle) + arrow icon `ArrowUpRight`.
  - Title: Bold job title (e.g. `"Ensuite shower replacement"`).
  - Footer row: Avatar circle with initials (`SJ`), customer name (`Sarah Jenkins`), and relative time (`2d ago`).

---

## 4. Claude Code Implementation Prompts

Use these prompts directly in Claude Code to execute the changes cleanly:

### Step 1: Design Tokens & Layout Shell
```bash
claude "Configure app/globals.css with the QuoteFetch Warm Tactile Utility design tokens:
- Background: #F4F3EF
- Surface: #FFFFFF, Surface Muted: #FAFAF8
- Primary: #2446D8, Primary Hover: #1B37B5, Primary Subtle: #EEF2FF
- Text: #16181D (foreground), #5E5B55 (muted)
- Borders: #D9D6CE (default), #E4E2DC (subtle)
- Font: IBM Plex Sans throughout
Ensure modern Tailwind CSS v4 @theme variables are registered."
```

### Step 2: Implement Page Header & Step Indicator
```bash
claude "Create components/quote/app-header.tsx and components/quote/step-indicator.tsx:
- app-header.tsx: Render QuoteFetch SVG logo (using the 3-bar stack with colors #6F8DFF, #4A69EC, #2446D8), nav links 'New quote' (active with blue underline), 'Quotes', 'Profile', and user account button. On mobile (<768px), collapse nav to a 44px hamburger menu button.
- step-indicator.tsx: Accept 'currentStep' (1 | 2 | 3). On desktop, render 3 numbered circle steps connected by dividers. On mobile, render a compact STEP 1 badge with progress bar and 'Next: Materials' label."
```

### Step 3: Implement Job Composer & Dropzone
```bash
claude "Create components/quote/job-composer.tsx using react-dropzone and Lucide icons:
- Auto-growing borderless textarea with placeholder for job description.
- Image dropzone supporting up to 8 images.
- Photo thumbnail preview strip (72x72px rounded-lg) with floating delete button on each thumbnail.
- Docked bottom action bar: Desktop has 'Upload photos' button with drag hint and counter; mobile has dual 'Camera' (capture='environment') and 'Photos' buttons.
- Match styling exactly to QuoteFetch design tokens."
```

### Step 4: Implement Guidance Card, Examples & Sticky CTA
```bash
claude "Implement the supporting controls for /quote/new:
1. components/quote/photo-guidance-card.tsx: Ice-blue card (#EFF6FF, border-blue-200) with Lucide Lightbulb icon, trade-specific guidance, and 'No photos yet? Ask customer for photos' link.
2. components/quote/example-chips.tsx: Horizontal pill chips filtered by trade that populate the textarea on click.
3. components/quote/primary-cta-bar.tsx: Vibrant blue 'Get materials list ->' button with subtle box shadow (0 4px 14px -1px rgba(36, 70, 216, 0.35)). Make it sticky at the bottom on mobile respecting safe-area-inset-bottom.
4. components/quote/recent-quotes-grid.tsx: 3-column desktop card grid showing past quotes."
```

---

## 5. QA & Acceptance Checklist

Before merging, verify these criteria:

- [ ] **Accessibility (WCAG AA):** All muted text (`#5E5B55`) on white/stone backgrounds meets the 6.6:1 contrast ratio.
- [ ] **Mobile Sticky Bar:** CTA does not obscure composer content; bottom padding respects `env(safe-area-inset-bottom)`.
- [ ] **No Emoji Icons:** Every icon is rendered via `lucide-react` with 1.75px stroke width.
- [ ] **Photo Limits:** Upload rejects the 9th photo gracefully with an inline toast/badge.
- [ ] **Trade Dynamic Prompts:** Switching trade changes the photo guidance copy and example template chips.
- [ ] **Typography Consistency:** `IBM Plex Sans` is applied globally without font-family drift.
- [ ] **Responsive Breakpoints:** Smooth transition between mobile single-column (390px) and desktop centered container (720px max content width within 1280px viewport).

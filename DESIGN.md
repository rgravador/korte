---
name: Court Books
description: Pickleball court booking PWA for Philippine facilities
colors:
  court-line-gold: "#F2C94C"
  court-line-gold-deep: "#E2B43E"
  court-line-gold-soft: "#FBEBB0"
  warm-charcoal: "#1A1715"
  warm-charcoal-2: "#4A4540"
  warm-charcoal-3: "#8A847D"
  warm-charcoal-4: "#BDB6AB"
  manila-paper: "#FCFAF5"
  manila-paper-2: "#F0EBDF"
  warm-cream: "#F6F2E9"
  warm-cream-2: "#EFE9DB"
  hairline: "#D9D2C2"
  hairline-faint: "#E8E1D0"
  court-surface-green: "#2D5A3F"
  clay-red: "#A33A2A"
  status-confirmed-bg: "#FBEBB0"
  status-confirmed-text: "#6F5A1A"
  status-pending-bg: "#F4E1D8"
  status-pending-text: "#8A4A2D"
  status-checked-in-bg: "#D8E5DD"
  status-checked-in-text: "#2D5A3F"
  status-no-show-bg: "#F4D8D8"
  status-no-show-text: "#A33A2A"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.5rem, 5vw, 3.75rem)"
    fontWeight: 300
    lineHeight: 0.92
    letterSpacing: "-0.04em"
    fontVariation: "opsz 9..144"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 300
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.5rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  card: "14px"
  pill: "999px"
  button: "8px"
  input: "8px"
  chip: "999px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "20px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.warm-charcoal}"
    textColor: "{colors.manila-paper}"
    rounded: "{rounded.button}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.warm-charcoal-2}"
    textColor: "{colors.manila-paper}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.warm-charcoal-3}"
    rounded: "{rounded.button}"
    padding: "12px 20px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.clay-red}"
    rounded: "{rounded.button}"
    padding: "12px 20px"
  button-signal:
    backgroundColor: "{colors.court-surface-green}"
    textColor: "{colors.manila-paper}"
    rounded: "{rounded.button}"
    padding: "12px 20px"
  chip-active:
    backgroundColor: "{colors.warm-charcoal}"
    textColor: "{colors.manila-paper}"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  chip-inactive:
    backgroundColor: "{colors.manila-paper-2}"
    textColor: "{colors.warm-charcoal-3}"
    rounded: "{rounded.chip}"
    padding: "4px 10px"
  input-default:
    backgroundColor: "{colors.manila-paper}"
    textColor: "{colors.warm-charcoal}"
    rounded: "{rounded.input}"
    padding: "12px 16px"
  status-tag-confirmed:
    backgroundColor: "{colors.status-confirmed-bg}"
    textColor: "{colors.status-confirmed-text}"
    rounded: "4px"
    padding: "2px 6px"
  status-tag-pending:
    backgroundColor: "{colors.status-pending-bg}"
    textColor: "{colors.status-pending-text}"
    rounded: "4px"
    padding: "2px 6px"
  status-tag-checked-in:
    backgroundColor: "{colors.status-checked-in-bg}"
    textColor: "{colors.status-checked-in-text}"
    rounded: "4px"
    padding: "2px 6px"
  status-tag-no-show:
    backgroundColor: "{colors.status-no-show-bg}"
    textColor: "{colors.status-no-show-text}"
    rounded: "4px"
    padding: "2px 6px"
  nav-item-active:
    textColor: "{colors.warm-charcoal}"
  nav-item-inactive:
    textColor: "{colors.warm-charcoal-3}"
---

# Design System: Court Books

## 1. Overview

**Creative North Star: "The Brass Clipboard"**

The facility manager's most trusted tool is the clipboard hanging by the front desk: battered, brass-clipped, holding today's schedule on cream-colored paper. Court Books is the digital version of that object. Not a "platform." Not a "dashboard." A clipboard that knows what's happening on every court, right now, and gets out of the way.

The system projects competence through restraint. Warm paper tones replace clinical whites. A high-contrast serif (Fraunces) carries headlines with the confidence of a well-set ledger, while monospace labels handle the data-dense work of times, prices, and status codes. Gold accents appear sparingly, like brass hardware on wood: functional, not decorative.

This system explicitly rejects the North American SaaS booking template (CourtReserve, Skedda), generic Bootstrap admin panels, and overly playful sports app aesthetics. No neon. No mascots. No gamification badges. No identical card grids with icon-heading-text repeated six times.

**Key Characteristics:**
- Warm neutrals dominate; gold accent at less than 10% of any screen
- Serif for authority, monospace for data, sans-serif for body
- Mobile-first (max 425px), designed for one-handed standing use
- Bottom sheets over modals; inline actions over popups
- Every screen answers its question in under three seconds

## 2. Colors

A palette of warm paper, ink, and brass. Every neutral is tinted toward amber; nothing reads as cool gray. The accent gold references the painted court lines on a pickleball surface.

### Primary
- **Court Line Gold** (`#F2C94C`): The singular accent. Used on active navigation indicators, italic emphasis in headlines, booking totals, and the accent dot on sparkline charts. Never used as a background fill on large surfaces.
- **Court Line Gold Deep** (`#E2B43E`): Darker variant for text set against light backgrounds. Used in italic display text where the gold carries meaning (owner names, totals, facility names).
- **Court Line Gold Soft** (`#FBEBB0`): Muted tint for confirmed status tag backgrounds and subtle highlights. Never used as a standalone decorative element.

### Neutral
- **Manila Paper** (`#FCFAF5`): Primary content surface. Phone screen background, bottom sheet background, input field fill. Named for the city and the material.
- **Manila Paper 2** (`#F0EBDF`): Elevated surface within the paper context. KPI cards, search bars, secondary containers. One step of tonal depth without a shadow.
- **Warm Cream** (`#F6F2E9`): Page-level background. The color behind the content surface. Visible as body background on the landing page and app shell.
- **Warm Cream 2** (`#EFE9DB`): Deeper cream for grid cells and value prop blocks on the landing page.
- **Warm Charcoal** (`#1A1715`): Primary text, filled buttons, active navigation items, booked grid cells. The system's "black" carries a warm undertone.
- **Warm Charcoal 2** (`#4A4540`): Secondary text, section descriptions, intro copy.
- **Warm Charcoal 3** (`#8A847D`): Tertiary text, monospace labels, inactive navigation, placeholder text.
- **Warm Charcoal 4** (`#BDB6AB`): Disabled text, open grid cell dashes, lightest readable text.
- **Hairline** (`#D9D2C2`): Primary borders, dividers between booking rows, card outlines.
- **Hairline Faint** (`#E8E1D0`): Lightest divider, used between list items where Hairline feels too heavy.

### Semantic
- **Court Surface Green** (`#2D5A3F`): Positive actions and states. Check-in buttons, "checked in" status, online indicator dot. Named for the green playing surface.
- **Clay Red** (`#A33A2A`): Destructive actions and negative states. No-show tags, cancel buttons, warning text, offline indicator. Named for the clay court variant.

### Named Rules
**The Brass Hardware Rule.** Court Line Gold appears on no more than 10% of any screen. It marks what matters: the active tab, the key number, the action that earns the tap. When everything is gold, nothing is.

## 3. Typography

**Display Font:** Fraunces (with Georgia fallback)
**Body Font:** Geist (with system sans-serif fallback)
**Label Font:** Geist Mono (with system monospace fallback)

**Character:** Fraunces is a variable optical-size serif that shifts from delicate at large sizes to sturdy at small ones. Paired with Geist's neutral clarity for body text and Geist Mono's data-ready monospace for labels, the combination reads as "someone who takes their work seriously but doesn't wear a tie." The serif projects expertise; the mono projects precision; the sans stays invisible.

### Hierarchy
- **Display** (300, clamp(1.5rem, 5vw, 3.75rem), leading 0.92, tracking -0.04em): Landing page hero, onboarding step headlines. Italic variants carry the gold accent color for emphasis words.
- **Headline** (300, 1.5rem, leading 1.05, tracking -0.02em): Page titles within the app ("Schedule", "Members", "Reports"). Light weight signals calm authority.
- **Body** (400, 0.875rem, leading 1.55): Booking detail descriptions, member names in lists, form hint text. Geist sans-serif, never exceeding 65ch line length.
- **Label** (500, 0.5rem, leading 1.4, tracking 0.08em, uppercase): Monospace. Section headers ("NEXT UP"), KPI labels ("TODAY"), filter chips, status tags, navigation labels. The smallest readable text in the system. Always uppercase, always tracked wide.
- **Data** (400, 0.6875rem, leading 1.1): Monospace. Booking times ("10:00"), court identifiers ("C2"), member initials in the schedule grid. Not uppercase; set at their natural case.

### Named Rules
**The Mono Is Structure Rule.** Monospace text carries structural information: times, counts, prices, labels, statuses. If the content answers "when," "how many," or "what state," it is monospace. Body text is never monospace.

## 4. Elevation

Court Books is a flat system. Depth is conveyed through tonal layering (Manila Paper → Manila Paper 2 → Warm Cream), not shadows. The only shadow in the system is `shadow-lg` on the header dropdown menu, where the overlay demands separation from the content beneath it.

Bottom sheets use a semi-transparent overlay (`bg-ink/30`) and rounded top corners to separate from the main surface. This is structural, not decorative: the sheet physically slides up from the bottom edge, and the rounded corner signals "I am a separate layer."

### Shadow Vocabulary
- **Menu shadow** (`0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)`): Header dropdown only. Tight, warm-tinted. If a shadow appears elsewhere, the design has drifted.

### Named Rules
**The Flat Desk Rule.** Surfaces sit flat on the desk. No floating cards, no lifted elements, no ambient glow. Tonal steps (Paper → Paper 2 → Cream) create hierarchy. A shadow means "this is temporary and will go away" (dropdown menus, bottom sheets). Permanent UI never casts a shadow.

## 5. Components

### Buttons
- **Shape:** Gently rounded corners (8px radius). Not pill-shaped; pills are reserved for chips and filter toggles.
- **Primary:** Warm Charcoal fill, Manila Paper text, 12px vertical / 20px horizontal padding, font-sans text-xs font-medium. The default action button.
- **Hover:** Warm Charcoal 2 fill. Subtle darkening, no scale or transform.
- **Secondary:** Transparent fill, Hairline border, Warm Charcoal 3 text. Cancel, dismiss, back actions.
- **Signal:** Court Surface Green fill, Manila Paper text. Positive confirmations: "Check In," "Confirm."
- **Danger:** Transparent fill, Clay Red border, Clay Red text. Destructive: "No-show," "Cancel booking."
- **CTA (landing/onboarding):** Full-width, taller padding (16px vertical), flex layout with label left and monospace arrow right. Used only on non-app surfaces.

### Chips
- **Style:** Pill-shaped (999px radius), monospace label at 9px, uppercase, wide tracking.
- **Active:** Warm Charcoal fill, Manila Paper text.
- **Inactive:** Manila Paper 2 fill, Warm Charcoal 3 text. No border.
- **Context:** Court filters ("All", "C1", "C2"), period selectors ("7d", "30d"), member filters ("Regular", "VIP", "Lapsed"), time filters ("Now", "Earlier").

### Status Tags
- **Shape:** Slightly rounded (4px radius), compact padding (2px 6px). Monospace, 8px, uppercase, tracked.
- **Confirmed:** Gold Soft background, dark gold text.
- **Pending:** Warm tan background (`#F4E1D8`), burnt sienna text (`#8A4A2D`).
- **Checked In:** Soft green background (`#D8E5DD`), Court Surface Green text.
- **No-show:** Soft red background (`#F4D8D8`), Clay Red text.
- **Cancelled:** Manila Paper 2 background, Warm Charcoal 3 text.
- Every tag pairs color with a text label. Color alone never carries status meaning.

### Bottom Sheets
- **Trigger:** Tap on a booking row, FAB button, or add-member action.
- **Structure:** Fixed overlay with `bg-ink/30` backdrop. Sheet slides from bottom with `rounded-t-2xl` (16px top corners). Drag handle: 40px wide, 4px tall, Hairline color, pill-shaped, centered.
- **Dismissal:** Tap overlay or close button. No swipe-to-dismiss in the current implementation.
- **Content:** Title + meta line at top, action buttons at bottom, content fills the middle. Max height 85vh with internal scroll.

### Inputs
- **Style:** Manila Paper fill, Hairline border, 8px radius, 12px vertical / 16px horizontal padding, font-sans text-sm.
- **Focus:** Border shifts to Warm Charcoal. No glow, no scale. Outline suppressed.
- **Search variant:** Manila Paper 2 fill, no border, inline SVG search icon, monospace placeholder at 10px.

### Navigation (Bottom)
- **Structure:** Fixed at viewport bottom, 64px tall, Manila Paper fill, Hairline top border. Grid columns match visible item count (role-dependent).
- **Items:** Centered column layout, 20px SVG icon above 8px monospace uppercase label.
- **Active:** Warm Charcoal text, 2px Gold accent bar at top edge of the item.
- **Inactive:** Warm Charcoal 3 text, no accent bar.
- **Staff variant:** Reduced item set (Check-in, Today, Walk-in, Account). No Reports, Members, or Settings.

### Schedule Grid
- **Structure:** CSS grid with time column (40px) and one column per court. Hairline borders between cells. Header row in Manila Paper 2.
- **Booked cell:** Warm Charcoal fill, Manila Paper text, member initials in monospace 8px.
- **Recurring cell:** Court Line Gold fill, Warm Charcoal text, "Rec" label.
- **Open cell:** Manila Paper fill, Warm Charcoal 4 em dash. Hover shifts to Manila Paper 2.
- **Legend:** Three inline swatches (Booked/Recurring/Open) with monospace labels, below the grid.

## 6. Do's and Don'ts

### Do:
- **Do** use Manila Paper (`#FCFAF5`) as the default content surface, never pure white.
- **Do** keep Court Line Gold under 10% of any screen. It marks active states and key figures.
- **Do** use monospace for all structural data: times, prices, counts, labels, statuses.
- **Do** use bottom sheets for contextual detail. They preserve spatial context better than full-screen modals on mobile.
- **Do** maintain 44px minimum touch targets for all interactive elements, including status tag action buttons.
- **Do** show a text label alongside every color-coded status. Color is a reinforcement, not the signal.
- **Do** use tonal layering (Paper → Paper 2 → Cream) for depth instead of shadows.

### Don't:
- **Don't** use pure black (`#000000`) or pure white (`#ffffff`). Every neutral is warm-tinted.
- **Don't** build layouts that look like CourtReserve, Skedda, or Playtomic: overbuilt dashboards, feature-count marketing, desktop-first grids.
- **Don't** use generic Bootstrap or Material admin patterns: gray sidebars, blue primary buttons, identical card grids with icon-heading-text.
- **Don't** add neon gradients, mascot illustrations, or gamification badges. Court Books serves operators, not players scrolling for fun.
- **Don't** use side-stripe borders (border-left/right > 1px as accent). Rewrite with background tints or full borders.
- **Don't** use gradient text (`background-clip: text`). Emphasis through weight or the gold accent color.
- **Don't** reach for modals. Bottom sheets for mobile; inline expansion for settings.
- **Don't** add shadows to permanent UI elements. Shadows mean "temporary" (dropdown menus, sheets).
- **Don't** use Fraunces for body text or long passages. It is a display and headline font only.
- **Don't** set monospace text in sentence case for labels. Labels are always uppercase with wide tracking.

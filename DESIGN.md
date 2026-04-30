---
name: Court Books
description: Pickleball court booking PWA for Philippine facilities
colors:
  primary: "#3B82F6"
  primary-deep: "#2563EB"
  primary-soft: "#DBEAFE"
  primary-faint: "#EFF6FF"
  surface: "#FFFFFF"
  surface-2: "#F8FAFC"
  surface-3: "#F1F5F9"
  bg: "#F8FAFC"
  ink: "#0F172A"
  ink-2: "#334155"
  ink-3: "#64748B"
  ink-4: "#94A3B8"
  line: "#E2E8F0"
  line-2: "#F1F5F9"
  signal: "#10B981"
  signal-soft: "#D1FAE5"
  signal-text: "#065F46"
  warn: "#EF4444"
  warn-soft: "#FEE2E2"
  warn-text: "#991B1B"
  amber: "#F59E0B"
  amber-soft: "#FEF3C7"
  amber-text: "#92400E"
  pending-bg: "#FFF7ED"
  pending-text: "#C2410C"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(1.75rem, 5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  card: "16px"
  pill: "999px"
  button: "12px"
  input: "12px"
  chip: "999px"
  tag: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.button}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
  button-secondary:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.button}"
    padding: "12px 24px"
  button-danger:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.button}"
    padding: "12px 24px"
  button-signal:
    backgroundColor: "{colors.signal}"
    textColor: "#FFFFFF"
    rounded: "{rounded.button}"
    padding: "12px 24px"
  chip-active:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.chip}"
    padding: "6px 14px"
  chip-inactive:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink-3}"
    rounded: "{rounded.chip}"
    padding: "6px 14px"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "12px 16px"
  status-tag-confirmed:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.tag}"
    padding: "4px 10px"
  status-tag-pending:
    backgroundColor: "{colors.pending-bg}"
    textColor: "{colors.pending-text}"
    rounded: "{rounded.tag}"
    padding: "4px 10px"
  status-tag-checked-in:
    backgroundColor: "{colors.signal-soft}"
    textColor: "{colors.signal-text}"
    rounded: "{rounded.tag}"
    padding: "4px 10px"
  status-tag-no-show:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn-text}"
    rounded: "{rounded.tag}"
    padding: "4px 10px"
  nav-item-active:
    textColor: "{colors.primary}"
  nav-item-inactive:
    textColor: "{colors.ink-3}"
---

# Design System: Court Books

## 1. Overview

**Creative North Star: "The Social Court"**

Court Books feels like a modern social app that happens to manage courts. Think Instagram's clean surfaces, Facebook's confident blues, and the comfort of an app you open twenty times a day without friction. Bold typography, vibrant-but-soft accent colors, generous white space, and rounded surfaces that feel approachable on every tap.

The system is confident without being corporate. The primary blue is present and unapologetic; it carries CTAs, active states, and the brand itself. Surfaces are clean white and cool slate, never yellowed or themed to the point of fatigue. Status colors are vibrant but always paired with soft tinted backgrounds that prevent eye strain.

This system rejects the North American SaaS booking template (CourtReserve, Skedda), enterprise scheduling tools (Calendly, Acuity), and overly retro or papery aesthetics. Court Books is a modern product, not a vintage ledger.

**Key Characteristics:**
- Clean white surfaces with a bold blue primary accent
- Single sans-serif typeface (Inter) for everything: bold for headlines, medium for labels, regular for body
- Generous border radius on all interactive elements (12px buttons, 16px cards)
- Vibrant semantic colors on soft tinted backgrounds (blue/green/amber/red)
- Mobile-first (max 425px), designed for one-handed standing use
- Bottom sheets over modals; inline actions over popups
- Subtle shadows for elevation, not just tonal layering

## 2. Colors

A modern, social-app palette. Cool slate neutrals keep the interface calm. The primary blue is bold enough to anchor every screen without overwhelming it. Semantic colors are vivid but always sit on pastel-tinted backgrounds so they pop without glaring.

### Primary
- **Court Blue** (`#3B82F6`): The brand color. Buttons, active nav, selected chips, links, the accent bar. Present on every screen. Confident, not shy.
- **Court Blue Deep** (`#2563EB`): Hover and pressed states. Focus rings. Slightly darker for interactive feedback.
- **Court Blue Soft** (`#DBEAFE`): Confirmed status tag background, selected item highlights, light tint for emphasis areas.
- **Court Blue Faint** (`#EFF6FF`): Barely-there tint for hover backgrounds on rows, subtle section emphasis.

### Neutral
- **Surface** (`#FFFFFF`): Primary content surface. Cards, bottom sheets, inputs, bottom nav.
- **Surface 2** (`#F8FAFC`): Page background. The color behind the content. Cool, barely visible.
- **Surface 3** (`#F1F5F9`): Inactive chips, secondary buttons, search bars, KPI card fills. One step up from the background.
- **Ink** (`#0F172A`): Primary text. Headlines, body text, active elements. Deep slate, not pure black.
- **Ink 2** (`#334155`): Secondary text. Descriptions, subtitles, form labels.
- **Ink 3** (`#64748B`): Tertiary text. Placeholders, inactive nav, timestamps.
- **Ink 4** (`#94A3B8`): Disabled text, ghost elements, lightest readable text.
- **Line** (`#E2E8F0`): Borders, dividers, card outlines. Cool and subtle.
- **Line 2** (`#F1F5F9`): Faintest dividers, inner separators within cards.

### Semantic
- **Signal Green** (`#10B981`): Check-in button, success states, online indicator. Vibrant emerald.
- **Signal Soft** (`#D1FAE5`): Checked-in status tag background.
- **Signal Text** (`#065F46`): Text on signal-soft backgrounds.
- **Warn Red** (`#EF4444`): No-show, cancel, destructive actions. Clear and urgent.
- **Warn Soft** (`#FEE2E2`): No-show tag background, danger button fill.
- **Warn Text** (`#991B1B`): Text on warn-soft backgrounds.
- **Amber** (`#F59E0B`): Recurring bookings, warnings that aren't errors.
- **Amber Soft** (`#FEF3C7`): Recurring booking tag background.
- **Amber Text** (`#92400E`): Text on amber-soft backgrounds.
- **Pending BG** (`#FFF7ED`): Pending status background. Warm orange tint.
- **Pending Text** (`#C2410C`): Pending status text.

### Named Rules
**The Confident Blue Rule.** Court Blue is the visual anchor of every screen. It carries buttons, active states, and key actions. Unlike a restrained accent, it's meant to be seen; the system looks incomplete without it.

## 3. Typography

**Primary Font:** Inter (with system sans-serif fallback)

**Character:** Inter is the workhorse of modern product design. Clean, highly legible at every size, with excellent weight range. Used for everything: bold and large for impact, medium for structure, regular for reading. No serif, no mono. One family, many weights, total consistency. The same typeface Facebook, Linear, and Vercel use, because it works.

### Hierarchy
- **Display** (700, clamp(1.75rem, 5vw, 3rem), leading 1.1, tracking -0.025em): Landing page hero, onboarding headlines. Bold and large. Color emphasis via the blue primary, not italic.
- **Headline** (600, 1.25rem, leading 1.2, tracking -0.015em): Page titles ("Schedule", "Members"). Semi-bold, compact, modern.
- **Title** (600, 1rem, leading 1.3): Card headers, section labels, dialog titles. Same weight as headline, smaller.
- **Body** (400, 0.875rem, leading 1.5): Descriptions, member names, form text. Regular weight, comfortable reading.
- **Label** (500, 0.75rem, leading 1.4, tracking 0.01em): Navigation items, filter chips, status tags, KPI labels. Medium weight, not uppercase (unlike the old system). Sentence case reads more naturally.
- **Caption** (400, 0.6875rem, leading 1.3): Timestamps, secondary metadata, helper text. Regular weight, slightly muted color.

### Named Rules
**The One Family Rule.** Inter for everything. No serif for "authority." No monospace for "data." Weight and size create hierarchy, not font family switches. If a number needs emphasis, make it bigger and bolder, not monospace.

## 4. Elevation

Court Books uses subtle shadows to create comfortable depth. Cards float gently above the background. Active overlays (sheets, dropdowns) cast larger shadows. The system is not flat; it has just enough lift to feel modern and touchable.

### Shadow Vocabulary
- **Card** (`0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`): Default card elevation. Barely there. Makes cards feel like objects, not painted rectangles.
- **Card hover** (`0 4px 12px rgba(0,0,0,0.08)`): Interactive cards on hover. Slight lift.
- **Dropdown** (`0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)`): Menus, popovers. Clear separation from content.
- **Sheet** (`0 -4px 25px rgba(0,0,0,0.1)`): Bottom sheets. Shadow casts upward.

### Named Rules
**The Gentle Lift Rule.** Every card and container has a subtle shadow. Shadows are soft and diffuse, never hard-edged. The goal is "comfortable depth," not "floating in space." Flat surfaces are acceptable only for inline elements (list rows, form fields).

## 5. Components

### Buttons
- **Shape:** Generously rounded (12px radius). Feels modern and tappable.
- **Primary:** Court Blue fill, white text, 12px vertical / 24px horizontal padding. font-sans text-sm font-semibold. The main action.
- **Hover:** Court Blue Deep fill. Slight scale transform optional.
- **Secondary:** Surface 3 fill, Ink 2 text. No border. Background-only differentiation.
- **Signal:** Signal Green fill, white text. Positive confirmations.
- **Danger:** Warn Soft fill, Warn Red text. Destructive actions feel serious but not aggressive.
- **CTA:** Full-width, taller padding (14px vertical), Court Blue fill.

### Chips
- **Style:** Pill-shaped (999px radius), font-sans text-xs font-medium, 6px vertical / 14px horizontal padding.
- **Active:** Court Blue fill, white text.
- **Inactive:** Surface 3 fill, Ink 3 text.
- **Transition:** Background and color transition 150ms ease.

### Status Tags
- **Shape:** Rounded (8px radius), 4px vertical / 10px horizontal padding. font-sans text-xs font-medium.
- **Confirmed:** Blue Soft bg, Blue Deep text.
- **Pending:** Pending BG, Pending Text.
- **Checked In:** Signal Soft bg, Signal Text.
- **No-show:** Warn Soft bg, Warn Text.
- **Cancelled:** Surface 3 bg, Ink 3 text.
- Every tag pairs color with a text label.

### Bottom Sheets
- **Overlay:** `bg-black/30` backdrop with blur(4px).
- **Sheet:** White surface, `rounded-t-2xl` (16px), sheet shadow. Drag handle: 40px wide, 4px tall, Line color, pill-shaped.
- **Content:** Max height 85vh with internal scroll.

### Inputs
- **Style:** White fill, Line border, 12px radius, 12px vertical / 16px horizontal padding, font-sans text-sm.
- **Focus:** Border shifts to Court Blue. Ring: 2px Court Blue Soft glow. Clean and clear.
- **Search variant:** Surface 3 fill, no border, inline search icon, placeholder in Ink 3.

### Navigation (Bottom)
- **Structure:** Fixed bottom, 64px tall, white fill, Line top border, subtle card shadow upward.
- **Items:** Centered column, 20px icon above text-xs font-medium label.
- **Active:** Court Blue icon and text, 2px Court Blue bar at top.
- **Inactive:** Ink 3 icon and text.

### Schedule Grid
- **Structure:** Rounded card with card shadow. Time column + court columns.
- **Booked cell:** Court Blue fill, white text, initials in text-xs font-medium.
- **Recurring cell:** Amber fill, white text, "Rec" label.
- **Open cell:** Surface fill, Ink 4 dash. Hover shifts to Blue Faint.
- **Legend:** Inline swatches below grid.

## 6. Do's and Don'ts

### Do:
- **Do** use white (`#FFFFFF`) for content surfaces and Court Blue for primary actions.
- **Do** use Inter for everything. Weight and size create hierarchy.
- **Do** use generous border radius (12px buttons, 16px cards, 8px tags) for a modern feel.
- **Do** use subtle shadows on cards and containers for comfortable depth.
- **Do** use vibrant semantic colors on soft tinted backgrounds (blue-on-light-blue, green-on-light-green).
- **Do** maintain 44px minimum touch targets.
- **Do** show a text label alongside every color-coded status.
- **Do** use sentence case for labels and navigation, not uppercase.

### Don't:
- **Don't** use cream, amber-tinted, or papery backgrounds. The system is cool and modern, not warm and vintage.
- **Don't** use serif fonts. No Fraunces, no Georgia. Inter only.
- **Don't** use monospace fonts for data or labels. Inter handles numbers and labels.
- **Don't** use uppercase tracking-wide labels. Sentence case is more modern and readable.
- **Don't** build layouts that look like CourtReserve, Skedda, or Playtomic.
- **Don't** use side-stripe borders or gradient text.
- **Don't** use neon gradients, mascot illustrations, or gamification badges.
- **Don't** use flat tonal layering without shadows. Cards should have gentle lift.
- **Don't** use gold or amber as the primary accent. Court Blue is the brand color.

# Product

## Register

product

## Users

Filipino pickleball facility owners and their floor staff. Owners run 1 to 10 courts, often in converted warehouses or gym annexes in Metro Manila. They are the admin, the marketer, and sometimes the person handing out paddles. Staff handle check-in and court turnover; they use the app standing up, one-handed, between conversations with players. Both are price-sensitive, phone-first, and allergic to software that feels like homework.

## Product Purpose

Court Books replaces spreadsheets, Messenger threads, and paper logs with a single booking system built for Philippine pickleball facilities. Staff manage bookings, track members, attach equipment rentals, and monitor court utilization. Payment collection stays at the counter; the app is the record, not the register.

Success looks like: a facility owner opens the app with morning coffee, sees today's bookings in three seconds, and closes it. A staff member checks in a walk-in player in two taps. Neither ever needs to call for help.

## Brand Personality

**Confident, friendly, modern.**

Court Books speaks with the assurance of someone who runs courts for a living. Not corporate, not startup-cute. The tone is a competent friend who happens to be good with systems. Filipino warmth without the clutter. Direct without being curt. Technical details (court IDs, hourly rates, booking counts) are presented plainly, never buried under decorative UI.

## Anti-references

- **CourtReserve, Skedda, Playtomic.** North American/European booking tools: overbuilt dashboards, feature-count marketing, USD-centric pricing, desktop-first layouts squeezed into mobile viewports.
- **Generic Bootstrap/Material admin panels.** Gray sidebars, identical card grids, blue primary buttons. No personality, no opinion. The "starter template" look.
- **Enterprise scheduling tools (Calendly, Acuity).** Optimized for solo professionals and virtual meetings, not physical courts with walk-in traffic.
- **Overly playful sports apps.** Neon gradients, mascot illustrations, gamification badges. Court Books serves operators, not players scrolling for fun.

## Design Principles

1. **Glanceable, not studyable.** Every screen answers its question in under three seconds. If the owner has to scroll to understand today's status, the design failed.
2. **Staff-speed interactions.** Booking, check-in, and member lookup are done standing up with one hand. Two taps maximum for the core action on any screen.
3. **Modern comfort.** The app feels like opening Instagram or Facebook: clean surfaces, bold blue accents, soft rounded corners, vibrant but easy on the eyes. Not vintage, not corporate; the kind of app you'd show a friend.
4. **Filipino-first, not localized-second.** PHP currency, local payment context, operating hours that match Manila schedules, copy that assumes the user's reality. Not a translated American product.
5. **Offline-ready by default.** The app works without connectivity. Sync is invisible when it works; honest when it can't.

## Accessibility & Inclusion

- WCAG 2.1 AA as the baseline. Warm palette must clear 4.5:1 contrast on all text.
- Touch targets minimum 44x44px for all interactive elements (staff use the app with sweaty hands in noisy environments).
- Reduced motion support: respect `prefers-reduced-motion` for all transitions.
- No color-only status indicators; every status tag pairs color with a text label.

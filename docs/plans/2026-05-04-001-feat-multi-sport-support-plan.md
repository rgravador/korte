---
title: "feat: Add multi-sport support with per-sport hours and settings"
type: feat
status: active
date: 2026-05-04
origin: docs/brainstorms/2026-05-04-multi-sport-support-requirements.md
---

# Plan: Add Multi-Sport Support

## Overview

Add a Sport entity so facilities can manage multiple sports (Pickleball, Basketball, Badminton, etc.), each with their own courts, operating hours, and dedicated settings page. The schedule, booking, and dashboard pages filter by sport. Single-sport tenants see no added complexity.

---

## Problem Frame

Facilities running multiple sports see all courts in a flat list. Staff mentally filter which courts belong to which sport. This causes cluttered schedules, slow booking for walk-ins, and confusion. The solution: sport as a first-class entity that each court belongs to, with sport-level filtering and per-sport operating hours. (see origin: `docs/brainstorms/2026-05-04-multi-sport-support-requirements.md`)

---

## Requirements Trace

- R1. Add sports from preset list (Pickleball, Badminton, Basketball, Tennis, Volleyball, Table Tennis)
- R2. Add custom sports by name
- R3. Deactivate/remove sport (guard against courts still assigned)
- R4. Each court belongs to exactly one sport
- R5. Court's sport changeable in Settings; doesn't affect existing bookings
- R6. Sport filter shown when tenant has 2+ active sports
- R7. Selecting sport filters all court data on the page
- R8. Sport filter defaults to first sport, remembers selection in session
- R9. Single-sport tenants: filter hidden, behaves as today
- R10. Court colors scoped per sport
- R11. Onboarding: select sports after facility name
- R12. Onboarding: per-sport court setup (sequential)
- R13. Each sport has own operating hours (TimeRange[])
- R14. Schedule/booking show only that sport's hours
- R15. Tenant global hours = facility max range; sports define subsets
- R16. Single-sport: sport hours replace tenant hours UI
- R17. Onboarding: hours set per sport
- R18. Settings: sports listed as tappable cards
- R19. Sport config page: name, hours, courts
- R20. Courts managed only within sport config (no flat list)
- R21. Adding sport → immediately opens its config page
- R22. Single-sport: inline config on main Settings page

**Origin actors:** A1 (Tenant Admin), A2 (Staff), A3 (Walk-in Customer)
**Origin flows:** F1 (Add sport), F2 (Assign court), F3 (Book for walk-in), F4 (Single-sport experience)
**Origin acceptance examples:** AE1 (R6,R9), AE2 (R6,R7), AE3 (R3), AE4 (R9), AE5 (R13,R14), AE6 (R16,R22), AE7 (R18,R19,R20), AE8 (R21)

---

## Scope Boundaries

- Sport-specific booking rules (min duration, equipment) — deferred
- Sport-specific pricing beyond court hourly rate — deferred (each court already has its own rate)
- Public-facing sport selection for online booking — deferred
- Sport-level analytics in reports — deferred
- Sport icons/emoji — deferred

---

## Context & Research

### Relevant Code and Patterns

- `src/lib/types.ts` — Sport interface will follow Court/Tenant pattern (id, tenantId, name, isActive, createdAt)
- `src/lib/db.ts` — New `toSport` mapper, `dbGetSports`, `dbAddSport`, `dbUpdateSport`, `dbRemoveSport`; modify `toCourt` to include `sportId`; modify `dbHydrateTenant` to load sports
- `src/store/index.ts` — Add `sports: Sport[]` to state, add CRUD mutations, modify `hydrateFromRemote` to include sports
- `src/components/operating-hours-editor.tsx` — Reusable as-is for sport hours
- `src/components/time-select.tsx` — Reusable as-is
- `src/app/settings/page.tsx` — Current flat sections (Facility, Courts, Items, Staff, Connection); Courts and hours sections will be restructured per-sport
- `src/app/schedule/page.tsx` — `getOperatingHours(tenant)` will change to `getOperatingHours(selectedSport)` or similar
- `src/app/api/auth/register/route.ts` — Atomic onboarding; will need to create sports alongside courts

### Institutional Learnings

- Operating hours already support multiple TimeRange windows (added in prior work) — sports can reuse this pattern directly
- Store is DB-first (all mutations await API before updating local state) — sport mutations follow same pattern
- Realtime subscriptions exist for bookings — sports/courts are low-frequency, poll-based refresh is sufficient

---

## Key Technical Decisions

- **Sport entity on Court, not a junction table:** Since each court belongs to exactly one sport (R4), a `sportId` FK on `courts` is simpler than a many-to-many `sport_courts` table. Court's hourly rate stays on the court itself (no per-sport pricing override needed).
- **Operating hours move from Tenant to Sport:** Sport gets `operatingHoursRanges: TimeRange[]`. Tenant keeps legacy fields for migration backward compat but they are no longer the source of truth for schedule/booking.
- **Migration: auto-create "Pickleball" sport for existing tenants:** On first hydrate, if tenant has courts but no sports, create a "Pickleball" sport with the tenant's existing hours and assign all courts to it. This is a data migration in Supabase.
- **Sport filter stored in Zustand (session-scoped):** `selectedSportId: string | null` in the store. Persisted to sessionStorage so it survives page navigations but resets on new session.
- **Sport config page is a client-side route, not a separate Next.js page:** `/settings` renders sport list; tapping a sport shows sport config as a sub-view (state-driven, not route-driven). Avoids adding new pages to the nav.
- **Court colors reset per sport:** When filtering by sport, court color index starts at 0 for that sport's courts, not the global position.

---

## Open Questions

### Resolved During Planning

- **Migration strategy for existing courts:** Auto-assign to "Pickleball" sport. Tenant's existing `operatingHoursRanges` copied to the sport. (User decision)
- **Sport filter persistence:** sessionStorage via Zustand persist (same mechanism as other state). Resets on new session.
- **Court color scoping:** Reset index per sport. When "All" sports shown, global index across all active courts.

### Deferred to Implementation

- Exact Supabase migration SQL for adding `sports` table and `sport_id` column to `courts`
- Whether `getOperatingHours()` helper accepts Sport or Tenant (likely Sport with Tenant fallback)
- Exact preset sport list ordering

---

## Implementation Units

- U1. **Sport type + helpers in types.ts**

**Goal:** Define the Sport interface and update operating hours helpers to work with Sport or Tenant.

**Requirements:** R1, R2, R13, R14, R15

**Dependencies:** None

**Files:**
- Modify: `src/lib/types.ts`

**Approach:**
- Add `Sport` interface: `id, tenantId, name, operatingHoursRanges: TimeRange[], isActive, createdAt`
- Add `sportId: string` to `Court` interface
- Update `getOperatingHours()` and `getTimeRanges()` to accept `Sport | Tenant` (both have `operatingHoursRanges` and legacy fields)

**Patterns to follow:**
- Existing `TimeRange`, `Tenant`, `Court` interfaces in same file

**Test scenarios:**
- Happy path: `getOperatingHours()` with a Sport that has `operatingHoursRanges: [{start:6,end:12}]` returns `[6,7,8,9,10,11]`
- Happy path: `getOperatingHours()` with a Tenant (backward compat) still works
- Edge case: Sport with multiple ranges returns merged sorted hours with no duplicates
- Edge case: Sport with empty `operatingHoursRanges` falls back to legacy start/end

**Verification:**
- TypeScript compiles with no errors. All existing code that calls `getOperatingHours(tenant)` still works.

---

- U2. **DB layer: Sport CRUD + Court sportId**

**Goal:** Add database functions for sports and update court functions to include sportId.

**Requirements:** R1, R2, R3, R4, R5, R13

**Dependencies:** U1

**Files:**
- Modify: `src/lib/db.ts`

**Approach:**
- Add `toSport()` mapper (snake_case → camelCase)
- Add `dbGetSports(sb, tenantId)`, `dbAddSport(sb, data)`, `dbUpdateSport(sb, sportId, updates)`, `dbRemoveSport(sb, sportId)`
- Update `toCourt()` to map `r.sport_id` → `court.sportId`
- Update `dbAddCourt()` to accept and insert `sport_id`
- Update `dbHydrateTenant()` to load sports in the `Promise.all` alongside courts/members/etc.
- dbRemoveSport guards: check if sport has courts before allowing delete

**Patterns to follow:**
- Existing `dbGetCourts`, `dbAddCourt`, `toCourt` patterns in db.ts

**Test scenarios:**
- Happy path: `dbAddSport()` creates sport, returns Sport object
- Happy path: `dbGetSports()` returns all sports for tenant
- Happy path: `dbHydrateTenant()` now returns `{ tenant, users, courts, items, members, bookings, sports }`
- Error path: `dbRemoveSport()` with courts assigned returns error/null
- Happy path: `dbAddCourt()` with sportId persists correctly
- Happy path: Existing courts returned by `dbGetCourts()` include sportId field

**Verification:**
- TypeScript compiles. Hydrate returns sports. Court objects include sportId.

---

- U3. **API routes for sports**

**Goal:** Add REST endpoints for sport CRUD and update existing endpoints for sport awareness.

**Requirements:** R1, R2, R3, R4, R18, R21

**Dependencies:** U2

**Files:**
- Create: `src/app/api/sports/route.ts`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/hydrate/route.ts`
- Modify: `src/app/api/courts/route.ts`

**Approach:**
- New `/api/sports` route: GET (list by tenantId), POST (create), PATCH (update name/hours/isActive), DELETE (remove with guard)
- Update `/api/auth/register` to accept `sports[]` array with `{ name, operatingHoursRanges }` and create sports, then assign courts to sports by index
- Update `/api/hydrate` response to include `sports` field
- Update `/api/courts` POST to require `sportId`
- All routes use `export const dynamic = 'force-dynamic'`

**Patterns to follow:**
- Existing route patterns in `src/app/api/courts/route.ts`

**Test scenarios:**
- Happy path: POST `/api/sports` creates sport, returns Sport
- Happy path: GET `/api/sports?tenantId=X` returns list
- Happy path: DELETE `/api/sports` with no courts succeeds
- Error path: DELETE `/api/sports` with assigned courts returns 400 + message
- Happy path: Register with sports array creates tenant + sports + courts with sportId
- Happy path: Hydrate returns sports array

**Verification:**
- All API routes return correct shape. Register flow creates sports atomically.

---

- U4. **Store: sports state + mutations + selectedSportId**

**Goal:** Add sports to the Zustand store with CRUD mutations and a session-scoped sport filter.

**Requirements:** R1, R2, R3, R6, R7, R8, R9

**Dependencies:** U1, U3

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/lib/api.ts`

**Approach:**
- Add `apiGetSports`, `apiAddSport`, `apiUpdateSport`, `apiRemoveSport`, `apiCheckSportName` to api.ts
- Add to store state: `sports: Sport[]`, `selectedSportId: string | null`
- Add mutations: `addSport`, `updateSport`, `removeSport`, `setSelectedSport`
- Update `hydrateFromRemote` to accept and set `sports`
- `selectedSportId` defaults to first sport or null; persisted in sessionStorage
- Add computed helper: `getActiveSports()` returns `sports.filter(s => s.isActive)`
- Update `partialize` to include `sports` and `selectedSportId`

**Patterns to follow:**
- Existing DB-first mutation pattern (await API, throw on failure, update local state)

**Test scenarios:**
- Happy path: addSport calls API, updates store sports array
- Happy path: removeSport guards against courts assigned
- Happy path: hydrateFromRemote sets sports from server
- Happy path: selectedSportId persists across page navigations (sessionStorage)
- Edge case: Tenant with 1 sport → selectedSportId auto-set, no filter shown
- Edge case: Last sport deactivated → selectedSportId set to null

**Verification:**
- Store has sports. selectedSportId drives filtering. Session persistence works.

---

- U5. **Sport filter component**

**Goal:** Create a reusable sport filter pill bar that appears when 2+ sports exist.

**Requirements:** R6, R7, R8, R9

**Dependencies:** U4

**Files:**
- Create: `src/components/sport-filter.tsx`

**Approach:**
- Reads `sports` and `selectedSportId` from store
- Renders horizontal pill bar (same style as court chips) when `sports.length >= 2`
- Renders nothing when `sports.length <= 1` (R9)
- Tapping a sport calls `setSelectedSport(sportId)`
- Shows sport name; active sport highlighted with primary color
- Scrollable on mobile (`overflow-x-auto hide-scrollbar`)

**Patterns to follow:**
- Court filter chips in schedule page (style, layout, interaction)

**Test scenarios:**
- Covers AE1. Single sport → filter not rendered
- Covers AE2. Two sports → both pills shown, tapping filters
- Covers AE4. Adding second sport → filter appears
- Happy path: Active sport pill highlighted, inactive dimmed
- Happy path: Selection persists when navigating between pages

**Verification:**
- Component renders conditionally. Tapping updates selectedSportId in store.

---

- U6. **Schedule page: sport-aware filtering and hours**

**Goal:** Schedule page filters courts and hours by selected sport.

**Requirements:** R6, R7, R10, R13, R14

**Dependencies:** U4, U5

**Files:**
- Modify: `src/app/schedule/page.tsx`

**Approach:**
- Import and render `SportFilter` above court chips
- Replace `getOperatingHours(tenant)` with hours from the selected sport (or tenant fallback for single-sport)
- Filter `activeCourts` by `selectedSportId` when set
- Court color index resets per sport: `courtColorMap` built from sport-filtered courts only
- Mobile time-first view and desktop grid both use filtered courts + sport hours
- When no sport selected (shouldn't happen with auto-default), fall back to all courts

**Patterns to follow:**
- Existing courtFilter pattern in schedule page

**Test scenarios:**
- Covers AE2. Selecting "Basketball" shows only basketball courts
- Covers AE5. Pickleball hours (6AM-12NN) → grid shows only those hours. Switch to Basketball (2PM-10PM) → grid changes.
- Happy path: Court colors reset when switching sports (C1 of each sport gets color index 0)
- Edge case: Sport with 0 courts shows empty state
- Integration: Sport filter + court filter + date filter all compose correctly

**Verification:**
- Schedule grid shows only the selected sport's courts and hours. Colors are per-sport.

---

- U7. **Booking page: sport-aware court and hours selection**

**Goal:** Booking page filters courts and time slots by selected sport.

**Requirements:** R6, R7, R14

**Dependencies:** U4, U5

**Files:**
- Modify: `src/app/booking/new/page.tsx`

**Approach:**
- Import and render `SportFilter` above court selection
- Filter `activeCourts` by selected sport
- Replace `getOperatingHours(tenant)` with selected sport's hours
- When navigating from schedule with `?court=X`, auto-select that court's sport
- Court rate display unchanged (rate is on court, not sport)

**Patterns to follow:**
- Existing court selection and hours computation in booking page

**Test scenarios:**
- Happy path: Sport filter shown, selecting sport filters court buttons
- Happy path: Operating hours change when switching sports
- Happy path: Deep link from schedule (`?court=X`) auto-selects correct sport
- Edge case: No courts for selected sport shows empty state with message

**Verification:**
- Booking flow works end-to-end with sport filtering. Hours match selected sport.

---

- U8. **Dashboard page: sport-aware bookings and KPIs**

**Goal:** Dashboard filters today's bookings and KPIs by selected sport.

**Requirements:** R6, R7

**Dependencies:** U4, U5

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Approach:**
- Import and render `SportFilter` above the greeting or below it
- Filter `todayBookings` by courts belonging to selected sport
- Recalculate KPIs (today count, no-shows, utilization) using sport-filtered data
- Utilization denominator uses sport's courts × sport's hours (not all courts × all hours)

**Patterns to follow:**
- Existing todayBookings filter and KPI calculation

**Test scenarios:**
- Happy path: Selecting a sport shows only that sport's bookings in "Next up"
- Happy path: KPIs reflect sport-specific data (count, no-shows, utilization)
- Covers AE1. Single sport → no filter, all bookings shown as today

**Verification:**
- Dashboard KPIs and booking list change when sport filter is toggled.

---

- U9. **Settings page: sport config sub-view**

**Goal:** Restructure Settings to show sports as cards, with per-sport config pages for hours and courts.

**Requirements:** R3, R18, R19, R20, R21, R22

**Dependencies:** U4

**Files:**
- Modify: `src/app/settings/page.tsx`

**Approach:**
- Add state: `selectedSettingsSport: string | null` (null = main settings view)
- **Main view (selectedSettingsSport === null):**
  - Facility section: name only (hours moved to sport)
  - Sports section: list of sport cards (name, court count, hours summary). "+ Add sport" button.
  - Items section: unchanged (items are tenant-wide, not sport-specific)
  - Staff section: unchanged
  - Connection section: unchanged
- **Sport config view (selectedSettingsSport set):**
  - Back button → returns to main view
  - Sport name (editable)
  - Operating hours (OperatingHoursEditor)
  - Courts list for this sport (add, toggle, remove — same UI as current Courts section but filtered by sportId)
  - Remove sport button (guarded: shows error if courts assigned)
- **Single-sport shortcut (R22):** When `sports.length === 1`, skip the sport cards list and render the sport config inline on the main settings page (no extra tap)
- Adding a sport: create via API, then auto-select it to open its config

**Patterns to follow:**
- Current Courts/Facility sections in settings page
- OperatingHoursEditor and OperatingHoursDisplay components

**Test scenarios:**
- Covers AE6. Single sport: hours and courts shown inline on main settings
- Covers AE7. Multi-sport: sport cards shown, tapping opens per-sport config with only that sport's courts
- Covers AE8. Adding "Volleyball" immediately opens its config page
- Covers AE3. Removing sport with courts shows guard message
- Happy path: Editing sport name saves to DB
- Happy path: Adding court within sport config assigns it to that sport
- Edge case: Removing the last court from a sport is allowed (sport remains with 0 courts)

**Verification:**
- Settings restructured. Per-sport config works. Single-sport inline mode works.

---

- U10. **Onboarding: sport selection and per-sport setup**

**Goal:** Onboarding flow includes sport selection and per-sport court/hours setup.

**Requirements:** R11, R12, R17

**Dependencies:** U3, U4

**Files:**
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/app/api/auth/register/route.ts` (if not already done in U3)

**Approach:**
- Change step flow: welcome → facility (name, owner info, credentials) → **sports selection** → **per-sport setup (sequential)** → items → review
- Sports selection step: preset chips (multi-select) + custom name input. Min 1 sport required.
- Per-sport setup: for each selected sport, show: sport name (pre-filled), operating hours editor, court list (add courts with name + rate). "Next sport" button advances to the next.
- Review step: grouped by sport (sport name → hours → courts)
- `apiRegister` payload extended: `sports: [{ name, operatingHoursRanges, courts: [{name, hourlyRate}] }]`
- Remove the separate global hours setting from facility step

**Patterns to follow:**
- Current step flow with StepIndicator, state-driven rendering
- Current courts step UI (add/remove courts array)

**Test scenarios:**
- Happy path: Select 2 sports, set hours and courts for each, complete onboarding
- Happy path: Single sport selected → one setup screen, no sport filter after login
- Happy path: Custom sport name accepted alongside presets
- Edge case: Navigating back preserves sport selections and per-sport court data
- Error path: Trying to proceed without selecting any sport shows validation message
- Integration: Register API creates tenant + sports + courts atomically

**Verification:**
- Onboarding completes with sports. Dashboard shows correct sport filter. Schedule shows correct hours per sport.

---

## System-Wide Impact

- **Interaction graph:** Sport filter in store drives Schedule, Dashboard, Booking pages. Settings page has its own sport selection state (independent of the global filter). Onboarding creates sports atomically with the register endpoint.
- **Error propagation:** Sport CRUD follows existing DB-first pattern — API failure = toast error, no local state change. Removing a sport with courts is guarded at both API and UI level.
- **State lifecycle risks:** `selectedSportId` must handle: sport deleted while selected (fallback to first), sport deactivated (same), no sports (null). The `refreshFromServer` flow must include sports in the hydrate response.
- **API surface parity:** Hydrate endpoint must return sports. Register endpoint must accept sports. All existing endpoints continue to work for backward compat.
- **Integration coverage:** End-to-end: onboard with 2 sports → login → schedule shows sport filter → book on sport A → switch to sport B → schedule shows different hours and courts. Verify single-sport tenant sees no filter.
- **Unchanged invariants:** Booking model unchanged (courtId, no sportId). Member model unchanged. Item model unchanged (tenant-wide, not sport-specific). Checkin page unaffected (it works with bookings, not courts directly).

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Supabase schema migration required (new table + new column) | Migration can be done before code deploys. Existing data auto-migrated to "Pickleball" sport. |
| Single-sport conditional logic across many pages | Centralize in SportFilter component + `sports.length >= 2` check. Avoid duplicating the condition. |
| Onboarding flow complexity increases (more steps) | Keep per-sport setup sequential with clear progress. Test with 1, 2, and 3 sports. |
| Breaking change to hydrate API response shape | Add `sports` field as optional in type, default to `[]` for backward compat during rollout. |

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-04-multi-sport-support-requirements.md](docs/brainstorms/2026-05-04-multi-sport-support-requirements.md)
- Related code: `src/lib/types.ts`, `src/lib/db.ts`, `src/store/index.ts`
- Related components: `src/components/operating-hours-editor.tsx`, `src/components/time-select.tsx`

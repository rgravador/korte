---
date: 2026-05-04
topic: multi-sport-support
ticket: pending
status: draft
---

# Brainstorm: Multi-Sport Support

## Problem Frame

Facilities running Court Books often operate courts for multiple sports (pickleball, badminton, basketball, etc.) under the same roof. The current system treats all courts as a flat list with no sport association. Staff must mentally filter which courts belong to which sport when viewing the schedule, creating bookings, or answering walk-in requests. This leads to cluttered schedules, slower booking flow, and customer confusion when asking for a specific sport.

---

## Actors

- A1. Tenant Admin: Manages facility setup. Adds sports, assigns courts to sports, configures pricing per court.
- A2. Staff: Creates bookings, checks in players. Needs to quickly filter to the right sport when a customer walks in.
- A3. Walk-in Customer: Arrives and asks to play a specific sport. Staff must find available courts for that sport.

---

## Key Flows

- F1. Tenant adds a new sport
  - **Trigger:** Admin goes to Settings
  - **Actors:** A1
  - **Steps:** Admin opens the "Sports" section in Settings. Taps "Add sport". Selects from preset list or types a custom name. The sport's dedicated configuration page opens. Admin sets operating hours and adds courts for that sport.
  - **Outcome:** Sport has its own config page with hours and courts. It appears in the sport filter across the app.
  - **Covered by:** R1, R2, R3, R13, R18, R19, R21

- F2. Assigning a court to a sport
  - **Trigger:** Admin adds or edits a court
  - **Actors:** A1
  - **Steps:** When adding a court (in Settings or Onboarding), admin selects which sport the court belongs to from the tenant's active sports. Each court belongs to exactly one sport.
  - **Outcome:** Court is tagged with a sport. It appears under that sport's filter in the schedule and booking pages.
  - **Covered by:** R4, R5

- F3. Staff books a court for a walk-in
  - **Trigger:** Customer walks in and says "I want to play badminton"
  - **Actors:** A2, A3
  - **Steps:** Staff taps the sport filter (e.g., "Badminton") on the Schedule or Booking page. Only badminton courts and their availability are shown. Staff selects an open slot and creates the booking.
  - **Outcome:** Booking is created on a badminton court. Schedule is uncluttered by other sports.
  - **Covered by:** R6, R7, R8

- F4. Single-sport tenant experience
  - **Trigger:** Tenant only offers one sport
  - **Actors:** A1, A2
  - **Steps:** Tenant sets up with one sport during onboarding. No sport filter appears on Schedule, Dashboard, or Booking pages since there's nothing to filter. If the tenant later adds a second sport, the filter appears automatically.
  - **Outcome:** Single-sport tenants see no added complexity. Multi-sport tenants get the filter when they need it.
  - **Covered by:** R9

---

## Requirements

**Sport management**

- R1. Tenants can add sports from a preset list: Pickleball, Badminton, Basketball, Tennis, Volleyball, Table Tennis.
- R2. Tenants can add custom sports by typing a name.
- R3. Tenants can deactivate or remove a sport. Removing a sport with assigned courts requires reassigning or removing those courts first.

**Court-to-sport assignment**

- R4. Each court belongs to exactly one sport (required field when creating a court).
- R5. The court's sport is set at creation and can be changed in Settings. Changing a court's sport does not affect existing bookings on that court.

**Filtering and display**

- R6. Schedule, Dashboard ("Next up" list), and Booking pages show a sport filter when the tenant has 2+ active sports.
- R7. Selecting a sport filters all court-related data on the page: schedule grid, booking slots, court chips, availability counts.
- R8. The sport filter defaults to the first sport (alphabetically or by creation order) and remembers the last selection during the session.
- R9. When a tenant has only 1 active sport, the sport filter is hidden. The app behaves exactly as it does today with no extra UI.
- R10. Court color assignments (used in the schedule grid) are scoped per sport, not global. Court 1 of Pickleball and Court 1 of Basketball each get their own color.

**Sport-specific operating hours**

- R13. Each sport has its own operating hours, defined as one or more open/close time ranges (reusing the existing OperatingHoursEditor pattern). Example: Pickleball 6:00 AM - 12:00 NN, Basketball 2:00 PM - 10:00 PM.
- R14. The schedule grid and booking time slots for a sport show only the hours defined for that sport, not the tenant's global hours.
- R15. The tenant's global operating hours (on the Tenant entity) become the overall facility hours — they constrain the maximum range any sport can use, but each sport can define a subset.
- R16. When a tenant has only 1 sport, that sport's hours are the effective operating hours. The existing tenant-level hours UI in Settings is replaced by the sport's hours.

**Settings — sport configuration pages**

- R18. The Settings page shows a "Sports" section listing all active sports as tappable cards (name + court count + hours summary).
- R19. Tapping a sport opens a dedicated sport configuration page with: sport name, operating hours, and the list of courts assigned to that sport (add, edit, toggle, remove).
- R20. Courts are managed only within their sport's configuration page, not in a flat "Courts" section. This prevents courts from different sports mixing together in one long list.
- R21. Adding a new sport from Settings creates the sport and immediately opens its configuration page so the admin can set hours and add courts.
- R22. When a tenant has only 1 sport, Settings shows that sport's configuration inline (no extra tap needed) — operating hours and courts appear directly on the main Settings page as they do today.

**Onboarding**

- R11. During onboarding, after naming the facility, the tenant selects which sports they offer (multi-select from presets + custom).
- R12. The court setup step is per-sport: for each selected sport, the tenant sets operating hours and adds courts. The flow steps through each sport sequentially (e.g., "Set up Pickleball" → "Set up Basketball").
- R17. During onboarding, after selecting sports, the tenant sets operating hours per sport (not a single global hours setting).

---

## Acceptance Examples

- AE1. **Covers R6, R9.** Given a tenant with only Pickleball (1 sport), when staff opens the Schedule page, no sport filter is shown and all pickleball courts display normally.
- AE2. **Covers R6, R7.** Given a tenant with Pickleball (3 courts) and Basketball (2 courts), when staff taps "Basketball" in the sport filter, only the 2 basketball courts appear in the schedule grid and booking flow.
- AE3. **Covers R3.** Given a tenant tries to remove "Badminton" which has 2 assigned courts, the system shows a message: "Reassign or remove the 2 courts before removing this sport."
- AE4. **Covers R9.** Given a single-sport tenant adds a second sport in Settings, the sport filter appears on the Schedule page on next visit without requiring any other action.
- AE5. **Covers R13, R14.** Given Pickleball hours are 6 AM - 12 NN and Basketball hours are 2 PM - 10 PM, when staff selects "Pickleball" on the Schedule page, the grid shows time slots from 6 AM to 12 NN only. Switching to "Basketball" shows 2 PM to 10 PM only.
- AE6. **Covers R16, R22.** Given a tenant with only Pickleball, the Settings page shows Pickleball's operating hours and courts directly on the main Settings page (no extra tap into a sport page).
- AE7. **Covers R18, R19, R20.** Given a tenant with Pickleball and Basketball, the Settings page shows a "Sports" section with two cards. Tapping "Basketball" opens a page showing basketball's hours and only basketball courts. Pickleball courts do not appear on this page.
- AE8. **Covers R21.** Given an admin adds "Volleyball" as a new sport, the app immediately opens Volleyball's config page where the admin can set hours and add courts.

---

## Success Criteria

- Staff can filter to a specific sport and find available courts in under 2 seconds (no mental filtering).
- Single-sport tenants see zero additional UI complexity compared to today.
- A new tenant onboarding with 3 sports and 8 total courts can complete setup without confusion about which courts belong to which sport.

---

## Scope Boundaries

- Sport-specific booking rules (minimum duration, equipment add-ons per sport) — deferred
- Sport-specific pricing (already handled: each court has its own hourly rate) — no change needed
- Public-facing sport selection for online customer booking — deferred
- Sport-level analytics in reports (revenue per sport, utilization per sport) — deferred
- Sport icons or images (emoji or icon per sport) — nice-to-have, can be added later

---

## Key Decisions

- **One sport per court (not flexible/multi-sport):** Keeps the model simple. A court that physically hosts multiple sports should be registered as separate logical courts.
- **Sport as a tenant-managed entity, not a global enum:** Tenants control their own sport list. The preset list is a convenience, not a constraint.
- **Filter hides when single-sport:** Avoids unnecessary UI for the majority of current users who run pickleball-only facilities.
- **Operating hours live on Sport, not Tenant:** Each sport defines when its courts are available. The tenant's global hours become a facility-wide constraint (max range), not the source of truth for schedule display. This allows pickleball to run mornings and basketball to run evenings without overlap in the schedule view.
- **Each sport gets its own config page in Settings:** Courts and hours are managed per-sport, not in a flat list. Prevents a facility with 5 sports and 15 courts from becoming an unmanageable scroll. Single-sport tenants see everything inline on the main Settings page (no extra navigation).

---

## Dependencies / Assumptions

- The `courts` database table will need a new column for sport association. Existing courts will need a migration strategy (likely default to "Pickleball" or require tenant assignment).
- Bookings inherit sport from their court at creation time. No sport field on the booking itself.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R4][Technical] What is the migration strategy for existing courts that have no sport? Default to "Pickleball" or prompt tenant to assign?
- [Affects R8][Technical] Should sport filter preference persist in sessionStorage or reset on each page visit?
- [Affects R10][Needs research] How do court colors interact with the existing 10-color palette when filtering by sport? Reset index per sport or maintain global assignment?
- [Affects R13, R15][Technical] How do existing tenant operating hours migrate? Copy the tenant's current `operatingHoursRanges` to the default sport, then remove the tenant-level fields?

---

## Next Steps

-> `/ce-plan` for structured implementation planning

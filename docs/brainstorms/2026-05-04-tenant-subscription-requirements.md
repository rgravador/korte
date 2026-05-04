---
date: 2026-05-04
topic: tenant-subscription
ticket: pending
status: draft
---

# Brainstorm: Tenant Subscription Module

## Summary

Add a subscription and billing system so tenants get a 7-day free trial on signup, then must upgrade to a paid plan (Basic or Pro) to continue using the platform. Frozen tenants retain read-only access with a persistent upgrade banner until they subscribe. At launch, payments are handled manually — system admin activates tenants after receiving payment (via QR PH / GCash / bank transfer). Tenant admins see a Statement of Account page with payment instructions and billing status.

---

## Problem Frame

Korte currently gives every tenant unlimited, unrestricted access from the moment they register. There is a `freeTrialDays: 7` field on the tenant model, but nothing enforces it — no expiration check, no frozen state, no payment flow. Tenants can use the platform indefinitely without paying.

With launch approaching, the platform needs a revenue model. New tenants should experience the full product during a 7-day trial, receive a warning as the trial winds down, and be moved to read-only mode if they don't upgrade. Paying tenants choose between Basic and Pro tiers that cap courts, staff, and sports — creating a natural upgrade path as facilities grow.

---

## Actors

- A1. **Tenant Admin**: Manages the facility. Can view billing status, Statement of Account, and payment instructions. Cannot self-serve payment — pays manually via QR PH and notifies Korte.
- A2. **Tenant Staff**: Day-to-day operators. Sees the frozen state and warning banners but cannot access billing information.
- A3. **System Admin**: Korte operator. Manually activates tenant subscriptions after confirming payment. Sees in-app notifications for tenants approaching trial expiry or with overdue payments.

---

## Key Flows

- F1. **Trial lifecycle**
  - **Trigger:** New tenant registers
  - **Actors:** A1, A2
  - **Steps:**
    1. Tenant is created with trial status; trial ends 7 days after `created_at`
    2. During trial, full platform access — no restrictions
    3. Starting 3 days before trial end, a persistent warning banner appears for all tenant users: "Your trial ends in X days. Upgrade to keep using Korte."
    4. On trial expiration, tenant is frozen — read-only access for all users
  - **Outcome:** Tenant is either upgraded (via F2) or frozen with read-only access
  - **Covered by:** R1, R2, R3, R4, R5

- F2. **Manual upgrade**
  - **Trigger:** Tenant admin decides to upgrade
  - **Actors:** A1, A3
  - **Steps:**
    1. Tenant admin views Statement of Account page — sees plan options, pricing, and payment instructions (QR PH code)
    2. Tenant admin pays via QR PH (GCash, Maya, bank transfer)
    3. Tenant admin notifies Korte (or system admin sees the payment)
    4. System admin activates the tenant's subscription and sets plan tier from admin panel
    5. Tenant is immediately unfrozen; full access restored
  - **Outcome:** Tenant has an active subscription, freeze is lifted
  - **Covered by:** R6, R11, R12, R16

- F3. **Monthly billing cycle (manual)**
  - **Trigger:** Tenant's `current_period_end` approaches or passes
  - **Actors:** A1, A3
  - **Steps:**
    1. System admin sees in-app notification listing tenants with upcoming or overdue payments
    2. Tenant admin sees updated Statement of Account showing next due date and amount
    3. Tenant admin pays via QR PH
    4. System admin confirms payment and extends subscription period
    5. If payment is not received within grace period, tenant is frozen
  - **Outcome:** Subscription continues or tenant is frozen until payment
  - **Covered by:** R11, R12, R13, R15, R16

- F4. **System admin override**
  - **Trigger:** System admin needs to manually activate or freeze a tenant
  - **Actors:** A3
  - **Steps:**
    1. System admin navigates to admin panel tenant detail
    2. Overrides subscription status (activate, freeze, extend trial) and sets plan tier
  - **Outcome:** Tenant status is updated
  - **Covered by:** R16

---

## Requirements

**Trial**
- R1. Every new tenant starts with a 7-day free trial with full platform access, beginning at `created_at`.
- R2. A persistent warning banner appears for all tenant users starting 3 days before trial expiration, showing remaining days (e.g., "3 days left", "1 day left", "Trial expires today").
- R3. The warning banner includes an "Upgrade" action visible only to tenant admins (links to Statement of Account page). Staff see the warning text but no upgrade action.

**Frozen state**
- R4. When a trial expires or a subscription lapses, the tenant enters a frozen state.
- R5. Frozen tenants have read-only access: users can log in, navigate, and view all existing data (dashboard, schedule, bookings, members, reports, settings) but cannot create, edit, or delete any records.
- R6. Frozen tenants see a persistent banner with upgrade messaging. Tenant admins see a "View billing" action linking to Statement of Account; staff see a message directing them to contact their admin.
- R7. Freeze is enforced at the API layer — write operations return an error for frozen tenants, regardless of which client-side UI is shown. This prevents bypassing the freeze via direct API calls.

**Plans and limits**

- R8. Two purchasable plan tiers with the following limits:

  | Limit | Basic | Pro |
  |---|---|---|
  | Sports | 1 | 3 |
  | Courts | 5 | 20 |
  | Tenant Admins | 1 | 3 |
  | Staff accounts | 3 | 9 |

- R9. When a tenant on Basic or Pro reaches a plan limit (e.g., tries to add a 6th court on Basic), the operation is blocked with a message explaining the limit and prompting an upgrade (for admins) or contact-admin (for staff).
- R10. When a Pro tenant hits the Pro ceiling, the limit message references a "Max" tier: "Need more? Contact us for a custom plan." — no self-service purchase for Max.

**Statement of Account & payment**
- R11. Tenant admins can access a Statement of Account page showing: current plan, subscription status, next payment due date, amount due, and payment instructions with QR PH code.
- R12. The Statement of Account page shows plan options (Basic/Pro) with pricing and a QR PH code for payment. For frozen tenants, the page emphasizes urgency.
- R13. Payment instructions include: QR PH code image, GCash/Maya/bank transfer options, and a note to contact Korte after payment for activation.

**Admin panel & notifications**
- R14. System admins can manually set a tenant's subscription status (active, frozen, trial), plan tier, and `current_period_end` from the admin panel.
- R15. The admin panel shows an in-app notifications list of tenants needing attention: trials expiring within 3 days, trials expired, subscriptions overdue (past `current_period_end`).
- R16. System admins can activate a subscription (set status to active, choose plan, set next billing date) with a single action from the tenant detail view.

**Billing cycle**
- R17. Billing cycle is monthly. `current_period_end` is set when the system admin activates a subscription and advances by 1 month on each renewal.

---

## Acceptance Examples

- AE1. **Covers R1, R4, R5.** Given a tenant registered 8 days ago with no subscription, when any user logs in, they can view the dashboard and past bookings but attempting to create a new booking returns an error and shows the upgrade prompt.
- AE2. **Covers R2, R3.** Given a tenant registered 5 days ago (2 days of trial remaining), when a staff member views any page, they see a banner "Your trial ends in 2 days" without an upgrade button. When the tenant admin views any page, they see the same banner with an "Upgrade" link to the Statement of Account page.
- AE3. **Covers R5, R7.** Given a frozen tenant, when a user sends a POST request directly to `/api/bookings`, the API returns an error indicating the tenant is frozen, even though the user has a valid session.
- AE4. **Covers R9, R10.** Given a Pro tenant with 20 courts, when the admin tries to add a 21st court, the operation fails with a message: "You've reached the Pro plan limit of 20 courts. Need more? Contact us for a custom plan."
- AE5. **Covers R14, R16.** Given a frozen tenant, when the system admin sets their status to active with a Pro plan in the admin panel, the tenant is immediately unfrozen and the admin can create bookings.
- AE6. **Covers R8, R9.** Given a Basic tenant with 3 staff accounts, when the admin tries to add a 4th staff member, the operation fails with a message explaining the Basic limit and offering to upgrade to Pro.
- AE7. **Covers R11, R12, R13.** Given a frozen tenant admin, when they navigate to the Statement of Account page, they see plan options with pricing, a QR PH code, and instructions to pay and contact Korte for activation.
- AE8. **Covers R15.** Given 2 tenants with trials expiring tomorrow and 1 tenant with an overdue subscription, when the system admin views the admin panel, they see a notifications section listing all 3 tenants with appropriate labels.

---

## Success Criteria

- Tenants who don't pay are prevented from performing write operations after 7 days, with zero workarounds via direct API access.
- System admin can activate a tenant subscription within 30 seconds of confirming payment — no code changes or database access required.
- Trial warning banners appear reliably starting 3 days before expiration and are visible on every page.
- Plan limits are enforced consistently — no path (UI or API) allows exceeding the tier's caps.
- Tenant admins can find payment instructions (QR PH code) and understand how to pay without contacting support.

---

## Scope Boundaries

- No automated payment processing at launch — all payments are manual (QR PH + system admin activation)
- No email or SMS notifications — in-app only
- No annual billing — monthly only at launch
- No feature-based tier differentiation — tiers differ only by quantity limits
- No coupon or discount codes
- No "Max" tier self-service purchase — contact-us only at launch. Future intent: metered usage-based billing (per-court, per-staff, per-sport overage beyond Pro limits)
- No free-tier (perpetual free plan) — trial converts to paid or frozen
- No automated payment gateway integration (PayMongo/Maya) at launch — planned as follow-up once manual billing validates the pricing model

---

## Key Decisions

- **Manual billing over automated payment gateway at launch**: Stripe doesn't support PH-registered businesses. PayMongo/Maya lack managed subscriptions, requiring significant custom recurring billing infrastructure. Manual activation ships faster and validates the pricing model before investing in automation.
- **QR PH for payment instructions**: Universal QR payment standard in the Philippines — works with GCash, Maya, and bank apps. Single QR code covers all major payment methods.
- **Read-only freeze over full lockout**: Frozen tenants can still view their data, reducing churn from users who feel their data is held hostage.
- **API-layer enforcement over UI-only enforcement**: Freeze and plan limits are checked in middleware/API, not just hidden in the UI. Prevents bypass via direct API calls.
- **Quantity limits over feature gates for tier differentiation**: Simpler to implement and communicate. All tenants get the same features; tiers differ by scale.
- **In-app admin notifications over email**: Keeps the system simple at launch. System admin checks the panel for tenants needing attention.

---

## Dependencies / Assumptions

- QR PH code image is provided by the Korte operator (static image uploaded or configured)
- Plan pricing (PHP amounts) for Basic and Pro tiers will be provided before implementation
- The existing `created_at` timestamp on tenants is reliable for trial expiration calculation

---

## Outstanding Questions

### Resolve Before Planning

- [Affects R11, R12][User decision] What are the monthly prices for Basic and Pro plans in PHP?

### Deferred to Planning

- [Affects R7][Technical] How to structure the middleware freeze check — single middleware guard vs per-route check? Need to distinguish read (GET) vs write (POST/PUT/PATCH/DELETE) operations.
- [Affects R8][Technical] Where to store plan limits — hardcoded constants or database config?
- [Affects R5][Needs research] Should real-time subscriptions (if using Supabase realtime) be paused for frozen tenants, or just write operations?

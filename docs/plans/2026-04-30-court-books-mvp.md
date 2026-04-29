---
title: "Plan: Court Books — Multi-Tenant Court Booking PWA"
type: feat
status: active
date: 2026-04-30
ticket: pending
origin: docs/wireframes/CourtBooks ProjectPlan.docx
---

# Plan: Court Books — Multi-Tenant Court Booking PWA

## Problem Statement

Small-to-mid sized **pickleball** facility operators in the Philippines currently manage bookings via spreadsheets, Facebook Messenger, or paper logs. This causes four recurring pains:

1. **Admin time waste** — staff spend hours managing booking inquiries and schedules manually
2. **Double-booking disputes** — no single source of truth for court availability
3. **No-show tracking** — no visibility into which members are repeat no-shows
4. **Scattered member records** — member info spread across spreadsheets, chat threads, and paper

Existing solutions (CourtReserve, Skedda, Playtomic) are built for North American/European markets, priced in USD ($59-$200+/mo), and overbuilt for small facilities.

## Solution

**Court Books** — a mobile-first Progressive Web App (PWA) built for **pickleball facilities** in the Philippines. PHP-native pricing, simple owner-and-staff UX, and PWA-first delivery (no app store required). MVP focuses on staff-managed bookings — court fee collection stays outside the system.

## Scope Boundaries

### In Scope (v1 — Phases 1-2, Months 1-6)

- Multi-tenant architecture with subdomain-per-tenant routing
- Tenant onboarding flow and subdomain provisioning
- Pickleball court setup: hours, pricing, blackout dates
- **Staff-managed booking interface** (mobile-first, installable PWA) with add-on items (equipment rentals and purchases)
- Email (SES) and SMS (Semaphore) confirmations
- Owner dashboard: today's bookings, booking counts
- Member roster with basic search
- Subscription billing via Stripe Billing or PayMongo recurring
- Web push notifications and waitlist auto-fill
- Recurring weekly bookings (leagues, regulars)
- Staff role with limited permissions
- QR code check-in via camera
- Utilization heatmap reporting

### Out of Scope

- **Player self-service booking** (future — members book their own slots online)
- **In-app court fee collection / payment integration** (future — PayMongo, GCash, Maya)
- Revenue tracking and reporting (future — tied to payment integration)
- Dynamic peak/off-peak pricing (v2, month 7+)
- Open games / group booking with split payments (v2)
- **Other sports** (badminton, basketball — future expansion after pickleball PMF)
- Coaching / lesson scheduling (v2)
- League / tournament tools (v2)
- Native mobile app wrapper (TWA/Capacitor — v2, optional)
- Custom domains for tenants (Pro tier, post-MVP)
- Free tier for solo coaches (open decision — deferred)
- Tagalog UI localization (open decision — deferred)
- WAF / advanced security tooling (deferred until 50+ tenants)

## Tech Stack

| Layer | Service | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) + next-pwa | PWA install, web push, offline shell |
| Hosting | AWS Amplify Hosting | Auto CI/CD from GitHub, SSR, custom domains |
| Domain & DNS | AWS Route 53 | Apex + wildcard subdomains |
| Database | Supabase (managed Postgres) | Row-level security, REST + realtime APIs |
| Auth | Supabase Auth | Email/password, magic links, OAuth, MFA |
| File Storage | Supabase Storage | Tenant logos, court photos |
| Email | Amazon SES | ~$0.10 per 1,000 emails |
| SMS (PH) | Semaphore SMS | Local PH gateway, ~₱0.50/SMS |
| Subscription Billing | Stripe Billing or PayMongo recurring | Auto-charge, dunning, invoices |
| Push Notifications | Web Push API (VAPID) | Free, native to PWA |
| Monitoring | Supabase logs + Sentry (free tier) | Errors, uptime, query performance |
| CDN | CloudFront (managed by Amplify) | Global edge caching, HTTPS |

## Multi-Tenancy Approach

- Subdomain-per-tenant routing (e.g., `smashhub.courtbooks.app`)
- Single shared Supabase Postgres database
- Every table includes a `tenant_id` column
- Supabase Row-Level Security (RLS) policies enforce tenant isolation at the database layer
- JWT carries tenant context automatically via Supabase Auth
- Custom domains as a Pro tier feature (e.g., `bookings.smashhub.com`) via Amplify custom domain + Route 53 ALIAS records

## Implementation Strategy

The build is split into two phases:

1. **Phase A — UI Prototype with Mock Data (Weeks 1-6):** Build all screen flows end-to-end using in-memory mock data (Zustand store or React Context). No database, no auth, no external services. The goal is a clickable, fully navigable app that looks and feels like the real product. This lets us validate flows with founding members before investing in backend integration.

2. **Phase B — Backend Integration & Launch (Weeks 7-16):** Replace mock data layer with Supabase, add auth, notifications, and all production infrastructure.

### Mock Data Approach (Phase A)

- Use **Zustand** for global state management (lightweight, no boilerplate)
- All mock data lives in a `/src/lib/mock-data.ts` file with typed seed data
- Store shape mirrors the future database schema: `tenants`, `courts`, `bookings`, `members`, `items`, `booking_items`
- All CRUD operations work against the Zustand store (create booking, add member, cancel, reschedule, mark no-show)
- Data persists in `localStorage` so the app survives page refresh during demos
- A "Reset Demo Data" button in settings reloads the seed data
- When Phase B begins, swap the Zustand store calls with Supabase client calls — components stay the same

## Implementation Units

### Phase A — UI Prototype (Mock Data)

### Unit 1: Project Scaffolding & Mock Data Layer (Week 1)

**Goal:** Next.js app running locally with Zustand store, mock data seed, and basic layout shell.

- Initialize Next.js 14 repo with App Router and next-pwa
- Install Zustand, set up store with typed interfaces matching future schema
- Create `/src/lib/mock-data.ts` with realistic seed data:
  - 1 tenant (QC Pickle Hub, 3 courts)
  - 6 items (3 rental: paddles, shoes, towels; 3 sale: balls, grips, water)
  - 8 members with varied visit history
  - 15 bookings across today and this week (mix of confirmed, pending, no-show, with some having add-on items)
- Implement localStorage persistence for store state
- Build app shell: bottom navigation, phone-optimized layout, brand header
- "Reset Demo Data" utility function

### Unit 2: Owner Dashboard (Week 1-2)

**Goal:** Owner's morning view — KPIs, today's bookings, quick actions.

- Today screen with 3 KPIs: today's booking count, no-shows, utilization %
- Sorted booking list with status tags (Confirmed / Pending / In / No-show)
- Booking detail sheet on tap (member, court, time, add-on items)
- Quick actions: cancel booking, mark no-show, mark checked-in
- All data reads from Zustand store

### Unit 3: Schedule View (Week 2-3)

**Goal:** Time-by-court grid showing the full day/week at a glance.

- Day strip with horizontal scroll (6 days visible)
- Court-by-hour grid with booked/open/recurring states
- Tap open cell to start new booking flow (pre-fills court + time)
- Tap booked cell to view booking detail
- Court filter chips (All, C1, C2, C3)
- FAB (+) for manual booking creation

### Unit 4: Staff Booking Flow (Week 3-4)

**Goal:** Complete create-booking flow with add-on items, all against mock data.

- Step 1: Select court and time slot from availability grid
- Step 2: Assign member (search from mock member list) or mark as walk-in
- Step 3: Add items — list of available rental/sale items with +/- quantity controls
- Booking summary card: court fee + itemized add-ons with total
- Confirm button writes new booking to Zustand store
- Booking confirmation screen with details, items, total, and "collect at counter" note
- Cancel and reschedule flows (edit existing booking in store)
- Walk-in booking shortcut (skip member assignment)

### Unit 5: Members List (Week 4-5)

**Goal:** Searchable member roster with booking history.

- Member list with search (name, phone)
- Filter chips: All, Regular, VIP, Lapsed
- Each row shows: name, visit count, last visit, total bookings
- Member detail view: contact info, booking history, no-show count
- Add new member form (name, phone, email)
- FAB (+) for quick member add

### Unit 6: Reports & Utilization (Week 5)

**Goal:** Booking volume and utilization visuals from mock data.

- Headline metric: total bookings with period selector (7d / 30d / 90d / YTD)
- Sparkline chart showing booking trend
- Utilization heatmap (courts x hours x days, color-coded)
- No-show rate summary
- All computed from mock bookings in Zustand store

### Unit 7: Staff Check-in & QR (Week 5-6)

**Goal:** Staff check-in screen with QR scanner placeholder and booking list.

- QR scanner frame (camera permission prompt; mock scan resolves to a booking)
- Today's expected arrivals list with Confirmed/Pending tags
- Equipment indicators on bookings with add-on items (e.g., "2 paddles")
- Tap to check in (updates booking status in store)
- Walk-in button to create ad-hoc booking
- Staff-specific nav (Check-in, Today, Walk-in, Help, Account)

### Unit 8: Settings & PWA Install (Week 6)

**Goal:** Settings screen, PWA installability, and demo polish.

- Settings screen: facility name, court management, item catalog, operating hours
- Item catalog CRUD: add/edit/remove rental and sale items
- Court CRUD: add/edit/remove courts with name, rate, type
- PWA manifest and service worker for installability
- Offline shell with graceful "no connection" state
- Reset Demo Data button
- End-to-end flow walkthrough and bug fixes

### Phase B — Backend Integration & Launch

### Unit 9: Infrastructure & Auth (Week 7-8)

**Goal:** Production infrastructure with real auth replacing mock login.

- Register domain via Route 53
- Create AWS account, enable MFA, set billing alarms ($20, $50, $100)
- Create Supabase organization on Pro plan, set spend cap, enable PITR
- Connect Next.js app to Amplify, deploy to apex domain
- Configure wildcard subdomain DNS
- Design and apply database schema: `tenants`, `courts`, `bookings`, `members`, `items`, `booking_items`
- Apply RLS policies on all tables scoped to `tenant_id`
- Wire Supabase Auth (email/password, magic links)
- Implement tenant resolution from subdomain middleware
- Test tenant-scoped queries against RLS (including cross-tenant boundary tests)

### Unit 10: Data Layer Swap (Week 8-9)

**Goal:** Replace Zustand mock store with Supabase client calls — all screens now use real data.

- Create data access layer (DAL) abstraction over Supabase client
- Swap each Zustand action with corresponding Supabase query/mutation
- Migrate seed data into Supabase for dev/staging environments
- Verify all screens work with real database (same UI, real persistence)
- Remove localStorage persistence (Supabase is now the source of truth)
- Keep Zustand for client-side UI state only (selected date, active filters, etc.)

### Unit 11: Tenant Onboarding Flow (Week 9-10)

**Goal:** New facility owner can sign up, name their facility, and get a live subdomain.

- Tenant registration form (facility name, owner email, court count)
- Subdomain provisioning and SSL certificate handling
- Court setup wizard: court name, hourly rate, operating hours (pickleball-specific defaults)
- Blackout date configuration
- Item catalog setup: add rentable equipment and purchasable items

### Unit 12: Notifications — Email & SMS (Week 10-11)

**Goal:** Automated booking confirmations and reminders.

- Amazon SES integration for transactional email
- Semaphore SMS integration for PH numbers
- Booking confirmation notifications (email + SMS)
- Reminder notifications (configurable: 1hr, 2hr, 24hr before)
- Cancellation notifications

### Unit 13: Staff Roles & Permissions (Week 11-12)

**Goal:** Owner can invite staff with limited permissions.

- Staff role with limited permissions (owner controls what staff can see)
- Staff invitation flow (owner invites via email)
- Role-based UI: staff see check-in and booking screens, not reports or settings

### Unit 14: Subscription Billing (Week 12-13)

**Goal:** Tenants are billed monthly via Stripe or PayMongo recurring.

- Stripe Billing or PayMongo recurring integration
- Pricing tier enforcement (Starter/Growth/Pro based on court count)
- Dunning flow for failed payments
- Subscription status reflected in tenant dashboard
- Founding member pricing lock (₱500/mo for first 5 customers)

### Unit 15: Recurring Bookings & Waitlist (Week 13-15)

**Goal:** Recurring weekly bookings and waitlist auto-fill.

- Recurring booking creation (weekly, biweekly)
- Conflict detection for recurring vs one-time bookings
- Recurring booking management (skip week, cancel series)
- Waitlist for fully-booked slots
- Push notifications (Web Push API / VAPID) for booking changes and waitlist openings

### Unit 16: MVP Launch (Week 15-16)

**Goal:** Launch with 2 founding pickleball facilities processing real bookings.

- End-to-end smoke testing with real booking flows
- Onboarding documentation for facility owners
- 30-minute onboarding call template
- Live chat support channel setup
- Launch with 2 founding facilities

## Pricing Model

| Tier | Courts | Monthly (PHP) | Annual (PHP, save 2mo) | Segment |
|---|---|---|---|---|
| Starter | 1-3 | ₱799 | ₱7,990 | Small / new pickleball facilities |
| Growth | 4-8 | ₱1,499 | ₱14,990 | Core target (5-10 pickleball courts) |
| Pro | 9+ | ₱2,499 | ₱24,990 | Multi-location pickleball operators |

- **Founding members** (first 5): ₱500/month locked forever
- **Annual prepay**: 2 months free
- Break-even on infrastructure: ~3-4 tenants at Growth tier, ~5-7 at founding rates

## 12-Month Timeline

| Month | Milestone | Target |
|---|---|---|
| 1 | Phase A: All screens built with mock data | Clickable prototype, demo-ready |
| 2 | Phase A complete: full app flow with mock data | Validate flows with founding member candidates |
| 3 | Phase B: Infrastructure, auth, data layer swap | Real data flowing through existing UI |
| 4 | Onboarding, notifications, staff roles, billing | Production-ready MVP |
| 5 | MVP launch with 2 founding pickleball facilities | First real bookings managed by staff |
| 6-7 | Recurring bookings, waitlist, iteration on feedback | 10 paying tenants |
| 8 | Reporting polish + staff role refinements | ₱15k MRR |
| 9-11 | Player self-booking, payment integration, v2 features | 30 paying tenants |
| 12 | Scaling, reliability, support automation | 50 paying tenants, ₱75k MRR |

## Risks & Dependencies

| Risk | Severity | Mitigation |
|---|---|---|
| **Tenant data leakage** | Critical | Postgres RLS on all tables + integration tests that attempt cross-tenant access |
| **Amplify cost surprises** | Medium | CloudWatch billing alarms at $20/$50/$100; aggressive caching; image optimization |
| **iOS push notification limits** | Medium | PWA push requires iOS 16.4+ and home-screen install; fall back to email + SMS |
| **Subdomain SSL provisioning delay** | Low | Amplify auto-provisions ACM certs (15-60 min); use pre-warmed wildcard cert |
| **Supabase Pro required from day one** | Low | $25/mo fixed cost before revenue; founding-member pricing makes break-even ~5-7 tenants |
| **Staff adoption resistance** | Medium | Keep UI extremely simple; onboarding call with each facility; iterate on feedback from founding members |

### Dependencies

- Stripe account approval for subscription billing
- DTI/SEC business registration required to invoice tenants
- BIR tax registration for official receipts
- Semaphore SMS account setup

## Open Decisions

These items require resolution before or during implementation:

1. **Free tier** (1 court, 5 bookings/week) for solo coach use case — deferred to post-MVP data
2. **English-only vs English + Tagalog** UI at launch — impacts scope of Unit 4
3. **Founder solo vs part-time support contractor** at month 6 — revisit based on tenant count
4. **Subdomain-only vs custom domain** at launch — plan assumes subdomain-only for MVP
5. **Payment processor** (PayMongo vs Xendit) — deferred until player self-booking is in scope

## Infrastructure Cost Summary

| Scale | Tenants | MRR (PHP) | Infra Cost (PHP) | Net Margin |
|---|---|---|---|---|
| Validation | 2 | ₱2,000 | ₱1,650 | ~₱(150) |
| Early traction | 10 | ₱13,000 | ₱2,000 | ~₱9,000 |
| Sustainable | 50 | ₱65,000 | ₱4,600 | ~₱54,400 |
| Scaling | 100 | ₱130,000 | ₱10,600 | ~₱109,400 |

Target: ~87% gross margin per tenant at Growth tier pricing.

## Cost Optimization Tactics

- CloudWatch billing alarms + Supabase spend cap (hard cap)
- Aggressive edge caching for public booking pages and static assets
- Optimize Next.js builds to stay within 1,000 free build minutes/month
- Use SES over third-party email providers
- Lean on Supabase RLS over application-layer tenant filtering
- Use Supavisor connection pooling for serverless connection management
- Avoid Supabase Storage image transformations; use Sharp via Next.js
- Defer compute upgrades and WAF until load demands it
- Target 25-30% of customers on annual plans for cash flow stability

## First 14 Days Checklist

1. Initialize Next.js 14 repo with App Router, Zustand, and next-pwa
2. Create typed interfaces for all entities (tenants, courts, bookings, members, items)
3. Build mock data seed with realistic pickleball facility data
4. Build app shell: bottom nav, brand header, mobile-optimized layout
5. Complete Owner Dashboard screen (KPIs, booking list, quick actions)
6. Complete Schedule grid screen (day strip, court-by-hour grid)
7. Start Staff Booking flow (court/time selection, member assignment, add-on items)
8. Identify and contact 10 candidate pickleball facilities in Metro Manila
9. Apply for Stripe account for subscription billing (KYC ~1 week, runs in parallel)

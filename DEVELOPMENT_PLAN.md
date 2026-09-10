# YATRA VERSE Development Plan

## Delivery principles

- Build a thin, production-quality vertical slice before broadening scope.
- Use real persisted domain data for product flows; use provider interfaces and explicitly labelled development fixtures only where a live integration is not yet contracted.
- Launch public content only when editorial, legal, and provider-provenance standards are met.
- Preserve a clear distinction between facts from external sources and AI-generated advice.

## Phase 0 — Foundation and product contracts

**Goal:** establish the monorepo, development standards, shared API contracts, deployment baseline, and design system foundations.

Deliverables:

- Workspace structure from `ARCHITECTURE.md`; TypeScript, linting, formatting, testing, and build configuration.
- Environment validation and `.env.example`; no secrets committed.
- Express health/readiness endpoints, standardized error handling, structured logging, request IDs, and OpenAPI direction.
- Next.js shell with the premium brand token system, responsive layout primitives, accessibility baseline, and SEO metadata foundation.
- CI pipeline for type checking, linting, tests, build, dependency/secret scanning; staging deployment skeleton.

Exit criteria: web and API build independently, CI is green, configuration fails safely when missing, and no business functionality is simulated.

## Phase 1 — Identity, roles, and destination foundation

**Goal:** establish secure user accounts and publishable destination discovery.

Deliverables:

- User, traveler profile, destination, audit-log models and migrations/indexes.
- Registration, login, refresh, logout, email verification and password reset; RBAC/ownership middleware.
- Admin-only destination authoring/publishing APIs and protected operations.
- Public destination listing/detail pages with search, filtering, loading/error/empty states, canonical URLs, sitemap, and structured metadata.
- Traveler account settings and saved destinations.

Exit criteria: public users can discover only published destinations; authenticated access is secure and role enforcement is API-tested.

## Phase 2 — Guide marketplace and verification

**Goal:** enable trustworthy guide supply and searchable guide profiles.

Deliverables:

- Guide profile, verification, availability, and secure upload models/services.
- Guide application/profile management and availability workflows.
- Admin verification queue, evidence access policy, decisions, and audit trail.
- Public guide search and profile pages limited to approved, published, eligible guides.
- Destination/service-area filtering, rating-summary infrastructure, and accessible responsive marketplace UI.

Exit criteria: an unverified guide cannot be publicly listed or booked; guide data comes from MongoDB and all verification decisions are auditable.

## Phase 3 — Booking, payments, reviews, and notifications

**Goal:** complete the transactional guide experience.

Deliverables:

- Availability conflict rules, booking state machine, traveler/guide booking views, and cancellation policy implementation.
- Payment-provider adapter, hosted/tokenized payment flow, signature-verified webhooks, refunds/cancellations where contractually supported.
- Notification provider abstraction with event-driven booking notifications.
- Booking-eligible reviews, moderation workflow, and correct aggregate recalculation.
- Reconciliation tooling, idempotency protections, transaction/error recovery tests.

Exit criteria: a booking reaches confirmed state only after authoritative payment confirmation, cannot double-book availability, and has traceable notifications/audit records.

## Phase 4 — Safety and traffic intelligence

**Goal:** provide transparent, source-backed destination intelligence.

Deliverables:

- Safety and traffic provider interfaces, selected provider adapters, configuration, quotas, and licensing review.
- Development fixtures restricted to development; provider fetch jobs, normalization, snapshot storage, expiry/staleness policies, monitoring, and retry/dead-letter handling.
- Destination UI that shows source, timestamp, scope, availability/staleness, and a non-alarmist explanation.
- Admin operations for provider status and content review; no manually invented safety scores or traffic claims.

Exit criteria: every displayed intelligence claim is traceable to a source and timestamp, and provider failures display as unavailable/stale rather than fabricated data.

## Phase 5 — AI trip planning and guide matching

**Goal:** add helpful, bounded AI assistance.

Deliverables:

- AI provider/orchestration interfaces, structured outputs, prompt/version records, cost/latency telemetry, evaluations, and fallback behaviour.
- Preference-driven trip-plan drafting using only approved published and provider-backed context.
- Explainable guide matching with transparent non-AI filters and clear suggestion labels.
- Safety guardrails, consent controls, feedback/reporting, redaction, and human-review path for flagged output.

Exit criteria: AI output validates against schema, cites its available underlying sources/context, makes no unsupported safety claim, and cannot create bookings or change verification state.

## Phase 6 — Communication, operations, and growth

**Goal:** mature platform operations and engagement without weakening trust.

Deliverables:

- Booking-scoped messaging, moderation/abuse controls, notification preferences, and retention policy.
- Traveler, guide, and admin dashboards based on real domain workflows.
- Analytics events with consent, funnel reporting, operational dashboards, SEO content operations, and performance optimization.
- Mobile UX refinement, accessibility audit, localization-ready content architecture, and support tooling.

Exit criteria: operations teams can manage exceptions with least privilege, core journeys meet performance/accessibility targets, and growth metrics do not expose unnecessary personal data.

## Cross-cutting testing strategy

| Layer | Coverage |
| --- | --- |
| Unit | Domain services, policies, schemas, state transitions, provider normalizers, AI output validation. |
| Integration | Express routes, auth/RBAC, Mongoose repositories/index assumptions, webhooks, queues, provider adapters using controlled fixtures. |
| End-to-end | Registration, guide verification, discovery, booking/payment sandbox, intelligence availability/staleness, role journeys. |
| Contract | Shared web/API contracts plus provider payload compatibility tests. |
| Security | Dependency/secret scans, authorization matrix tests, rate-limit/CSRF tests, upload/webhook tests, periodic penetration testing before launch. |
| Non-functional | Lighthouse/Core Web Vitals, accessibility (automated plus manual), load/soak tests for search and provider jobs, backup/restore drills. |

Definition of done for each feature: validated contract, authorization policy, loading/empty/error states, telemetry, tests appropriate to risk, documentation, and no hidden mock data in production paths.

## Deployment strategy

1. Use pull-request CI and preview deployments for the web/API where feasible.
2. Promote through isolated development, staging, then production environments with distinct databases, provider credentials, and secrets.
3. Run backward-compatible database/index changes first, then deploy application changes; use feature flags for staged exposure.
4. Run post-deploy health checks, error/latency monitors, and smoke tests. Keep rollback artifacts and database recovery procedures documented.
5. Operate managed MongoDB replica sets, Redis queues, object storage, CDN/WAF, centralized logs, metrics, alerting, encrypted backups, and tested restore procedures.

## Initial milestones and sequencing

| Milestone | Depends on | Product outcome |
| --- | --- | --- |
| M0: Foundation | None | Safe engineering baseline. |
| M1: Destination discovery | M0 | Searchable, publishable travel content. |
| M2: Trusted guides | M1 | Verified guide supply and discovery. |
| M3: Transactional bookings | M2 | End-to-end paid guide bookings. |
| M4: Intelligence | M1 + provider contracts | Traceable safety and traffic context. |
| M5: AI assistance | M2 + M4 | Grounded trip planning and matching. |
| M6: Operational scale | M3–M5 | Mature communication, dashboards, and growth operations. |

## Decisions required before each relevant phase

- Legal/privacy review, business entity/payment compliance, cancellation/refund policy, and guide-verification standards before Phase 3 launch.
- Contracted safety, traffic, maps, payment, messaging, storage, and AI vendors—including geography, quotas, licensing, SLAs, and data-processing terms—before their production integration phases.
- Editorial policy, safety wording/disclaimer policy, incident escalation policy, and source freshness thresholds before Phase 4 public release.
- Brand assets, destination taxonomy, first launch locations, guide supply criteria, and initial operational ownership before public launch.
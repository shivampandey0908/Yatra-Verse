# YATRA VERSE Architecture

## 1. Product boundary

YATRA VERSE is a destination-intelligence platform for Indian travel, organised around three user decisions:

- **Find:** discover, verify, and book local guides.
- **Check:** assess destination safety before and during a trip.
- **Plan:** select better travel times through traffic outlooks.

The first production release should provide trustworthy destination discovery, guide discovery and booking workflows, provider-backed safety and traffic insights with clear provenance, and role-specific workspaces. It must never present generated, stale, or unavailable provider data as factual real-world information.

## 2. Technology decisions

| Area | Decision | Rationale |
| --- | --- | --- |
| Web application | Next.js (App Router), React, TypeScript | Server rendering, SEO-friendly destination pages, strong typed UI boundaries. |
| Styling | Tailwind CSS plus a small token-based design system | Fast consistent premium UI without coupling domain logic to styles. |
| API | Node.js, Express, TypeScript | Explicit REST boundary, independently deployable and horizontally scalable. |
| Persistence | MongoDB with Mongoose | Flexible travel and provider payloads, strong document modelling and indexes. |
| Validation | Zod at API edge; Mongoose schema validation at persistence edge | Typed contracts and defence in depth. |
| Authentication | Short-lived access JWT + rotating, hashed refresh token in secure HTTP-only cookie | Secure sessions usable by web and future mobile clients. |
| Async work | Queue abstraction with Redis-backed implementation in production | Provider refreshes, notifications, image processing, and AI jobs stay outside request latency. |
| Files | Object-storage abstraction (S3-compatible in production) | Guide documents and media do not reside on API disks or MongoDB. |
| Observability | Structured logs, error tracking, metrics, request correlation IDs | Enables operational ownership from the first live release. |

## 3. Repository and deployment structure

Use a single TypeScript monorepo with independently deployable applications and shared packages.

```text
yatra-verse/
├── apps/
│   ├── web/                         # Next.js customer-facing product
│   │   ├── app/                     # Route groups, pages, layouts, metadata
│   │   ├── components/              # UI and feature components
│   │   ├── features/                # Page-facing domain modules
│   │   ├── lib/                     # API client, auth helpers, utilities
│   │   └── public/                  # Brand-owned static assets only
│   └── api/                         # Express service
│       └── src/
│           ├── config/              # Validated environment configuration
│           ├── modules/             # Domain modules (route/controller/service/model)
│           ├── middleware/          # Auth, RBAC, errors, validation, rate limits
│           ├── providers/           # External provider adapters
│           ├── jobs/                # Queue processors and schedules
│           ├── ai/                  # AI orchestration and guardrails
│           └── shared/              # Logging, errors, pagination, primitives
├── packages/
│   ├── contracts/                   # Shared request/response schemas and types
│   ├── ui/                          # Reusable presentational UI primitives
│   ├── config/                      # Shared ESLint/TypeScript/Tailwind presets
│   └── domain/                      # Role, status, and domain constants only
├── infrastructure/                  # Docker, deployment, and IaC when introduced
├── docs/                            # API/provider runbooks when introduced
├── ARCHITECTURE.md
└── DEVELOPMENT_PLAN.md
```

No API route, page, or component should access MongoDB or an external provider directly except through its owning service/provider boundary.

## 4. Frontend architecture

The web app is a responsive, SEO-first product experience rather than a generic dashboard.

- **Public routes:** home, destinations, destination detail, guides, guide profiles, safety/traffic methodology, and legal pages.
- **Authenticated routes:** traveler, guide, and admin areas protected at the route boundary and re-authorized by the API.
- **Rendering:** server components and server data fetching for indexable public content; client components only for interaction, forms, maps, and live updates.
- **Feature modules:** `destinations`, `guides`, `bookings`, `safety`, `traffic`, `auth`, `traveler`, `guide`, and `admin` own their views, hooks, and API calls.
- **Design system:** semantic tokens for violet/lavender brand accents, warm imagery, neutral light surfaces, accessible contrast, elevated cards, and motion that respects `prefers-reduced-motion`.
- **Data state:** API client generated/typed from shared contracts; cache and revalidation policy per endpoint; explicit loading, empty, error, and unavailable-provider states.
- **Maps:** maps are rendered through an adapter, with graceful static/location fallback when a provider is unavailable or consent is absent.

## 5. Backend module and API design

Each domain module follows `route -> controller -> service -> repository/model`; controllers are thin, services enforce business rules, and repositories own query details. Shared contracts define API payloads. REST endpoints are versioned under `/api/v1`.

| Module | Core endpoint groups |
| --- | --- |
| Auth & accounts | `/auth`, `/me`, `/users` |
| Destinations | `/destinations`, `/destinations/:slug` |
| Guides | `/guides`, `/guides/:id`, `/guides/:id/availability`, `/guide-verifications` |
| Bookings | `/bookings`, `/bookings/:id`, `/payments` |
| Reviews | `/reviews` |
| Conversations | `/conversations`, `/messages` |
| Intelligence | `/destinations/:id/safety`, `/destinations/:id/traffic` |
| Planning & matching | `/trip-plans`, `/guide-matches` |
| Operations | `/notifications`, `/uploads`, `/admin/*` |

Conventions:

- JSON response envelope with `data`, `meta`, and machine-readable error codes.
- Cursor pagination for growing collections; server-side allowlisted sorting and filtering.
- OpenAPI specification generated from contracts or maintained alongside them before third-party/mobile adoption.
- Idempotency keys on payment, booking confirmation, and webhook endpoints.
- Webhooks are signature-verified, durable, and processed asynchronously.

## 6. MongoDB data model

All documents have `createdAt`, `updatedAt`, and appropriate soft-delete/audit policy. IDs are MongoDB ObjectIds exposed as strings. Personal data is separated from publicly readable profile fields where feasible.

| Collection | Key fields and relationships |
| --- | --- |
| `users` | email, phone, password/auth identity, roles, account status, profile reference, consent and security timestamps. Unique normalized email/phone indexes. |
| `travelerProfiles` | user, display details, preferences, emergency contact (restricted), saved destinations. |
| `guideProfiles` | user, public bio, languages, specialties, service areas, pricing, verification status, ratings summary, public visibility. Geospatial and searchable indexes. |
| `guideVerifications` | guide, submitted document references, review status, reviewer, decision and audit trail. Documents remain in object storage. |
| `destinations` | canonical name, slug, geography, hierarchy, editorial content, discovery metadata, publication state. Unique slug and geo indexes. |
| `guideAvailability` | guide, time range, capacity, availability status, timezone. Compound conflict-prevention index. |
| `bookings` | traveler, guide, destination, selected time, guests, price snapshot, status history, cancellation terms, payment reference. Compound schedule/status indexes. |
| `payments` | booking, payment-provider IDs, amount/currency, state, webhook event history; no raw card data. |
| `reviews` | booking, author, target guide, rating, text, moderation status. Enforce one review per eligible booking. |
| `conversations` / `messages` | participant IDs, booking context, encrypted/sanitized message payload policy, read state, moderation metadata. |
| `safetySnapshots` | destination, provider, retrieval time, source URL/reference, normalized indicators, provider timestamp, expiry, confidence/coverage and raw-payload pointer. |
| `trafficOutlooks` | destination/route, time window, provider/model version, forecast and confidence, retrieval/expiry metadata, source reference. |
| `tripPlans` | traveler, input constraints, generated itinerary, citations/provider references, model/version, user edits, status. |
| `notifications` | recipient, channel, template, delivery state, idempotency key. |
| `auditLogs` | actor, action, target, request ID, relevant before/after summaries, immutable retention policy. |

Indexes will be derived from product queries and checked with query plans. Denormalized rating and destination summaries are maintained transactionally where possible or through idempotent background jobs. MongoDB transactions are used for multi-document booking/payment state transitions when deployment topology supports them.

## 7. Authentication, authorization, and roles

Roles are additive: `traveler`, `guide`, and `admin`; administrators may also hold a traveler account but privileges are granted separately. A `support` permission set may be added later rather than granting broad admin access.

- Email/password onboarding uses Argon2id password hashes, verified email, throttled reset flows, and optional OTP/social identity adapters later.
- Access tokens are short-lived. Refresh tokens are rotated on each refresh, stored hashed server-side, bound to a device/session, and revoked on logout or suspicious activity.
- Secure, `HttpOnly`, `SameSite` cookies protect browser refresh tokens. CSRF protection is required for cookie-authenticated state-changing endpoints.
- API middleware authenticates identity; an authorization policy checks role, resource ownership, booking relationship, and status transition eligibility. UI checks improve experience but are never authorization.
- Guide verification, payment state changes, moderation, and intelligence publication require explicit service-level policies and audit logs.

## 8. Service and external-provider architecture

Domain services depend on stable provider interfaces, never provider SDKs. Every provider implementation normalizes its output into an internal contract and records provenance, freshness, and failure information.

```text
Route/Job → Domain service → Provider interface → Provider adapter
                                  ├─ Live provider implementation
                                  └─ Development provider implementation
```

Provider families:

- `SafetyProvider`: advisory/feed retrieval and normalized incident/advisory metadata.
- `TrafficProvider`: route/location outlooks and forecast metadata.
- `MapsProvider`: geocoding, place lookup, map tiles/routes subject to licensing.
- `PaymentProvider`: payment intents, refunds, webhook verification.
- `MessagingProvider`: transactional email/SMS/push delivery.
- `StorageProvider`: signed uploads and private document access.
- `IdentityVerificationProvider`: optional future KYC/document checks.

The development provider is explicitly marked development-only, uses configured fixture data, returns provenance as `mock`, and must never be enabled in production. Missing live data produces an honest `unavailable` or `outdated` response, not an invented score, alert, or forecast.

## 9. AI architecture

AI augments decisions; it does not establish safety facts, validate guides, set prices, or autonomously execute bookings.

- `AIOrchestrator` accepts validated, permission-scoped requests from trip planning and guide matching services.
- Inputs are constructed from consented user preferences, published destination data, verified guide attributes, and provider-backed intelligence with source/freshness metadata.
- Tool calls are allowlisted service operations; the model never receives database credentials or unrestricted provider access.
- Outputs use structured schemas, store model/prompt version and source references, and pass validation before persistence/display.
- Safety and traffic responses distinguish provider facts from AI explanation. The UI displays timestamp, coverage, confidence where supplied, and links/references to source material.
- Guardrails remove sensitive data, prevent unsupported certainty, reject high-risk instructions, cap cost/latency, and support human review/feedback. Prompt and output logs are redacted and retained under policy.
- AI providers are accessed through an `AIProvider` interface, enabling model replacement, fallback, evaluation, and cost tracking.

## 10. Main application flows

1. **Destination discovery:** traveler searches or browses published destinations → sees editorial data plus timestamped provider-backed safety and traffic sections → saves or proceeds to guide discovery.
2. **Guide booking:** traveler filters public, eligible guides → checks guide profile and availability → creates a provisional booking → payment provider confirms → booking becomes confirmed → both users receive notifications.
3. **Guide onboarding:** user applies as guide → submits profile/documents through signed upload → admin/provider verification decision → only approved profiles may be published and booked.
4. **Safety/traffic refresh:** scheduled job retrieves provider data → normalizes/validates → writes snapshot with source and expiry → publishes only valid current results; failures retain visible stale/unavailable status according to policy.
5. **AI planning/matching:** user gives scoped preferences → orchestration retrieves approved internal facts → returns clearly labelled suggestions → user reviews and saves; no autonomous booking.

## 11. Security and privacy architecture

- TLS everywhere; secure headers, CSP, CORS allowlist, input validation, output encoding, and rate limits at edge/API.
- Secrets only in managed environment/secret stores; never committed, logged, or exposed to the browser.
- Principle of least privilege for database, storage, provider credentials, admin operations, and service accounts.
- Private guide documents use encrypted object storage and short-lived signed URLs; raw payment credentials are delegated to the payment provider.
- PII is minimized, encrypted where appropriate, access-audited, exportable/deletable according to applicable policy, and retained only as needed.
- Threat-model auth, booking/payment, uploads, messaging, admin tools, AI inputs, and webhooks before launch. Dependabot-like dependency review, SAST, secret scanning, and regular backups/recovery tests are part of operations.

## 12. Development and production configuration

Configuration is validated at process startup and separated by environment. Commit only `.env.example` with variable names and safe placeholders. Core variables include app origins, database URI, token/cookie settings, provider keys, storage bucket, queue/Redis settings, observability DSNs, and feature flags.

- **Development:** local MongoDB/Redis or approved managed development services; development providers may use fixtures; verbose logs without sensitive payloads.
- **Staging:** production-like managed services, isolated provider keys/data, migration and smoke-test gate.
- **Production:** managed MongoDB replica set, Redis, object storage, CDN/WAF, containerized web/API deployments, encrypted backups, least-privilege secrets, autoscaling, monitoring, and rollback-capable releases.

Feature flags control incomplete integrations and are enforced by backend capability checks, not only client visibility.

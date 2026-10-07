# LMS Implementation Progress

## Completed phases

### Phase 2 — Auth, RBAC, single-branch cleanup
JWT access + hashed refresh tokens, register/login/refresh/logout, Bearer auth, single-branch holds (no transfers).

### Phase 3 — Catalog and circulation CRUD
Modular routes, zod validation, faker seed, policy-backed renewals, concurrent checkout 409.

### Phase 4 — Holds, notifications, jobs
48-hour ready window, hold cancel, in-app notifications, hold expiry / due-date / overdue jobs, Resend/console email provider.

### Phase 5 — Search and recommendations
`$text` hybrid search with regex fallback, borrow-history recommendations, catalog indexes synced on connect.

### Phase 6 — OpenAPI and Scalar
Full spec at `/openapi.json`, Scalar UI at `/docs`, Bearer JWT documented.

### Phase 7–9 — Frontend
Next.js app in `lms-web` now uses the Card Catalog design system: ruled card stock, wood drawer navigation, stamp-style status/action treatments, serif record headings, and monospace operational text. The live API-backed auth, catalog, search, item detail, member, circulation, and administration workflows remain wired to their existing endpoints.

### Phase 10 — Playwright
`lms-web/e2e` covers search, hold placement, checkout/return against an in-memory API.

### Phase 11 — Deploy
Root `docker-compose.yml` (mongo + api + web), GitHub Actions for API and web, README deploy order Atlas → API → Web.

## Key decisions

- Kept packages as `lms-backend` and `lms-web` (workspace roots) rather than a mid-flight `apps/` move that would break local installs.
- Shared types live in `packages/shared-types`.
- Single-branch inventory; one default Branch document.
- Atlas Search is documented for production; local Mongo uses `$text` + regex.

## Next

Operate the stack with `docker compose up --build` and `npm run seed` in `lms-backend`.

## Visual verification

- 2026-09-07: Sign-in screen reviewed at `http://localhost:3001/login`. Pass: ruled paper, punched hole, brass tab, flat underline fields, and outlined stamp button match the Card Catalog reference.
- 2026-09-07: Source compilation passed. The full `next build` type-check stops before page validation because `@playwright/test` is absent from `lms-web` dependencies; this is an existing test setup dependency issue.

### 2026-09-09 — final features and protection pass

- Added grounded catalog assistance, concurrent-safe study-room booking, donation attribution/reporting, and the final catalog features from the supplied plans.
- Added focused integration coverage for assistant grounding, unknown-catalog answers, booking races, disabled rooms, import review, issue resolution, interest isolation, and hold expiry queue reordering.
- Added [`docs/SECURITY_AUDIT.md`](../docs/SECURITY_AUDIT.md) with completed controls and production-owner decisions.
- Backend build and focused integration suites pass. Web source typing remains blocked only by the project-wide missing `@playwright/test` dependency referenced by existing E2E configuration.

# LMS QA Test Matrix

## Current QA summary

The implemented API suite and browser workflows have been rerun after the security and integrity fixes in this document's revision. Feature rows marked **not present** are requirements mentioned in earlier planning material but have no implementation in this checkout, so they cannot be tested or represented as complete.

| Area | Feature | Required testing | Status | Evidence / result |
| --- | --- | --- | --- | --- |
| Identity | Register, login, JWT access tokens, refresh rotation and logout revocation | Integration, security | Verified | `concurrent-auth-edge.test.ts` |
| Identity | Username and email login | Integration | Verified | `auth-circulation.test.ts` |
| Identity | Password hashing | Unit/integration, security | Verified | bcrypt hashes are persisted; login test passes |
| Identity | Login throttling | Integration, security | Verified | Auth rate-limit coverage in `auth-circulation.test.ts` |
| Identity | Header-forged authentication | Security | Fixed and verified | `x-user-*` headers no longer authenticate a request |
| Identity | Password reset, MFA, recovery codes | Integration, security | Not present | No routes, screens, or data model in checkout |
| Authorization | Member, librarian, branch-admin, super-admin gates | Integration, security | Verified | `rbac-ledger.test.ts` |
| Authorization | Branch-scoped staff permissions | Integration, security | Verified | RBAC suite |
| Authorization | Audit-log reader access | Integration, security | Verified | RBAC suite |
| Audit | Mutation audit records and item-issue resolution attribution | Integration, integrity | Verified | `final-features.test.ts` |
| Audit | Append-only retention / tamper-resistant external archive | Security, operational | Partial | Application has no audit mutation API; immutable external retention is infrastructure work |
| Catalog | Typed catalog records and copies | Unit/integration | Verified | Catalog and policy/search suites |
| Catalog | Faceted search, work/edition grouping | Integration | Verified | `final-features.test.ts` |
| Catalog | Hybrid/vector search and grounded answers | Integration, security | Verified | `assistant-rooms.test.ts`, `policy-search.test.ts` |
| Catalog | Metadata enrichment, duplicate detection | Integration | Partial | Duplicate warning exists during import preview; no external enrichment provider |
| Catalog | CSV import preview and commit | Integration, RBAC | Verified | `final-features.test.ts` |
| Catalog | Shelf browse, barcode scan, stocktake, weeding | E2E/integration | Not present | No matching routes/screens in checkout |
| Circulation | Checkout, return, due dates and loan policies | Unit/integration | Verified | `policyEngine.test.ts`, `auth-circulation.test.ts` |
| Circulation | Atomic last-copy checkout | Concurrency/integration | Verified | `concurrent-auth-edge.test.ts` |
| Circulation | Renewal blocked by queue | Integration | Verified | `concurrent-auth-edge.test.ts` |
| Holds | Queue placement, promotion and cancellation | Integration, concurrency | Verified | `auth-circulation.test.ts` |
| Holds | Pickup expiry requeue and next-member promotion | Integration, integrity | Verified | `final-features.test.ts` |
| Interests | Availability and acquisition interest notifications | Integration | Verified | `final-features.test.ts` |
| Fines | Ledger and balance calculations | Unit/integration, integrity | Verified | `rbac-ledger.test.ts` |
| Fines | Razorpay/payment webhooks, replay protection and refunds | Integration, security | Not present | No payment provider, webhook, or payment routes |
| Item issues | Report and staff resolution | Integration, RBAC | Verified | `final-features.test.ts` |
| Item issues | Copy must belong to reported item | Integrity | Fixed and verified | New regression test in `final-features.test.ts` |
| Rooms | Availability and disabled rooms | Integration | Verified | `assistant-rooms.test.ts` |
| Rooms | Same-slot concurrency | Concurrency/integration | Verified | Unique index plus concurrent request test |
| Rooms | Overlapping intervals | Integrity | Fixed and verified | One-hour UTC-aligned slot validation prevents overlap bypass |
| Assistant | Catalog-grounded responses and unknown-answer behavior | Integration, security | Verified | `assistant-rooms.test.ts` |
| Assistant | Prompt injection and sensitive-data exfiltration | Security | Partial | No LLM/tool execution path; retrieval rejects irrelevant terms. Dedicated adversarial corpus is still needed. |
| Donations | Donor attribution and staff report | Integration, RBAC | Implemented, untested | Route exists; add test coverage next |
| Accessibility | Accessible-format metadata | Unit/E2E | Not present | No dedicated data model or screen |
| Personalization | Want-to-read, follows, recommendations, goals, household | Integration/E2E, security | Not present | No matching implementation |
| Frontend | Member and official login flows | E2E | Verified | Playwright login flow passes against seeded API |
| Frontend | Catalog, search, holds, fines, rooms, assistant, staff views | E2E, visual | Partial | Search, hold placement, and staff circulation pass in Playwright; remaining screens need visual baselines |
| Frontend | Voice search | Browser E2E | Implemented, untested | Requires browser speech-recognition support |
| Frontend | Responsive 32-screen visual comparison | Visual regression | Out of scope in checkout | The required design-screen inventory is not included with this QA request |
| Platform | CORS, request size limit and security response headers | Security/integration | Verified | `app.ts` configuration inspected and headers asserted in API tests |
| Platform | HTTPS enforcement, production secret injection | Deployment/security | Partial | Production now fails without `JWT_SECRET`; TLS must be terminated/configured in deployment |
| Platform | Dependency audit in CI | Security | Partial | CI tests/builds; registry-backed `npm audit` was not runnable in this environment |
| Platform | Backups, restore drill, retention policy, monitoring | Operational/integrity | Not present | Requires deployment infrastructure and owner policy |

## Test execution record

| Command | Result |
| --- | --- |
| `npm test` in `lms-backend` | Passed: 25 tests, 0 failures |
| `npm run build` in `lms-web` | Passed: optimized build and TypeScript validation completed |
| `npm run e2e -- --reporter=line` in `lms-web` | Passed: 3 Chromium browser flows, 0 failures |

## Remaining production actions

1. Move refresh tokens from browser storage to `HttpOnly`, `Secure`, `SameSite` cookies and add CSRF protection.
2. Set `JWT_SECRET`, TLS termination, permitted production origins, monitoring, encrypted backups and a restore-drill schedule in deployment.
3. Capture the design-system visual baselines for the remaining screens.
4. Implement and test absent product areas before representing them as complete: payment webhooks, recovery/MFA, accessibility formats, personalization and stocktake.

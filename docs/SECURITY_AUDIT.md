# Security and Data Protection Audit

Date: 2026-09-09

This audit distinguishes implemented controls from production decisions that require an owner or deployment environment.

| Area | Status | Finding / action |
| --- | --- | --- |
| Password hashing | Already correct | Passwords use bcrypt with a work factor of 10. Password hashes are omitted from user responses. |
| Access token lifetime | Already correct | JWT access tokens expire after 15 minutes. |
| Refresh tokens | Fixed in future work | Current implementation stores refresh tokens in localStorage, which is unsuitable for production. Move issuance and rotation to secure, httpOnly, sameSite cookies before production launch. |
| Auth rate limiting | Fixed | Login has an independent 10-attempt/15-minute IP limit outside tests. |
| RBAC | Already correct / extended | Sensitive circulation, import, room administration, issue resolution, and interest queue routes use server-side role middleware. |
| Query scoping | Reviewed | Member loan, hold, notification, booking creation, and issue reporting use the authenticated token; no family or private-list feature exists in this checkout to audit. |
| Input validation | Fixed / reviewed | New booking, import, interest, issue, assistant, and donor fields are server-validated with Zod and bounded sizes. CSV import is parsed into structured review rows before commit. |
| LLM prompt injection | Fixed by design | The assistant does not call an external model in this deployment. It produces deterministic answers only from live catalog search results and returns cited item IDs. A future LLM integration must preserve this retrieval boundary and sanitize catalog fields. |
| CORS | Fixed | API CORS allows configured web origin plus the active local development port, not a wildcard. Production origin must be set through `WEB_ORIGIN`. |
| Security headers | Fixed | API adds `nosniff`, frame denial, referrer policy, and restrictive API CSP headers. |
| Audit logging | Reviewed / extended | Existing sensitive action auditing remains append-only through public routes. Room creation/update/booking and issue resolution now write audit records. |
| HTTPS | Needs owner decision | TLS must be terminated and redirected by the production host/load balancer; local HTTP is retained for development. |
| Secrets and dependency audit | Needs owner decision | No committed secret was intentionally added. CI must run `npm audit` and production secrets must be injected by deployment environment. |
| Password reset and 2FA | Not present | These capabilities are not implemented in this codebase; their token/secret requirements cannot be verified. |
| Data export and deletion | Needs owner decision | No complete personal-data export or account anonymization flow exists. Retention and anonymization rules need owner-approved policy before implementation. |
| Payment security | Not applicable | No Razorpay or payment code exists in this checkout. |
| Backup and restore | Needs owner decision | No deployable backup system is visible in the repository; a production owner must define and test managed database backup/restore. |

## Automated verification added

- Assistant returns catalog references for real records and a grounded no-match response for unknown records.
- Two concurrent room bookings for one room/time slot result in exactly one `201` and one `409`.
- Disabled rooms reject new bookings.
- Interest records do not mutate hold queues.
- Reported issues are member-created, staff-resolved, and resolution-audited.
- Expired pickup holds return to the back of the queue while the next member is promoted.

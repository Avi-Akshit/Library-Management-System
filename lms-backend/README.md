# Library Management System API

Advanced Express + TypeScript backend for a production-style library management system.

## Implemented

- Mongoose catalog model with discriminators for books, journals, media, and equipment.
- Users with member types and four roles: member, librarian, branch_admin, super_admin.
- Data-driven loan policy engine.
- Transactional checkout and return workflows.
- Immutable fine ledger with derived balances.
- Hold queue with position tracking, 48-hour ready window, and transfer request creation.
- Domain event bus and notification listeners.
- RBAC middleware, audit logging, request logging, rate limiting, health checks, OpenAPI JSON, and Scalar docs.
- Docker Compose for API + MongoDB.
- CI skeleton for typecheck, tests, build safety, and `.env` protection.

## Commands

```bash
npm run dev
npm run dev:no-db
npm run typecheck
npm test
npm run build
```

## Local Run

```bash
docker compose up --build
```

App: `http://localhost:4000`

API: `http://localhost:4000`

Docs: `http://localhost:4000/docs`

Health: `http://localhost:4000/health`

If MongoDB is not installed locally, run `npm run start:no-db` after `npm run build` to serve a complete in-memory demo system with catalog, checkout, return, holds, fine balance, health, and documentation endpoints.

## Auth During Development

Routes use simple header-based auth until JWT login is added:

- `x-user-id`
- `x-user-roles`, comma separated, for example `librarian,branch_admin`
- `x-branch-id`, optional

## Extracted Task Plan

See `PROGRESS.md` for the sequenced tasks extracted from the build guide and the current implementation status.

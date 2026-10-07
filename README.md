# Library Management System

A production-grade, full-stack Library Management System built with Node.js/Express/TypeScript (backend) and Next.js 15/Tailwind/shadcn-style components (frontend).

---

## Architecture

```
LMS/
├── lms-backend/     Node.js + Express + TypeScript + MongoDB
└── lms-web/         Next.js 15 App Router + Tailwind CSS
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Node.js 20, Express 5, TypeScript 7 |
| Database | MongoDB (Atlas or local) + Mongoose 9 |
| Auth | JWT (15m access) + SHA-256 hashed refresh tokens (7d) |
| Events | In-process domain event bus (async) |
| Search | MongoDB `$text` + cosine-similarity vector search |
| API Docs | OpenAPI 3.1 via Scalar at `/docs` |
| Frontend | Next.js 16, React 19, Tailwind CSS v3 |
| State | SWR for data fetching, React Context for auth |
| Icons | lucide-react |

---

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB running locally (`mongodb://localhost:27017`) or Atlas URI

### Backend

```bash
cd lms-backend
cp .env.example .env          # set a local JWT_SECRET; MongoDB defaults to localhost
npm install
npm run dev                   # ts-node-dev hot reload on :4000
```

#### Environment Variables (`.env`)
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/lms
JWT_SECRET=your-32-char-secret-here
WEB_ORIGIN=http://localhost:3000
EMAIL_PROVIDER=console
```

Email delivery is intentionally disabled by default: notifications are written to the API log. Gmail setup is deferred; when it is enabled later, keep its credentials in the deployment platform's secret manager rather than in a project `.env` file.

#### Quick demo (no MongoDB needed)
```bash
SKIP_DB=true npm run dev      # in-memory demo mode
```

### Frontend

```bash
cd lms-web
npm install
npm run dev                   # starts on :3000
```

Open http://localhost:3000 — you'll be redirected to `/login`.

---

## API Reference

Once the backend is running, visit **http://localhost:4000/docs** for the full interactive Scalar API documentation.

### Key endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new member |
| `POST` | `/auth/login` | Login — returns `{ accessToken, refreshToken, user }` |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `POST` | `/auth/logout` | Revoke refresh token |
| `GET`  | `/auth/me` | Get authenticated user |
| `GET`  | `/catalog/items` | List/search catalog |
| `GET`  | `/catalog/items/:id` | Item detail |
| `POST` | `/circulation/checkouts` | Check out item (librarian) |
| `POST` | `/circulation/returns/:id` | Return loan |
| `POST` | `/circulation/renewals/:id` | Renew loan |
| `GET`  | `/circulation/loans/user/:id` | User's loans |
| `GET`  | `/circulation/loans/overdue` | All overdue loans |
| `POST` | `/holds` | Place hold |
| `GET`  | `/holds/user/:id` | User's holds |
| `DELETE`| `/holds/:id` | Cancel hold |
| `GET`  | `/fines/users/:id/balance` | Fine balance |
| `GET`  | `/search?q=...` | Hybrid text + vector search |
| `GET`  | `/search/recommendations/:userId` | Personalized recommendations |
| `GET`  | `/users` | List users (librarian+) |
| `PATCH`| `/users/:id/roles` | Update roles (admin) |

---

## Running Tests

```bash
cd lms-backend
npm test
```

**14/14 tests passing** across 3 suites:
- Auth flow (register, login, JWT, refresh rotation, logout revocation)
- Circulation (checkout/return, double-booking prevention, hold queue promotion)
- Concurrent checkout race condition (atomic copy claim)
- Renewal blocked by hold queue
- Policy engine (configurable loan duration, fine calculation)
- Search and recommendations

---

## Features

### Backend
- **ACID transactions** — checkout and return use MongoDB sessions; concurrent requests get 409 not 500
- **Token rotation** — refresh tokens are SHA-256 hashed in the DB; each rotation revokes the old token
- **Hold queue** — FIFO promotion on return, automatic expiry job (15 min cron)
- **Fine accrual** — ceiling-day fine on late return, waiver support
- **Cron jobs** — due-date reminders (24h), overdue escalation, hold expiry
- **Domain events** — async bus drives notifications without coupling circulation to email
- **RBAC** — `member`, `librarian`, `branch_admin`, `super_admin` roles

### Frontend
- **Auth guard** — `proxy.ts` redirects unauthenticated users to `/login`
- **Member dashboard** — active loans (with renew), holds (with cancel), fine balance
- **Librarian desk** — quick checkout/return forms, overdue loans table
- **Admin dashboard** — user table with search, inline role editor
- **Catalog** — grid with filter by item type, availability derived from copies
- **Item detail** — copies table, checkout (librarian) or place-hold (member) CTAs
- **Search** — submit-on-Enter hybrid search with availability badges

---

## Docker

```bash
# In PowerShell, create a local Docker configuration from the template first:
Copy-Item .env.example .env
# Edit .env and replace JWT_SECRET with a new random value.

# Full stack: MongoDB + API (:4000) + web (:3000)
docker compose up --build
```

Docker uses its included MongoDB service by default. To use Atlas later, set `MONGODB_URI` in the root `.env` file; do not add the URI to `docker-compose.yml`.

After first start, seed the database:

```bash
cd lms-backend
npm run seed
```

---

## Deployment

Deploy in this order: **MongoDB Atlas → API → Web**.

### 1. Database (MongoDB Atlas M0)

1. Create a free M0 cluster.
2. Add a database user and allow your API host IPs (or `0.0.0.0/0` for a first deploy).
3. Copy the `mongodb+srv://...` connection string.

For production search, create an Atlas Search index on `items` covering `title`, `creators`, `subjects`, and `description`. Local Docker uses MongoDB `$text` with a regex fallback.

### 2. API (Render or Railway)

Use [`lms-backend/Dockerfile`](lms-backend/Dockerfile).

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string |
| `JWT_SECRET` | yes | ≥32 random characters |
| `PORT` | platform | Render/Railway usually inject this |
| `WEB_ORIGIN` | yes | Frontend origin, e.g. `https://your-app.vercel.app` |
| `EMAIL_PROVIDER` | no | `console` (default) or Resend |
| `RESEND_API_KEY` | no | Required only when sending real email |
| `EMAIL_FROM` | no | Verified sender for Resend |

Gmail is intentionally not configured yet. When it is enabled, store the account and app password only in the deployment provider's secret manager.

Health check: `GET /health`

### 3. Web (Vercel)

Root directory: `lms-web`.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Public API URL, e.g. `https://lms-api.onrender.com` |

Never commit `.env` files. CI fails if `.env` is present in the API package.

---

## E2E tests

```bash
cd lms-web
npx playwright install chromium
npm run e2e
```

Playwright starts an in-memory Mongo API plus the Next.js app, then covers search, hold placement, and librarian checkout/return.

---

## Project Structure (Backend)

```
src/
├── models/           Mongoose schemas (User, Item, Loan, Hold, FineLedgerEntry…)
├── modules/
│   ├── auth/         AuthService, routes, refresh token logic
│   ├── catalog/      Item CRUD + hybrid search endpoint
│   ├── circulation/  CirculationService (ACID checkout/return/renew)
│   ├── fines/        FineService, ledger routes
│   ├── holds/        HoldService, queue management
│   ├── notifications/ Event listeners, in-app notification routes
│   ├── policies/     LoanPolicy CRUD
│   ├── search/       SearchService (text + cosine), recommendations route
│   └── users/        User list/roles routes
├── middleware/       auth, rbac, audit, validate, rateLimit, errorHandler
├── events/           DomainEventBus (typed async emit)
├── jobs/             holdExpiryJob, dueDateReminderJob, overdueJob
└── openapi/          Full OpenAPI 3.1 spec
```

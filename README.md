# Prowider Mini Lead Distribution System

A full-stack lead distribution system built with Next.js, PostgreSQL, and Prisma.

## Live demo

Deploy to Vercel / Railway and set `DATABASE_URL` in environment variables.

---

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally (default port 5432)

### 1. Clone and install

```bash
npm install
```

### 2. Configure database

Copy `.env.example` to `.env` and set your connection string:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/prowider_mini_lead_distribution?schema=public"
```

### 3. One-command DB setup

```bash
npm run db:setup
```

This runs `prisma generate` → `prisma db push` (creates tables) → `node prisma/seed.mjs` (inserts seed data).

### 4. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.

---

## Routes

| URL | Purpose |
|-----|---------|
| `/` | Landing page |
| `/request-service` | Public customer form |
| `/dashboard` | Live provider dashboard |
| `/test-tools` | Webhook simulation & concurrency tests |

---

## Allocation Algorithm

### Rules (seeded)
| Service | Mandatory providers | Fair-pool providers |
|---------|--------------------|--------------------|
| Service 1 | Provider 1 | Providers 2, 3, 4 |
| Service 2 | Provider 5 | Providers 6, 7, 8 |
| Service 3 | Provider 1, Provider 4 | Providers 2, 3, 5, 6, 7, 8 |

### Logic
Each lead is assigned to **exactly 3 providers**:

1. **Mandatory slots** — providers from the mandatory rule list are included first, provided they are within their monthly quota for the active `QuotaCycle`.
2. **Pool slots** — remaining slots (3 − mandatory count) are filled from the fair-pool using a **persistent round-robin cursor** stored in `ServiceAllocationState.cursor`. The cursor advances to the position immediately after the last provider selected, and is written back inside the same transaction.
3. If a provider in either list is at quota, it is skipped and the next eligible provider is used.

The allocation state (cursor per service) survives server restarts because it is stored in the database.

---

## Concurrency Handling

`createLeadWithAssignments` runs in a PostgreSQL **Serializable** transaction with two lock levels:

1. **`SELECT … FOR UPDATE` on `QuotaCycle`** — ensures the active quota cycle cannot be swapped mid-allocation.
2. **`SELECT … FOR UPDATE` on `ServiceAllocationState`** — serialises all concurrent allocations for the same service, preventing two transactions from reading the same cursor and producing unfair assignments.
3. **`SELECT … FOR UPDATE` on `ProviderQuota` rows** — prevents two different-service allocations from each spending the same provider's last quota slot.

If two transactions collide under Serializable isolation, Prisma returns error code `P2034`. `createLeadWithAssignments` automatically retries up to 3 times, ensuring eventual success.

---

## Webhook Idempotency

`POST /api/webhooks/subscription-renewed` accepts `{ eventId: string }`.

The handler wraps everything in a single Serializable transaction:

1. **`webhookEvent.create({ data: { eventId } })`** — the `eventId` column has a `@unique` constraint.
2. If a duplicate `eventId` arrives, PostgreSQL raises error `P2002` (unique violation).
3. The catch block detects `P2002`, looks up the existing event, and returns `{ alreadyProcessed: true }` — **no side effects**.

This means calling the webhook N times with the same `eventId` is safe: one new quota cycle is created, all subsequent calls are no-ops.

---

## Database Schema (key models)

```
QuotaCycle       — represents one billing period; exactly one row has active = true
ProviderQuota    — per-provider assignment counter for the active cycle (quota tracking)
ServiceRule      — MANDATORY and FAIR_POOL rules for each service
ServiceAllocationState — cursor (nextIndex) for round-robin per service
Lead             — customer enquiry; unique on (phoneNormalized, serviceId)
LeadAssignment   — many-to-many between Lead and Provider, scoped to a QuotaCycle
WebhookEvent     — idempotency log; eventId is a primary key
```

---

## Tech stack

- **Frontend** — Next.js 16 (App Router), React 19
- **Database** — PostgreSQL
- **ORM** — Prisma 7
- **Validation** — Zod 4
- **Real-time** — Client-side polling (REST) every 3 s; SSE endpoint also available at `/api/dashboard/stream`

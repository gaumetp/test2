# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev (all apps in parallel via Turborepo)
npm run dev

# Build
npm run build

# Lint / typecheck
npm run lint
npm run typecheck

# Database
npm run db:generate   # generate Drizzle migrations after schema changes
npm run db:push       # push schema to DB (no migration file — for dev)
npm run db:studio     # open Drizzle Studio at localhost:4983

# Single app
cd apps/web && npm run dev
cd apps/web && npm run typecheck
```

No test suite exists yet.

## Architecture

### Monorepo layout

```
apps/web          — Next.js 14 (App Router) — the only deployed app
packages/api      — tRPC router (server-side logic lives here)
packages/db       — Drizzle ORM schema + db client (shared by web & api)
packages/ui       — Reserved for shared components; currently empty
```

`apps/web` depends on both `@tattoo-saas/api` and `@tattoo-saas/db`. All business logic belongs in `packages/api`; Next.js pages are thin.

### Data layer (`packages/db`)

Single schema file at `packages/db/src/schema/index.ts`. Tables:

| Table | Purpose |
|---|---|
| `users` | Clerk-synced users; `clerkId` is the external identity |
| `artist_profiles` | 1-to-1 with users (id = users.id); artist settings, stats, Stripe Connect |
| `portfolio_items` | Cloudinary-hosted images per artist |
| `studios` / `studio_artists` | Studio entity + artist membership join table |
| `availability_rules` | Weekly recurring schedule (day-of-week + time range) |
| `availability_overrides` | Per-date blocks or custom slots |
| `bookings` | Core transactional entity; status machine drives the whole flow |
| `messages` | Per-booking chat thread |
| `reviews` | One review per completed booking |
| `invoices` | Financial record per booking |
| `notifications` | In-app notification log |
| `subscriptions` | Stripe subscription state, synced via webhook |

DB client (`packages/db/src/client.ts`) uses `DATABASE_URL_POOLING` when set (for Supabase's PgBouncer), falling back to `DATABASE_URL`. Connection pool is capped at 1 for serverless compatibility.

### API layer (`packages/api`)

tRPC routers in `packages/api/src/routers/`. Three procedure types:

- `publicProcedure` — no auth
- `protectedProcedure` — requires Clerk session (`ctx.userId` is the Clerk ID string)
- `artistProcedure` — requires `role IN ('artist', 'studio_owner', 'admin')`, attaches `ctx.user` (DB user row)

`ctx.userId` is always a Clerk ID (string). Resolving the DB user row requires an explicit query — every protected mutation does this as its first step.

### tRPC in Next.js

Two separate tRPC setups in `apps/web/lib/trpc/`:

- `client.tsx` — `createTRPCReact<AppRouter>()`, used in Client Components as `trpc.router.procedure.useQuery()`
- `server.ts` — server caller via `createCallerFactory`, used in Server Components as `api.router.procedure()`

The HTTP endpoint (`/api/trpc`) is at `apps/web/app/api/trpc/[trpc]/route.ts` and handles both GET and POST.

### Booking status machine

```
pending → confirmed (artist accepts) → deposit_paid (Stripe webhook) → completed (artist marks done)
pending → cancelled (artist declines or either party cancels)
confirmed → cancelled
deposit_paid → completed | cancelled | no_show
```

Stripe `payment_intent.succeeded` → webhook → sets `deposit_paid`. Status transitions are enforced in the mutations, not enforced at the DB level.

### Payments & Stripe Connect

Artists receive payouts via Stripe Connect (Express accounts). On deposit payment:
1. Client calls `payments.createDepositIntent` → creates a PaymentIntent with `transfer_data.destination = artist.stripeAccountId`
2. Commission (`application_fee_amount`) is deducted at source based on artist's subscription tier: free=12%, pro=5%, studio=3%, studio_plus=2%
3. Stripe fires `payment_intent.succeeded` → webhook at `/api/webhooks/stripe` → sets booking to `deposit_paid`

Subscription tier is stored on `artist_profiles.subscription_tier` and kept in sync by the Stripe subscription webhooks.

### Auth & user sync

Clerk is the identity provider. On `user.created` Clerk webhook → `/api/webhooks/clerk` creates a row in `users` with `role='client'`. Role upgrades happen through the onboarding flow or admin actions.

Public routes (no auth required): `/`, `/browse/*`, `/artists/*`, `/sign-in`, `/sign-up`, `/api/webhooks/*`, `/pricing`.

`/dashboard` is a server-side redirect: reads the DB user's `role` and redirects to `/dashboard/artist` or `/dashboard/client`.

### Image uploads

`POST /api/upload` — auth-gated, accepts multipart form (`file` field), uploads to Cloudinary under `tattoo-saas/portfolio/{clerkUserId}/`, returns `{ url, publicId }`. Max 10 MB, images only, auto-resized to 1200×1200.

### Email

`packages/api/src/email.ts` wraps Resend. Emails are sent fire-and-forget (`void sendEmail(...)`) — never block a mutation on email delivery. If `RESEND_API_KEY` is not set the function is a no-op, so local dev works without credentials.

## Environment variables

Validated at startup by `@t3-oss/env-nextjs` in `apps/web/env.ts`. The app will throw on boot if any required variable is missing (set `SKIP_ENV_VALIDATION=true` to bypass in CI/scripts).

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Direct Supabase Postgres connection |
| `DATABASE_URL_POOLING` | Supabase PgBouncer URL (preferred in prod) |
| `CLERK_SECRET_KEY` / `CLERK_WEBHOOK_SECRET` | Clerk backend auth + webhook verification |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe backend |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_STUDIO` / `STRIPE_PRICE_STUDIO_PLUS` | Stripe price IDs for subscription tiers |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe frontend |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` / `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Image uploads |
| `RESEND_API_KEY` / `EMAIL_FROM` | Transactional email |
| `NEXT_PUBLIC_APP_URL` | Used in email links (e.g. `https://inkbook.io`) |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — run ESLint
- `node --test` — run test suite (Node.js built-in test runner, 22 tests)

## Environment Variables

Required in `.env.local`:

**Supabase**
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project credentials
- `SUPABASE_SERVICE_ROLE_KEY` — service-role client for API routes (bypasses RLS)

**AI**
- `OPENROUTER_API_KEY` — OpenRouter API key. Powers the chat assistant via `openai/gpt-4o-mini`.

**Stripe**
- `STRIPE_SECRET_KEY` — server-side secret key
- `STRIPE_WEBHOOK_SECRET` — webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — client-side publishable key
- `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` / `NEXT_PUBLIC_STRIPE_PRICE_SEMESTRAL` / `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL` — Stripe Price IDs

**Email**
- `RESEND_API_KEY` — Resend API key. Used by `/api/auth/recover` to send password-reset emails (bypasses Supabase SMTP rate limits).
- `EMAIL_FROM` — verified sender, e.g. `MenuAI <noreply@yourdomain.com>`. Domain must be verified in Resend.

**URL (auth flows + QR generation)**
- `NEXT_PUBLIC_SITE_URL` — canonical public origin (e.g. `https://menuai.es` in prod, `http://localhost:3000` in dev). Used by login/signup `emailRedirectTo` and password-reset `redirectTo`. Must be allowlisted in Supabase → Authentication → URL Configuration.
- `NEXT_PUBLIC_BASE_URL` — used by `MesasManager` for QR code URLs. Falls back to `window.location.origin`; ideally set to the same value as `NEXT_PUBLIC_SITE_URL`.
- `NEXT_PUBLIC_APP_URL` — used by Stripe checkout for success/cancel URLs. Falls back to the `origin` request header. Ideally set to the same value as `NEXT_PUBLIC_SITE_URL`.

  > These three vars are inconsistently named across the codebase. All have working fallbacks but should eventually be unified to a single var.

**Rate limiting (optional)**
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis for chat rate limiting. Falls back to an in-memory Map when absent.

## Architecture

**MenuAI** is a multi-tenant restaurant digital menu platform with an AI chat assistant. Built with Next.js 16.2, React 19, Supabase, and OpenRouter (`openai/gpt-4o-mini`). UI uses shadcn/ui components with Tailwind CSS v4.

### Two user-facing surfaces

1. **Customer view** (`/[restaurantSlug]/mesa/[tableId]`) — QR-scanned menu with AI chat. Server Component fetches the full menu from Supabase, renders `MenuView` (client) which embeds `ChatInterface` and `CartDrawer`.
2. **Admin panel** (`/admin/*`) — authenticated restaurant owner dashboard. Pages: `dashboard`, `carta` (menu CRUD), `mesas` (table + QR management), `ajustes` (settings). Auth-gated by `AdminLayout` via `supabase.auth.getUser()`.

### Key data flow

- **AI Chat**: `POST /api/chat` receives messages + restaurant slug. Fetches the full menu (5-min in-memory cache), builds a system prompt via `buildMenuSystemPromptV2()`, and streams OpenRouter completions back as plain text chunks. Rate-limited to 5 req/min per `slug:ip` combination.
- **Chat usage limits**: Monthly counters per restaurant in the `chat_usage` table. Limits vary by subscription status (see `src/lib/usage.ts`). Usage is checked before streaming starts and incremented after.
- **Menu import**: `POST /api/menu/import` accepts an image or PDF (parsed via `pdfjs-dist`) and uses AI to extract menu structure.
- **Menu structure**: Restaurant → Categories (ordered) → MenuItems (ordered), with N:N joins to `allergens` and `dietary_tags`, plus 1:N `ingredients`.
- **QR codes**: Generated client-side with `qrcode` library in `MesasManager`.

### Supabase clients (three variants)

- `createServerSupabase()` (`lib/supabase.ts`) — cookie-based SSR client for Server Components (`import 'server-only'`)
- `createAdminSupabase()` (`lib/supabase.ts`) — service-role client for API routes, bypasses RLS
- `supabase` (`lib/supabase-client.ts`) — browser client for Client Components

### Database

Schema is in `supabase/schema.sql`. Main tables: `restaurants`, `categories`, `menu_items`, `ingredients`, `allergens`, `dietary_tags`, `menu_item_allergens` (N:N), `menu_item_tags` (N:N), `tables`, `chat_usage`. Storage buckets: `menu-images`, `restaurant-logos`. RLS policies: owners manage their own data; everything is publicly readable. The 14 EU allergens and 8 dietary tags are seeded on schema creation.

### Middleware

`src/proxy.ts` acts as Next.js middleware (non-standard filename — accepted by Next.js 16). Protects `/admin/*` routes and redirects already-logged-in users away from `/admin/login`.

### Known issue — subscription chat limits

`src/lib/usage.ts` defines chat limits for `active_monthly` (1500), `active_semestral` (2500), and `active_annual` (4000), but the Stripe webhook only ever writes the standard Stripe statuses (`active`, `trialing`, `canceled`) to `subscription_status`. The custom keys are never stored, so all active subscribers fall through to the `active` fallback (1500 msg/month). Semestral and annual limits are dead code until the webhook is updated to also persist the plan type.

## Language

The app UI and LLM system prompt are in Spanish. Code comments mix Spanish and English.

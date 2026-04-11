# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — run ESLint
- No test framework is configured

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project credentials
- `SUPABASE_SERVICE_ROLE_KEY` — server-side admin client (used in API routes)
- `GROQ_API_KEY` — Groq LLM API key (powers the chat assistant)
- `STRIPE_SECRET_KEY` — Stripe secret key (server-side)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (client-side)
- `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` / `NEXT_PUBLIC_STRIPE_PRICE_SEMESTRAL` / `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL` — Stripe Price IDs for each plan

## Architecture

**MenuAI** is a multi-tenant restaurant digital menu platform with an AI chat assistant. Built with Next.js 16, React 19, Supabase, and Groq (Llama 3.3 70B). UI uses shadcn components with Tailwind CSS v4.

### Two user-facing surfaces

1. **Customer view** (`/[restaurantSlug]/mesa/[tableId]`) — QR-scanned menu with AI chat. Server Component fetches full menu from Supabase, renders `MenuView` (client) which embeds `ChatInterface`.
2. **Admin panel** (`/admin/*`) — authenticated restaurant owner dashboard for managing menu categories, items (with allergens/ingredients/dietary tags), and tables with QR codes. Auth-gated via `AdminLayout` checking `supabase.auth.getUser()`.

### Key data flow

- **AI Chat**: `POST /api/chat` receives messages + restaurant slug. Fetches full menu (with 5-min in-memory cache), builds a system prompt via `buildMenuSystemPrompt()` containing the entire menu as text, and streams Groq completions back as plain text chunks.
- **Menu structure**: Restaurant -> Categories (ordered) -> MenuItems (ordered), with N:N joins to `allergens` and `dietary_tags` tables, plus 1:N `ingredients`.

### Supabase clients (three variants)

- `createServerSupabase()` (`lib/supabase.ts`) — cookie-based SSR client for Server Components (import `server-only`)
- `createAdminSupabase()` (`lib/supabase.ts`) — service-role client for API routes, bypasses RLS
- `supabase` (`lib/supabase-client.ts`) — browser client for Client Components

### Database

Schema is in `supabase/schema.sql`. RLS policies enforce: owners manage their own restaurant data, everything is publicly readable. The 14 EU allergens and 8 dietary tags are seeded on schema creation.

## Language

The app UI and LLM system prompt are in Spanish. Code comments mix Spanish and English.

# Restaurant Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-restaurant logo upload, brand color, font style, and live admin preview.

**Architecture:** Store two theme columns on `restaurants`, keep `logo_url` as the public Storage URL, and centralize theme normalization in pure helpers. Public menu pages pass server-loaded font class names into the client `MenuView`; admin settings pass the same font classes into the editor preview.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase Auth/DB/Storage, Tailwind CSS 4, `next/font/google`, Node `node:test`.

---

### Task 1: Theme Helpers And Tests

**Files:**
- Create: `src/lib/restaurant-theme.test.mjs`
- Create: `src/lib/restaurant-theme.cjs`
- Create: `src/lib/restaurant-theme.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/restaurant-theme.test.mjs` with tests for hex validation, font style normalization, derived colors, and logo path extraction.

- [ ] **Step 2: Verify RED**

Run: `node --test src/lib/restaurant-theme.test.mjs`  
Expected: FAIL because `restaurant-theme.cjs` does not exist yet.

- [ ] **Step 3: Implement helpers**

Create CJS and TS helpers with:
- `DEFAULT_PRIMARY_COLOR`
- `DEFAULT_FONT_STYLE`
- `FONT_STYLE_OPTIONS`
- `isValidHexColor`
- `normalizePrimaryColor`
- `normalizeFontStyle`
- `getRestaurantTheme`
- `extractRestaurantLogoPath`

- [ ] **Step 4: Verify GREEN**

Run: `node --test src/lib/restaurant-theme.test.mjs`  
Expected: PASS.

---

### Task 2: Database And Storage Schema

**Files:**
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/2026-04-25-restaurant-customization.sql`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add schema fields**

Add `primary_color` and `font_style` columns to `restaurants`, with defaults and `check` constraints.

- [ ] **Step 2: Add migration**

Create a migration that adds the columns, backfills defaults, adds constraints, creates public bucket `restaurant-logos`, and adds public read policy.

- [ ] **Step 3: Update TypeScript types**

Add `FontStyle` and `primary_color`/`font_style` fields to `Restaurant`.

---

### Task 3: Server Font Map

**Files:**
- Create: `src/lib/restaurant-fonts.ts`

- [ ] **Step 1: Add server-side font imports**

Import the 5 heading/body font families from `next/font/google`, instantiate them statically, and export `getRestaurantFontClasses(fontStyle)`.

- [ ] **Step 2: Keep client-safe options separate**

Use `FONT_STYLE_OPTIONS` from `restaurant-theme.ts` for labels and examples; do not import `next/font` from client components.

---

### Task 4: Upload API

**Files:**
- Modify: `src/app/api/upload/route.ts`

- [ ] **Step 1: Add ownership verification**

Before upload, fetch `restaurants.id, logo_url` for the authenticated user and requested restaurant.

- [ ] **Step 2: Add upload type**

Read optional `uploadType`; default to `menu-image`, use `restaurant-logo` for logo uploads.

- [ ] **Step 3: Upload logo to `restaurant-logos`**

For logos, upload to `restaurant-logos/{restaurantId}/{uuid}.{ext}`.

- [ ] **Step 4: Delete previous logo best-effort**

If `previousLogoUrl` or current restaurant `logo_url` belongs to `restaurant-logos`, delete its Storage object after successful upload.

---

### Task 5: Admin Settings UI

**Files:**
- Modify: `src/app/admin/ajustes/page.tsx`
- Modify: `src/components/admin/RestaurantEditForm.tsx`
- Create: `src/components/admin/RestaurantThemePreview.tsx`

- [ ] **Step 1: Fetch theme fields**

Include `logo_url`, `primary_color`, and `font_style` in the settings page query.

- [ ] **Step 2: Pass font class map**

Import `getRestaurantFontClassMap()` from `restaurant-fonts.ts` in the server page and pass it into `RestaurantEditForm`.

- [ ] **Step 3: Add form state**

Track `logo_url`, `primary_color`, and `font_style` alongside existing business fields.

- [ ] **Step 4: Add logo uploader**

Use `fetch('/api/upload')` with `uploadType=restaurant-logo`, temporary object URL preview, loading state, and remove button.

- [ ] **Step 5: Add color and font controls**

Render native color input, hex text, swatch, and clickable font cards.

- [ ] **Step 6: Add live preview**

Render `RestaurantThemePreview` in a responsive two-column settings card.

---

### Task 6: Public Menu Theme

**Files:**
- Modify: `src/app/[restaurantSlug]/page.tsx`
- Modify: `src/app/[restaurantSlug]/mesa/[tableId]/page.tsx`
- Modify: `src/components/cliente/MenuView.tsx`

- [ ] **Step 1: Pass font classes**

Public server pages call `getRestaurantFontClasses(result.restaurant.font_style)` and pass the result to `MenuView`.

- [ ] **Step 2: Apply theme variables**

`MenuView` derives theme colors from `restaurant.primary_color` and applies CSS variables on its root.

- [ ] **Step 3: Replace public primary usages**

Use CSS variables for public menu prices, filters, active category, logo fallback, borders, and chat button.

---

### Task 7: Verification

**Files:** no production files.

- [ ] **Step 1: Run helper tests**

Run: `node --test src/lib/restaurant-theme.test.mjs`

- [ ] **Step 2: Run existing focused tests**

Run: `node --test src/lib/*.test.mjs src/components/*.test.mjs`

- [ ] **Step 3: Run TypeScript**

Run: `node .\\node_modules\\typescript\\bin\\tsc --noEmit`

- [ ] **Step 4: Run lint**

Run: `node .\\node_modules\\eslint\\bin\\eslint.js src`

- [ ] **Step 5: Summarize manual checks**

If local Supabase credentials are unavailable, report that upload and live DB save need browser/manual verification against a configured Supabase project.

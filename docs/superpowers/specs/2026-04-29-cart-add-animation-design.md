# Cart Add Animation — Design Spec

**Date:** 2026-04-29
**Status:** Approved
**Surfaces affected:** Customer view (`/[restaurantSlug]/mesa/[tableId]`)

## Problem

When users add items to the cart from the menu cards or the chatbot, the only feedback is the cart badge counter incrementing. This is easy to miss, especially on mobile where the eyes are focused on the item being tapped, far from the floating cart button. Users are unsure whether their tap registered.

## Goal

Provide an obvious, kinetic confirmation that an item was added: a small marker animates from the tap point to the floating cart button, which then bumps to receive it. Works identically across both surfaces (menu cards + chat).

## User Decisions (from brainstorm)

1. **Style:** Fly-to-cart (item visibly travels from origin to cart button).
2. **What flies:** A small colored dot/badge — consistent across all items, no per-item image.
3. **Scope:** Both surfaces (menu cards in `MenuView` and chat dish cards in `ChatInterface`).

## Visual Behavior

On tap of any "+" / "Añadir" button:

1. A `~14px` circular dot in the brand/primary color is spawned at the centre of the tapped button.
2. The dot follows a curved Bézier arc upward then down to the centre of the floating cart button (~600ms, ease `[0.4, 0, 0.2, 1]`).
3. On arrival: the dot fades out, the cart button does a scale bump (1 → 1.15 → 1, ~250ms), and the count badge pulses (1 → 1.4 → 1, ~300ms).
4. Cart state mutation (`setCartItems`) fires immediately on tap — animation is purely cosmetic and never blocks the data update.
5. Multiple rapid taps are allowed: each tap spawns its own dot. The cart bump can re-trigger; if already animating, it restarts cleanly.

### Reduced motion

If `prefers-reduced-motion: reduce`, the flying dot is skipped entirely. The badge still does an instant scale pulse (~150ms) so there is still some confirmation, but no travel animation.

## Architecture

### New files

- **`src/components/cliente/CartAnimationProvider.tsx`**
  React Context provider that:
  - Holds a ref to the cart button (`cartButtonRef`).
  - Holds a ref array of in-flight dots rendered via a portal at the document root.
  - Exposes `flyToCart(originEl: HTMLElement)` which measures origin + destination rects, pushes a new dot into in-flight state, and removes it on animation complete.
  - Exposes `triggerCartBump()` and `triggerBadgePulse()` callbacks consumed by the cart button.

- **`src/hooks/useFlyToCart.ts`**
  Thin hook that reads the `CartAnimationContext` and returns `flyToCart`. Components call `flyToCart(buttonEl)` from their click handler.

### Modified files

- **`src/components/cliente/MenuView.tsx`**
  - Wrap the customer view tree in `<CartAnimationProvider>`.
  - Attach `cartButtonRef` to the floating cart button (line ~312).
  - Wire `triggerCartBump` + `triggerBadgePulse` to the cart button + badge so they react to the context's pulse signal.

- **`src/components/cliente/MenuView.tsx` → `MenuItemCard`**
  - On "+" tap (line ~449), call `flyToCart(e.currentTarget)` *before* invoking `onAddToCart`.

- **`src/components/cliente/ChatInterface.tsx`**
  - On dish card "+" tap (lines 114 and 343), call `flyToCart(e.currentTarget)` *before* invoking `onAddToCart`.

### Animation engine

- `framer-motion` (already installed, v12.38).
- Each in-flight dot is a `motion.div` rendered through `createPortal(..., document.body)` with `position: fixed`, animating `x`, `y`, `opacity`, and `scale`.
- Curved path approximated by either:
  - `motion`'s `animate` with custom `transition: { times, ease }` and a midpoint keyframe pulled upward by `~80px` (simpler), or
  - Two-segment animation (rise then descend) — same visual effect, easier to reason about.
- Cart button bump and badge pulse use `useAnimationControls()` — small, local, no extra deps.

## Data flow

```
User taps "+" button (Menu card or Chat card)
        │
        ├─► flyToCart(buttonEl)        ◄── cosmetic, fire-and-forget
        │     ├─ measure origin rect
        │     ├─ measure cart button rect (from ref)
        │     ├─ spawn dot in portal, animate
        │     └─ on complete: remove dot, triggerCartBump + triggerBadgePulse
        │
        └─► onAddToCart(item)          ◄── existing data path, unchanged
              └─ setCartItems(...)
```

## Edge cases

- **Cart button not yet mounted / ref null** — `flyToCart` becomes a no-op (still triggers `onAddToCart`). Should not happen in practice since the cart button mounts with `MenuView`, but guard defensively.
- **Origin button unmounted mid-flight** — already captured the rect at spawn time, so animation completes against frozen coords.
- **Window resize during flight** — accept minor visual drift (animation is short). Do not recompute.
- **Customer scrolls during flight** — dot is `position: fixed`, so it stays anchored to viewport coords, not document. Cart button is also fixed. Both move together. Acceptable.
- **Many rapid taps** — each tap spawns its own dot; each animates independently. Cart bump uses `useAnimationControls().start()` which restarts cleanly on each call.
- **No `image_url` on item** — irrelevant; we always animate a brand-color dot regardless of item.

## Out of scope

- Animations elsewhere (admin views, recommendations sidebar, cart drawer item add/remove).
- Per-item visuals (item image flying). Decided B: always a dot.
- Sound effects.
- Haptic feedback.

## Acceptance criteria

- Tapping "+" on a menu card spawns a visible dot that travels to the cart button.
- Tapping "+" on a chat dish card does the same.
- Cart button visibly bumps and badge pulses on each successful add.
- `prefers-reduced-motion: reduce` disables the flying dot but keeps an instant badge pulse.
- No regression to the data path: cart count and contents update exactly as before.
- No console errors, no layout shift (portal-rendered dot must not affect document flow).

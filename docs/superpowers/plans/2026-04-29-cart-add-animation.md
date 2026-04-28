# Cart Add Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a customer adds an item to the cart from the menu cards or the chatbot, animate a small colored dot from the tap origin to the floating cart button, then bump the cart button and pulse the badge counter, providing clear kinetic feedback.

**Architecture:** A React Context provider (`CartAnimationProvider`) wraps the customer view and exposes a `flyToCart(originEl)` function plus a ref to the cart button. The provider renders in-flight dots through a portal at `document.body`, animating them along a curved path with `framer-motion`. The cart button reads animation controls from the provider so it can bump and pulse on arrival. `prefers-reduced-motion` skips the flying dot but keeps an instant badge pulse.

**Tech Stack:** Next.js 16, React 19, TypeScript, `framer-motion` v12, `node:test` for the path-math helper.

**Spec:** [`docs/superpowers/specs/2026-04-29-cart-add-animation-design.md`](../specs/2026-04-29-cart-add-animation-design.md)

---

## File Structure

**New files:**

- `src/lib/cart-animation/path.ts` — pure functions: `getElementCenter(rect)`, `buildArcKeyframes(origin, destination, lift)`, `prefersReducedMotion()`. No React. Pure logic, fully unit-testable.
- `src/lib/cart-animation/path.test.ts` — `node:test` tests for the helpers above.
- `src/lib/cart-animation/types.ts` — shared types: `Point`, `FlyingDot`.
- `src/components/cliente/CartAnimationProvider.tsx` — Context provider, renders in-flight dots via portal, exposes `flyToCart`, `cartButtonRef`, `cartBumpControls`, `badgePulseControls`.
- `src/hooks/useCartAnimation.ts` — context-consumer hook returning `{ flyToCart, cartButtonRef, cartBumpControls, badgePulseControls }`. Errors clearly if used outside provider.

**Modified files:**

- `src/components/cliente/MenuView.tsx`
  - Wrap returned tree in `<CartAnimationProvider>`.
  - Read `cartButtonRef`, `cartBumpControls`, `badgePulseControls` from `useCartAnimation()`.
  - Convert the floating cart `<button>` to `motion.button` and the badge `<span>` to `motion.span`, passing the controls.
  - In `MenuItemCard`: capture the click target (`e.currentTarget`) and call `flyToCart(originEl)` before invoking `onAddToCart`.
- `src/components/cliente/ChatInterface.tsx`
  - Two add-to-cart buttons (lines ~114 and ~343): capture the click target and call `flyToCart(originEl)` before invoking `onAddToCart?.(...)`.
  - `flyToCart` is consumed via `useCartAnimation()` (component already runs inside the provider tree because it's mounted by `MenuView`).

**No files deleted.**

---

## Task 1: Path math helpers (pure logic, TDD)

**Files:**
- Create: `src/lib/cart-animation/types.ts`
- Create: `src/lib/cart-animation/path.ts`
- Test: `src/lib/cart-animation/path.test.ts`

- [ ] **Step 1: Create the types file**

Write `src/lib/cart-animation/types.ts`:

```ts
export interface Point {
  x: number
  y: number
}

export interface FlyingDot {
  id: string
  origin: Point
  destination: Point
  color: string
}
```

- [ ] **Step 2: Write the failing tests**

Write `src/lib/cart-animation/path.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildArcKeyframes,
  getElementCenter,
} from './path.ts'

test('getElementCenter returns the center of a DOMRect-shaped object', () => {
  const rect = { left: 100, top: 200, width: 40, height: 60 } as DOMRect
  assert.deepEqual(getElementCenter(rect), { x: 120, y: 230 })
})

test('getElementCenter handles negative coordinates', () => {
  const rect = { left: -50, top: -20, width: 10, height: 10 } as DOMRect
  assert.deepEqual(getElementCenter(rect), { x: -45, y: -15 })
})

test('buildArcKeyframes returns three points starting at origin and ending at destination', () => {
  const origin = { x: 0, y: 100 }
  const destination = { x: 200, y: 100 }
  const keyframes = buildArcKeyframes(origin, destination, 80)

  assert.equal(keyframes.x.length, 3)
  assert.equal(keyframes.y.length, 3)
  assert.equal(keyframes.x[0], 0)
  assert.equal(keyframes.y[0], 100)
  assert.equal(keyframes.x[2], 200)
  assert.equal(keyframes.y[2], 100)
})

test('buildArcKeyframes lifts the midpoint by the lift amount', () => {
  const origin = { x: 0, y: 100 }
  const destination = { x: 200, y: 100 }
  const keyframes = buildArcKeyframes(origin, destination, 80)

  // midpoint x is the average
  assert.equal(keyframes.x[1], 100)
  // midpoint y is lifted upward (y decreases)
  assert.equal(keyframes.y[1], 20)
})

test('buildArcKeyframes still lifts when destination is above origin', () => {
  const origin = { x: 0, y: 500 }
  const destination = { x: 100, y: 100 }
  const keyframes = buildArcKeyframes(origin, destination, 50)

  // midpoint y should be (300) - 50 = 250
  assert.equal(keyframes.y[1], 250)
})
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `node --test src/lib/cart-animation/path.test.ts`
Expected: FAIL — `Cannot find module './path.ts'` or similar.

- [ ] **Step 4: Implement the helpers**

Write `src/lib/cart-animation/path.ts`:

```ts
import type { Point } from './types.ts'

export function getElementCenter(rect: DOMRect | { left: number; top: number; width: number; height: number }): Point {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

export function buildArcKeyframes(origin: Point, destination: Point, lift: number): { x: number[]; y: number[] } {
  const midX = (origin.x + destination.x) / 2
  const midY = (origin.y + destination.y) / 2 - lift
  return {
    x: [origin.x, midX, destination.x],
    y: [origin.y, midY, destination.y],
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `node --test src/lib/cart-animation/path.test.ts`
Expected: PASS — 5 tests passing.

- [ ] **Step 6: Run the full test suite to confirm no regressions**

Run: `node --test`
Expected: PASS — all 22 existing tests + 5 new tests = 27 passing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/cart-animation/types.ts src/lib/cart-animation/path.ts src/lib/cart-animation/path.test.ts
git commit -m "Add path-math helpers for cart-add animation"
```

---

## Task 2: Animation context + provider

**Files:**
- Create: `src/components/cliente/CartAnimationProvider.tsx`
- Create: `src/hooks/useCartAnimation.ts`

This task wires up the React Context, renders in-flight dots via portal, and exposes the public API. No existing components are modified yet.

- [ ] **Step 1: Create the hook scaffolding**

Write `src/hooks/useCartAnimation.ts`:

```ts
'use client'

import { createContext, useContext, type RefObject } from 'react'
import type { AnimationControls } from 'framer-motion'

export interface CartAnimationContextValue {
  cartButtonRef: RefObject<HTMLButtonElement | null>
  cartBumpControls: AnimationControls
  badgePulseControls: AnimationControls
  flyToCart: (originEl: HTMLElement | null) => void
}

export const CartAnimationContext = createContext<CartAnimationContextValue | null>(null)

export function useCartAnimation(): CartAnimationContextValue {
  const ctx = useContext(CartAnimationContext)
  if (!ctx) {
    throw new Error('useCartAnimation must be used inside <CartAnimationProvider>')
  }
  return ctx
}
```

- [ ] **Step 2: Create the provider component**

Write `src/components/cliente/CartAnimationProvider.tsx`:

```tsx
'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'

import { CartAnimationContext } from '@/hooks/useCartAnimation'
import { buildArcKeyframes, getElementCenter, prefersReducedMotion } from '@/lib/cart-animation/path'
import type { FlyingDot } from '@/lib/cart-animation/types'

const DOT_SIZE = 14
const ARC_LIFT = 80
const FLIGHT_DURATION = 0.6

interface Props {
  children: ReactNode
}

export default function CartAnimationProvider({ children }: Props) {
  const cartButtonRef = useRef<HTMLButtonElement | null>(null)
  const cartBumpControls = useAnimationControls()
  const badgePulseControls = useAnimationControls()
  const [dots, setDots] = useState<FlyingDot[]>([])
  const dotIdRef = useRef(0)

  const triggerLandingFx = useCallback(() => {
    cartBumpControls.start({
      scale: [1, 1.15, 1],
      transition: { duration: 0.25, ease: 'easeOut' },
    })
    badgePulseControls.start({
      scale: [1, 1.4, 1],
      transition: { duration: 0.3, ease: 'easeOut' },
    })
  }, [cartBumpControls, badgePulseControls])

  const flyToCart = useCallback((originEl: HTMLElement | null) => {
    const cartEl = cartButtonRef.current
    if (!originEl || !cartEl) return

    const originRect = originEl.getBoundingClientRect()
    const destRect = cartEl.getBoundingClientRect()
    const origin = getElementCenter(originRect)
    const destination = getElementCenter(destRect)

    if (prefersReducedMotion()) {
      triggerLandingFx()
      return
    }

    const id = `dot-${dotIdRef.current++}`
    // Theme CSS vars live on the MenuView wrapper, not document root, so read from cartEl
    // (which inherits them via cascade) — falls back to a neutral color if unresolved.
    const color = getComputedStyle(cartEl).getPropertyValue('--restaurant-primary').trim() || '#000'

    setDots(prev => [...prev, { id, origin, destination, color }])
  }, [triggerLandingFx])

  const handleDotComplete = useCallback((id: string) => {
    setDots(prev => prev.filter(d => d.id !== id))
    triggerLandingFx()
  }, [triggerLandingFx])

  const value = {
    cartButtonRef,
    cartBumpControls,
    badgePulseControls,
    flyToCart,
  }

  return (
    <CartAnimationContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
          <AnimatePresence>
            {dots.map(dot => {
              const keyframes = buildArcKeyframes(dot.origin, dot.destination, ARC_LIFT)
              return (
                <motion.div
                  key={dot.id}
                  initial={{ x: dot.origin.x - DOT_SIZE / 2, y: dot.origin.y - DOT_SIZE / 2, opacity: 1, scale: 1 }}
                  animate={{
                    x: keyframes.x.map(x => x - DOT_SIZE / 2),
                    y: keyframes.y.map(y => y - DOT_SIZE / 2),
                    opacity: [1, 1, 0.3],
                    scale: [1, 1.1, 0.7],
                  }}
                  transition={{ duration: FLIGHT_DURATION, ease: [0.4, 0, 0.2, 1], times: [0, 0.5, 1] }}
                  onAnimationComplete={() => handleDotComplete(dot.id)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: '9999px',
                    backgroundColor: dot.color,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    willChange: 'transform, opacity',
                  }}
                />
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </CartAnimationContext.Provider>
  )
}
```

- [ ] **Step 3: Verify both files compile**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCartAnimation.ts src/components/cliente/CartAnimationProvider.tsx
git commit -m "Add CartAnimationProvider and useCartAnimation hook"
```

---

## Task 3: Wire the cart button to provider controls

**Files:**
- Modify: `src/components/cliente/MenuView.tsx` (top-level wrap + cart button conversion)

This task wraps the page in the provider, attaches the cart button ref, and converts the cart button + badge to `motion` components driven by the controls. After this task the provider is live but no add-to-cart action triggers a fly yet.

- [ ] **Step 1: Add imports**

Open `src/components/cliente/MenuView.tsx`. After the existing imports (top of file, lines ~3-12), add:

```ts
import { motion } from 'framer-motion'
import CartAnimationProvider from './CartAnimationProvider'
import { useCartAnimation } from '@/hooks/useCartAnimation'
```

- [ ] **Step 2: Split the component so the provider can wrap the consumer**

Currently `MenuView` is the default export and contains all the JSX. To use `useCartAnimation()` inside it, the provider needs to be an ancestor. Refactor:

Rename the existing `export default function MenuView(...)` to `function MenuViewInner(...)` (keep its body untouched for now). Then add a new wrapper at the bottom of the component declarations:

```tsx
export default function MenuView(props: Props) {
  return (
    <CartAnimationProvider>
      <MenuViewInner {...props} />
    </CartAnimationProvider>
  )
}
```

- [ ] **Step 3: Inside `MenuViewInner`, read animation controls and ref**

Near the top of the function body (after the `useState` declarations, before `const venueType`), add:

```tsx
const { cartButtonRef, cartBumpControls, badgePulseControls } = useCartAnimation()
```

- [ ] **Step 4: Convert the floating cart button to `motion.button` and attach ref + controls**

Find the existing JSX block at lines ~310-331 starting with `{cartItems.length > 0 && (` and ending with `</button>`. Replace it with:

```tsx
{cartItems.length > 0 && (
  <motion.button
    ref={cartButtonRef}
    animate={cartBumpControls}
    onClick={() => setCartOpen(true)}
    className="fixed bottom-6 left-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-xl ring-2 ring-white/30 transition-all hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer"
    style={{
      backgroundColor: 'var(--restaurant-primary)',
      color: 'var(--restaurant-primary-foreground)',
    }}
    aria-label={`Ver pedido, ${cartItems.reduce((s, i) => s + i.quantity, 0)} artículos`}
  >
    <ShoppingCart className="h-5 w-5" />
    <motion.span
      animate={badgePulseControls}
      className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
      style={{
        backgroundColor: 'var(--restaurant-primary-foreground)',
        color: 'var(--restaurant-primary)',
      }}
    >
      {cartItems.reduce((s, i) => s + i.quantity, 0)}
    </motion.span>
  </motion.button>
)}
```

The only changes vs. the original are: `<button>` → `<motion.button>`, the inner `<span>` → `<motion.span>`, plus `ref={cartButtonRef}` and `animate={...}` props on each.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Run dev server, smoke-test in browser**

Run: `npm run dev`
Open the customer view (e.g. `http://localhost:3000/<a-real-slug>/mesa/<id>` from local Supabase data).
Expected: Page renders normally. No regressions. Cart button still shows when items present. (No fly animation yet — that's Task 4 / 5.)

Stop the dev server with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add src/components/cliente/MenuView.tsx
git commit -m "Wrap MenuView in CartAnimationProvider and wire cart button controls"
```

---

## Task 4: Trigger fly-to-cart from menu cards

**Files:**
- Modify: `src/components/cliente/MenuView.tsx` (`MenuItemCard` and the `onAddToCart` prop wiring)

- [ ] **Step 1: Pass `flyToCart` into `MenuItemCard`**

`MenuItemCard` is rendered at line ~296 inside `MenuViewInner`. The current call is:

```tsx
<MenuItemCard
  item={item}
  fontClasses={fontClasses}
  cartCount={cartItems.find(c => c.id === item.id)?.quantity ?? 0}
  onAddToCart={() => addToCart(item)}
/>
```

Change `onAddToCart` to receive the click target so the card can pass it through. Replace the prop:

```tsx
onAddToCart={(originEl: HTMLElement) => {
  flyToCart(originEl)
  addToCart(item)
}}
```

Also add `const { flyToCart } = useCartAnimation()` if not already destructured (it is, from Task 3). Update the destructure from Task 3 Step 3 to:

```tsx
const { cartButtonRef, cartBumpControls, badgePulseControls, flyToCart } = useCartAnimation()
```

- [ ] **Step 2: Update `MenuItemCard` prop signature and click handler**

In `MenuItemCard` (line ~406), change the prop signature:

```tsx
function MenuItemCard({ item, fontClasses, cartCount = 0, onAddToCart }: {
  item: MenuItem
  fontClasses: RestaurantFontClasses
  cartCount?: number
  onAddToCart?: (originEl: HTMLElement) => void
}) {
```

In the same component (line ~449), change the `+` button's `onClick` to pass `e.currentTarget`:

```tsx
<button
  onClick={e => { e.stopPropagation(); onAddToCart?.(e.currentTarget) }}
  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold leading-none cursor-pointer transition-all active:scale-90"
  style={cartCount > 0 ? {
    backgroundColor: 'var(--restaurant-primary)',
    color: 'var(--restaurant-primary-foreground)',
  } : {
    backgroundColor: 'var(--restaurant-primary-light)',
    color: 'var(--restaurant-primary-readable)',
  }}
  aria-label={cartCount > 0 ? `${cartCount} en carrito, añadir otro ${item.name}` : `Añadir ${item.name} al carrito`}
>
  {cartCount > 0 ? cartCount : '+'}
</button>
```

(Only the `onClick` line changed — everything else is identical to the original.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Smoke-test in browser**

Run: `npm run dev`. Open a customer view. Tap "+" on any menu item.
Expected:
- A small colored dot flies in an arc from the "+" button to the floating cart button.
- The cart button bumps and the count badge pulses on landing.
- Cart count increments correctly (data path unchanged).
- Tapping rapidly spawns multiple dots that animate independently.

Toggle reduced motion in your OS (e.g. macOS System Settings → Accessibility → Display → Reduce motion). Reload. Tap "+".
Expected: No flying dot, but the badge still pulses instantly.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/cliente/MenuView.tsx
git commit -m "Trigger fly-to-cart animation from menu item cards"
```

---

## Task 5: Trigger fly-to-cart from chatbot dish cards

**Files:**
- Modify: `src/components/cliente/ChatInterface.tsx`

The chat renders inside `MenuView`'s tree (mounted at line ~380), so `useCartAnimation()` is already available.

- [ ] **Step 1: Import the hook**

In `src/components/cliente/ChatInterface.tsx`, add to the existing imports near the top:

```ts
import { useCartAnimation } from '@/hooks/useCartAnimation'
```

- [ ] **Step 2: Read `flyToCart` inside the component**

Inside the `ChatInterface` function body (near where other hooks like `useState`/`useRef` are called), add:

```ts
const { flyToCart } = useCartAnimation()
```

- [ ] **Step 3: Update the inline dish-card "+" button (line ~113)**

Find the existing button:

```tsx
<button
  onClick={() => onAddToCart?.(item.id)}
  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold align-baseline mx-0.5 cursor-pointer transition-opacity hover:opacity-80 active:scale-95"
  style={{ backgroundColor: 'var(--restaurant-primary)', color: 'var(--restaurant-primary-foreground)' }}
  aria-label={`Añadir ${item.name} al pedido`}
>
  {children}
  <span className="text-[11px] font-bold leading-none">+</span>
</button>
```

Change `onClick` to:

```tsx
onClick={e => { flyToCart(e.currentTarget); onAddToCart?.(item.id) }}
```

- [ ] **Step 4: Update the visual recommendations grid "+" button (line ~342)**

Find:

```tsx
<button
  onClick={() => onAddToCart?.(img.id)}
  className="text-[10px] font-semibold rounded-full px-2 py-1 text-center cursor-pointer transition-opacity hover:opacity-80 leading-tight"
  style={{ backgroundColor: 'var(--restaurant-primary)', color: 'var(--restaurant-primary-foreground)' }}
  aria-label={`Añadir ${img.name} al pedido`}
>+ Añadir</button>
```

Change `onClick` to:

```tsx
onClick={e => { flyToCart(e.currentTarget); onAddToCart?.(img.id) }}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Smoke-test in browser**

Run: `npm run dev`. Open a customer view, open the chat, ask the assistant for recommendations until a dish card or visual grid appears, tap "+".
Expected:
- Same dot-fly-to-cart animation as from menu cards.
- Cart count increments.
- Chat stays open, no regression to existing behavior.

Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/cliente/ChatInterface.tsx
git commit -m "Trigger fly-to-cart animation from chat dish cards"
```

---

## Task 6: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `node --test`
Expected: PASS — 27 tests (22 existing + 5 new).

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new errors or warnings beyond pre-existing baseline.

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: Build completes successfully.

- [ ] **Step 4: Manual QA pass in browser**

Run: `npm run dev`. Walk through:

1. Add an item from a menu card → dot flies, cart bumps, badge pulses, count increments.
2. Open chat, get recommendations, add an item → same animation.
3. Tap "+" rapidly 5 times → 5 dots spawn, all animate, count goes up by 5, no console errors.
4. Open dev tools and emulate `prefers-reduced-motion: reduce` → flying dot is skipped, badge still pulses, count still increments.
5. Resize the window mid-animation → minor visual drift acceptable; no crashes.
6. Open the cart drawer → all added items present.

- [ ] **Step 5: Final commit if QA notes any small fixes**

If everything passes, no commit needed. Otherwise apply the fix and:

```bash
git add <files>
git commit -m "Polish cart animation based on QA"
```

---

## Acceptance Criteria (matches spec)

- [x] Tapping "+" on a menu card spawns a visible dot that travels to the cart button. (Task 4)
- [x] Tapping "+" on a chat dish card does the same. (Task 5)
- [x] Cart button visibly bumps and badge pulses on each successful add. (Task 2 + Task 3)
- [x] `prefers-reduced-motion: reduce` disables the flying dot but keeps an instant badge pulse. (Task 2)
- [x] No regression to the data path: cart count and contents update exactly as before. (Tasks 4, 5 keep existing handlers intact.)
- [x] No console errors, no layout shift. (Portal-rendered dots use `position: fixed`, `pointer-events: none`.)

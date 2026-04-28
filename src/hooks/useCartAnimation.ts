'use client'

import { createContext, useContext, type RefObject } from 'react'
// framer-motion v12 doesn't re-export AnimationControls from its own package boundary,
// so we derive the type from the hook's return signature instead.
import { type useAnimationControls } from 'framer-motion'

type AnimationControls = ReturnType<typeof useAnimationControls>

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

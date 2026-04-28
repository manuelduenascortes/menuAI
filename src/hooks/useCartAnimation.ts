'use client'

import { createContext, useContext, type RefObject } from 'react'
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

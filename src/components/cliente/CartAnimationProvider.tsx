'use client'

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
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

    if (prefersReducedMotion()) {
      triggerLandingFx()
      return
    }

    const originRect = originEl.getBoundingClientRect()
    const destRect = cartEl.getBoundingClientRect()
    const origin = getElementCenter(originRect)
    const destination = getElementCenter(destRect)

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

  const value = useMemo(() => ({
    cartButtonRef,
    cartBumpControls,
    badgePulseControls,
    flyToCart,
  }), [flyToCart])

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

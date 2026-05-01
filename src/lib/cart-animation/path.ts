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

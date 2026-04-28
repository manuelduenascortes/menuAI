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

import assert from 'node:assert/strict'
import test from 'node:test'
import * as hydrationStore from './hydration-store.mjs'

const {
  getHydrationServerSnapshot,
  getHydrationSnapshot,
  subscribeHydration,
} = hydrationStore

test('hydration snapshots differ between server and client', () => {
  assert.equal(getHydrationServerSnapshot(), false)
  assert.equal(getHydrationSnapshot(), true)
})

test('subscribeHydration schedules a callback through the provided scheduler', async () => {
  let calls = 0

  const cleanup = subscribeHydration(() => {
    calls += 1
  }, (callback) => {
    callback()
    return () => {
      calls += 10
    }
  })

  assert.equal(calls, 1)
  cleanup()
  assert.equal(calls, 11)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import cspPolicy from './csp-policy.cjs'

const { buildCsp } = cspPolicy

test('keeps unsafe-eval in development but skips upgrade-insecure-requests', () => {
  const csp = buildCsp({
    isDev: true,
    supabaseUrl: 'https://example.supabase.co',
    supabaseHostname: 'example.supabase.co',
  })

  assert.equal(csp.includes("'unsafe-eval'"), true)
  assert.equal(csp.includes('upgrade-insecure-requests'), false)
  assert.equal(csp.includes('ws://127.0.0.1:*'), true)
  assert.equal(csp.includes('ws://localhost:*'), true)
})

test('adds upgrade-insecure-requests outside development', () => {
  const csp = buildCsp({
    isDev: false,
    supabaseUrl: 'https://example.supabase.co',
    supabaseHostname: 'example.supabase.co',
  })

  assert.equal(csp.includes("'unsafe-eval'"), false)
  assert.equal(csp.includes('upgrade-insecure-requests'), true)
})

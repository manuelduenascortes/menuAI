import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getGlobalThemeTogglePosition,
  isPublicMenuRoute,
} from './theme-toggle-position.ts'

test('detects public menu routes by restaurant slug', () => {
  assert.equal(isPublicMenuRoute('/cafeteria-manuel'), true)
  assert.equal(isPublicMenuRoute('/cafeteria-manuel/mesa/12'), true)
})

test('does not treat static or admin routes as public menus', () => {
  assert.equal(isPublicMenuRoute('/'), false)
  assert.equal(isPublicMenuRoute('/cookies'), false)
  assert.equal(isPublicMenuRoute('/admin/login'), false)
  assert.equal(isPublicMenuRoute('/auth/update-password'), false)
})

test('uses a lower offset on public menu pages to avoid the sticky header controls', () => {
  assert.equal(getGlobalThemeTogglePosition('/cafeteria-manuel'), 'fixed top-[5.25rem] right-4 z-[70] md:top-6')
  assert.equal(getGlobalThemeTogglePosition('/cafeteria-manuel/mesa/12'), 'fixed top-[5.25rem] right-4 z-[70] md:top-6')
  assert.equal(getGlobalThemeTogglePosition('/admin/login'), 'fixed top-4 right-4 z-[70]')
})

import assert from 'node:assert/strict'
import test from 'node:test'
import * as cookieBannerVisibility from './cookie-banner-visibility.mjs'

const { shouldShowCookieBanner } = cookieBannerVisibility

test('shows banner when consent is missing outside customer table routes', () => {
  assert.equal(shouldShowCookieBanner('/admin/ajustes', null), true)
})

test('hides banner on customer table routes even without consent', () => {
  assert.equal(shouldShowCookieBanner('/menu-demo/mesa/12', null), false)
})

test('hides banner when consent was already accepted', () => {
  assert.equal(shouldShowCookieBanner('/admin/ajustes', 'accepted'), false)
})

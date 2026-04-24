import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_MENU_ACCESS_MODE,
  DEFAULT_VENUE_TYPE,
  MENU_ACCESS_OPTIONS,
  VENUE_OPTIONS,
  getChatLauncherCopy,
  getMenuAccessOption,
  getVenueOption,
} from './venue-config.ts'

test('getVenueOption returns the exact configured option for each venue type', () => {
  for (const option of VENUE_OPTIONS) {
    assert.deepEqual(getVenueOption(option.value), option)
  }
})

test('getVenueOption falls back to the default venue type when value is missing', () => {
  assert.deepEqual(getVenueOption(null), VENUE_OPTIONS.find((option) => option.value === DEFAULT_VENUE_TYPE))
})

test('getMenuAccessOption returns the exact configured option for each access mode', () => {
  for (const option of MENU_ACCESS_OPTIONS) {
    assert.deepEqual(getMenuAccessOption(option.value), option)
  }
})

test('getMenuAccessOption falls back to the default access mode when value is missing', () => {
  assert.deepEqual(
    getMenuAccessOption(null),
    MENU_ACCESS_OPTIONS.find((option) => option.value === DEFAULT_MENU_ACCESS_MODE)
  )
})

test('chat launcher copy is specific to the venue and reinforces the assistant role', () => {
  assert.deepEqual(getChatLauncherCopy('restaurant'), {
    badge: 'Asistente IA',
    title: 'Te ayudo con tu pedido',
    subtitle: 'Recomendaciones según gustos, antojos y alergias',
  })

  assert.deepEqual(getChatLauncherCopy('bar_cafe'), {
    badge: 'Asistente IA',
    title: 'Te recomiendo algo para tomar',
    subtitle: 'Según el momento, el sabor y lo que te apetece',
  })

  assert.deepEqual(getChatLauncherCopy('cocktail_bar'), {
    badge: 'Asistente IA',
    title: 'Encuentra tu copa ideal',
    subtitle: 'Según sabor, intensidad y si quieres alcohol o no',
  })
})

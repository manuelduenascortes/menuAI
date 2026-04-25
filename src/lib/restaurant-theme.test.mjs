import assert from 'node:assert/strict'
import test from 'node:test'
import theme from './restaurant-theme.cjs'

const {
  DEFAULT_FONT_STYLE,
  DEFAULT_PRIMARY_COLOR,
  extractRestaurantLogoPath,
  getRestaurantTheme,
  isValidHexColor,
  normalizeFontStyle,
  normalizePrimaryColor,
} = theme

test('validates six-digit hex colors with a leading hash', () => {
  assert.equal(isValidHexColor('#8B5E3C'), true)
  assert.equal(isValidHexColor('#ffffff'), true)
  assert.equal(isValidHexColor('8B5E3C'), false)
  assert.equal(isValidHexColor('#FFF'), false)
  assert.equal(isValidHexColor('#GGGGGG'), false)
})

test('normalizes invalid colors to the default primary color', () => {
  assert.equal(normalizePrimaryColor('#abcdef'), '#ABCDEF')
  assert.equal(normalizePrimaryColor(null), DEFAULT_PRIMARY_COLOR)
  assert.equal(normalizePrimaryColor('not-a-color'), DEFAULT_PRIMARY_COLOR)
})

test('normalizes unknown font styles to clasico', () => {
  assert.equal(normalizeFontStyle('elegante'), 'elegante')
  assert.equal(normalizeFontStyle('unknown'), DEFAULT_FONT_STYLE)
  assert.equal(normalizeFontStyle(null), DEFAULT_FONT_STYLE)
})

test('derives readable theme colors from the selected primary color', () => {
  assert.deepEqual(getRestaurantTheme('#000000'), {
    primary: '#000000',
    primaryLight: '#E6E6E6',
    primaryForeground: '#FFFFFF',
  })

  assert.deepEqual(getRestaurantTheme('#FFFFFF'), {
    primary: '#FFFFFF',
    primaryLight: '#FFFFFF',
    primaryForeground: '#1C1917',
  })
})

test('extracts previous logo paths only from the restaurant logos bucket', () => {
  const url = 'https://example.supabase.co/storage/v1/object/public/restaurant-logos/restaurant-1/logo.webp'

  assert.equal(
    extractRestaurantLogoPath(url),
    'restaurant-1/logo.webp'
  )
  assert.equal(
    extractRestaurantLogoPath('https://example.supabase.co/storage/v1/object/public/menu-images/restaurant-1/photo.webp'),
    null
  )
  assert.equal(extractRestaurantLogoPath('not-a-url'), null)
})

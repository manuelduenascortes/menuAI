const DEFAULT_PRIMARY_COLOR = '#8B5E3C'
const DEFAULT_FONT_STYLE = 'clasico'
const RESTAURANT_LOGOS_BUCKET = 'restaurant-logos'

const FONT_STYLE_OPTIONS = [
  {
    value: 'clasico',
    label: 'Clasico',
    heading: 'DM Serif Display',
    body: 'Outfit',
  },
  {
    value: 'elegante',
    label: 'Elegante',
    heading: 'Playfair Display',
    body: 'Lato',
  },
  {
    value: 'moderno',
    label: 'Moderno',
    heading: 'Inter',
    body: 'Inter',
  },
  {
    value: 'casual',
    label: 'Casual',
    heading: 'Nunito',
    body: 'Nunito',
  },
  {
    value: 'minimalista',
    label: 'Minimalista',
    heading: 'Space Grotesk',
    body: 'Space Grotesk',
  },
]

const FONT_STYLE_VALUES = new Set(FONT_STYLE_OPTIONS.map((option) => option.value))

function isValidHexColor(value) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}

function normalizePrimaryColor(value) {
  return isValidHexColor(value) ? value.toUpperCase() : DEFAULT_PRIMARY_COLOR
}

function normalizeFontStyle(value) {
  return FONT_STYLE_VALUES.has(value) ? value : DEFAULT_FONT_STYLE
}

function hexToRgb(hex) {
  const normalized = normalizePrimaryColor(hex).slice(1)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}

function mixWithWhite(hex, amount) {
  const rgb = hexToRgb(hex)

  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  })
}

function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4)
  })

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function getRestaurantTheme(value) {
  const primary = normalizePrimaryColor(value)

  return {
    primary,
    primaryLight: mixWithWhite(primary, 0.9),
    primaryForeground: getRelativeLuminance(primary) > 0.55 ? '#1C1917' : '#FFFFFF',
  }
}

function extractRestaurantLogoPath(url) {
  if (!url) return null

  try {
    const parsed = new URL(url)
    const marker = `/storage/v1/object/public/${RESTAURANT_LOGOS_BUCKET}/`
    const markerIndex = parsed.pathname.indexOf(marker)

    if (markerIndex === -1) return null

    const objectPath = parsed.pathname.slice(markerIndex + marker.length)
    return objectPath ? decodeURIComponent(objectPath) : null
  } catch {
    return null
  }
}

module.exports = {
  DEFAULT_FONT_STYLE,
  DEFAULT_PRIMARY_COLOR,
  FONT_STYLE_OPTIONS,
  RESTAURANT_LOGOS_BUCKET,
  extractRestaurantLogoPath,
  getRestaurantTheme,
  isValidHexColor,
  normalizeFontStyle,
  normalizePrimaryColor,
}

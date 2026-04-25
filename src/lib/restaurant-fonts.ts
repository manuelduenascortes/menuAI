import {
  DM_Serif_Display,
  Inter,
  Lato,
  Nunito,
  Outfit,
  Playfair_Display,
  Space_Grotesk,
} from 'next/font/google'
import { FONT_STYLE_OPTIONS, normalizeFontStyle, type FontStyle } from './restaurant-theme'

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
})

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
})

export type RestaurantFontClasses = {
  heading: string
  body: string
}

const FONT_CLASS_MAP: Record<FontStyle, RestaurantFontClasses> = {
  clasico: {
    heading: dmSerif.className,
    body: outfit.className,
  },
  elegante: {
    heading: playfair.className,
    body: lato.className,
  },
  moderno: {
    heading: inter.className,
    body: inter.className,
  },
  casual: {
    heading: nunito.className,
    body: nunito.className,
  },
  minimalista: {
    heading: spaceGrotesk.className,
    body: spaceGrotesk.className,
  },
}

export function getRestaurantFontClasses(value: unknown): RestaurantFontClasses {
  return FONT_CLASS_MAP[normalizeFontStyle(value)]
}

export function getRestaurantFontClassMap(): Record<FontStyle, RestaurantFontClasses> {
  return FONT_STYLE_OPTIONS.reduce(
    (acc, option) => ({
      ...acc,
      [option.value]: FONT_CLASS_MAP[option.value],
    }),
    {} as Record<FontStyle, RestaurantFontClasses>
  )
}

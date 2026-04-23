export const ESTABLISHMENT_TYPES = [
  'Bar',
  'Restaurante',
  'Cafetería',
  'Cervecería',
  'Taberna',
  'Chiringuito',
  'Otro',
] as const

export type EstablishmentType = (typeof ESTABLISHMENT_TYPES)[number]

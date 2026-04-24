import type { MenuAccessMode, VenueType } from './types'

export const DEFAULT_VENUE_TYPE: VenueType = 'restaurant'
export const DEFAULT_MENU_ACCESS_MODE: MenuAccessMode = 'both'

export interface VenueConfig {
  label: string
  businessLabel: string
  itemSingular: string
  itemPlural: string
  descriptionPlaceholder: string
  publicDescription: string
  publicHint: string
  chatGreeting: string
  chatFocus: string
  chatComplementHint: string
}

const VENUE_CONFIGS: Record<VenueType, VenueConfig> = {
  restaurant: {
    label: 'Restaurante',
    businessLabel: 'restaurante',
    itemSingular: 'plato',
    itemPlural: 'platos',
    descriptionPlaceholder: 'Cocina mediterranea, menu del dia, brasas, producto local...',
    publicDescription: 'Consulta la carta y recibe recomendaciones segun gustos y restricciones.',
    publicHint: 'Usa el asistente para encontrar platos segun gustos, alergias o momento de la comida.',
    chatGreeting:
      'Hola! Soy el asistente de este local. Puedo ayudarte a elegir platos segun tus gustos, restricciones o lo que te apetezca ahora mismo.',
    chatFocus:
      'Prioriza restricciones alimentarias, gustos, intensidad, tipo de plato y momento de consumo.',
    chatComplementHint:
      'Cuando tenga sentido, sugiere acompanamientos, bebidas o postres solo si existen en la carta.',
  },
  bar_cafe: {
    label: 'Bar / Cafeteria',
    businessLabel: 'bar o cafeteria',
    itemSingular: 'producto',
    itemPlural: 'productos',
    descriptionPlaceholder: 'Cafes, desayunos, meriendas, tapas, refrescos, bolleria...',
    publicDescription: 'Descubre la oferta del local y pide recomendaciones segun el momento del dia.',
    publicHint: 'El asistente puede ayudarte a elegir algo caliente o frio, dulce o salado, suave o intenso.',
    chatGreeting:
      'Hola! Soy el asistente de este local. Puedo ayudarte a encontrar algo para desayunar, merendar, tomar un cafe o pedir una tapa o bebida.',
    chatFocus:
      'Prioriza momento del dia, caliente o frio, dulce o salado, suave o intenso, con o sin cafeina o alcohol si aplica.',
    chatComplementHint:
      'Cuando aporte valor, sugiere combinaciones naturales como cafe y dulce, tapa y bebida o alternativas sin alcohol si existen.',
  },
  cocktail_bar: {
    label: 'Cocteleria / Bar de copas',
    businessLabel: 'cocteleria o bar de copas',
    itemSingular: 'consumicion',
    itemPlural: 'consumiciones',
    descriptionPlaceholder: 'Cocteles de autor, clasicos, combinados premium, sin alcohol...',
    publicDescription: 'Explora la carta de bebidas y recibe sugerencias segun sabor, intensidad o tipo de copa.',
    publicHint: 'El asistente puede recomendar algo refrescante, intenso, clasico, afrutado o sin alcohol.',
    chatGreeting:
      'Hola! Soy el asistente de este local. Puedo ayudarte a elegir una copa, coctel o bebida segun sabores, intensidad y si prefieres alcohol o no.',
    chatFocus:
      'Prioriza perfil de sabor, intensidad, con o sin alcohol, clasico o de autor, refrescante o seco.',
    chatComplementHint:
      'Cuando tenga sentido, sugiere alternativas relacionadas o versiones sin alcohol solo si existen en la carta.',
  },
}

export const VENUE_OPTIONS: { value: VenueType; label: string; description: string }[] = [
  {
    value: 'restaurant',
    label: VENUE_CONFIGS.restaurant.label,
    description: 'Pensado para comidas, cenas y recomendaciones de platos.',
  },
  {
    value: 'bar_cafe',
    label: VENUE_CONFIGS.bar_cafe.label,
    description: 'Ideal para bares, cafeterias, desayunos, meriendas o tapas.',
  },
  {
    value: 'cocktail_bar',
    label: VENUE_CONFIGS.cocktail_bar.label,
    description: 'Orientado a copas, cocteles, combinados y bebidas de noche.',
  },
]

export const MENU_ACCESS_OPTIONS: { value: MenuAccessMode; label: string; description: string }[] = [
  {
    value: 'general_qr',
    label: 'QR general del local',
    description: 'Un único QR abre la carta completa del local.',
  },
  {
    value: 'table_qr',
    label: 'QR por mesa',
    description: 'Cada mesa tiene su propio QR.',
  },
  {
    value: 'both',
    label: 'QR general y por mesa',
    description: 'Combina un QR general del local con QR individuales por mesa.',
  },
]

export function normalizeVenueType(venueType?: VenueType | null): VenueType {
  return venueType ?? DEFAULT_VENUE_TYPE
}

export function normalizeMenuAccessMode(menuAccessMode?: MenuAccessMode | null): MenuAccessMode {
  return menuAccessMode ?? DEFAULT_MENU_ACCESS_MODE
}

export function getVenueConfig(venueType?: VenueType | null): VenueConfig {
  return VENUE_CONFIGS[normalizeVenueType(venueType)]
}

export function supportsGeneralQr(menuAccessMode?: MenuAccessMode | null): boolean {
  const mode = normalizeMenuAccessMode(menuAccessMode)
  return mode === 'general_qr' || mode === 'both'
}

export function supportsTableQr(menuAccessMode?: MenuAccessMode | null): boolean {
  const mode = normalizeMenuAccessMode(menuAccessMode)
  return mode === 'table_qr' || mode === 'both'
}

export function getAccessModeLabel(menuAccessMode?: MenuAccessMode | null): string {
  const mode = normalizeMenuAccessMode(menuAccessMode)
  return MENU_ACCESS_OPTIONS.find((option) => option.value === mode)?.label ?? MENU_ACCESS_OPTIONS[2].label
}

export function getAccessModeDescription(menuAccessMode?: MenuAccessMode | null): string {
  const mode = normalizeMenuAccessMode(menuAccessMode)
  return MENU_ACCESS_OPTIONS.find((option) => option.value === mode)?.description ?? MENU_ACCESS_OPTIONS[2].description
}

export function getAccessChecklistStep(menuAccessMode?: MenuAccessMode | null): string {
  const mode = normalizeMenuAccessMode(menuAccessMode)
  if (mode === 'general_qr') return 'Activar QR general'
  if (mode === 'table_qr') return 'Crear mesas y QR'
  return 'Configurar acceso y QR'
}

export function getAccessManagementTitle(menuAccessMode?: MenuAccessMode | null): string {
  return supportsTableQr(menuAccessMode) ? 'Acceso y codigos QR' : 'Acceso a la carta'
}

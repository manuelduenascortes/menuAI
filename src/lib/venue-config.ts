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
  chatLauncherTitle: string
  chatLauncherSubtitle: string
}

interface VenueOption {
  value: VenueType
  label: string
  description: string
}

interface MenuAccessOption {
  value: MenuAccessMode
  label: string
  description: string
}

interface ChatLauncherCopy {
  badge: string
  title: string
  subtitle: string
}

const VENUE_CONFIGS: Record<VenueType, VenueConfig> = {
  restaurant: {
    label: 'Restaurante',
    businessLabel: 'restaurante',
    itemSingular: 'plato',
    itemPlural: 'platos',
    descriptionPlaceholder: 'Cocina mediterránea, menú del día, brasas, producto local...',
    publicDescription: 'Consulta la carta y recibe recomendaciones según gustos y restricciones.',
    publicHint: 'Usa el asistente para encontrar platos según gustos, alergias o momento de la comida.',
    chatGreeting:
      '¡Hola! Soy el asistente de este local. Puedo ayudarte a elegir platos según tus gustos, restricciones o lo que te apetezca ahora mismo.',
    chatFocus:
      'Prioriza restricciones alimentarias, gustos, intensidad, tipo de plato y momento de consumo.',
    chatComplementHint:
      'Cuando tenga sentido, sugiere acompañamientos, bebidas o postres solo si existen en la carta.',
    chatLauncherTitle: 'Te ayudo con tu pedido',
    chatLauncherSubtitle: 'Recomendaciones según gustos, antojos y alergias',
  },
  bar_cafe: {
    label: 'Bar / Cafetería',
    businessLabel: 'bar o cafetería',
    itemSingular: 'producto',
    itemPlural: 'productos',
    descriptionPlaceholder: 'Cafés, desayunos, meriendas, tapas, refrescos, bollería...',
    publicDescription: 'Descubre la oferta del local y pide recomendaciones según el momento del día.',
    publicHint: 'El asistente puede ayudarte a elegir algo caliente o frío, dulce o salado, suave o intenso.',
    chatGreeting:
      '¡Hola! Soy el asistente de este local. Puedo ayudarte a encontrar algo para desayunar, merendar, tomar un café o pedir una tapa o bebida.',
    chatFocus:
      'Prioriza momento del día, caliente o frío, dulce o salado, suave o intenso, con o sin cafeína o alcohol si aplica.',
    chatComplementHint:
      'Cuando aporte valor, sugiere combinaciones naturales como café y dulce, tapa y bebida o alternativas sin alcohol si existen.',
    chatLauncherTitle: 'Te recomiendo algo para tomar',
    chatLauncherSubtitle: 'Según el momento, el sabor y lo que te apetece',
  },
  cocktail_bar: {
    label: 'Coctelería / Bar de copas',
    businessLabel: 'coctelería o bar de copas',
    itemSingular: 'consumición',
    itemPlural: 'consumiciones',
    descriptionPlaceholder: 'Cócteles de autor, clásicos, combinados premium, sin alcohol...',
    publicDescription: 'Explora la carta de bebidas y recibe sugerencias según sabor, intensidad o tipo de copa.',
    publicHint: 'El asistente puede recomendar algo refrescante, intenso, clásico, afrutado o sin alcohol.',
    chatGreeting:
      '¡Hola! Soy el asistente de este local. Puedo ayudarte a elegir una copa, cóctel o bebida según sabores, intensidad y si prefieres alcohol o no.',
    chatFocus:
      'Prioriza perfil de sabor, intensidad, con o sin alcohol, clásico o de autor, refrescante o seco.',
    chatComplementHint:
      'Cuando tenga sentido, sugiere alternativas relacionadas o versiones sin alcohol solo si existen en la carta.',
    chatLauncherTitle: 'Encuentra tu copa ideal',
    chatLauncherSubtitle: 'Según sabor, intensidad y si quieres alcohol o no',
  },
}

export const VENUE_OPTIONS: VenueOption[] = [
  {
    value: 'restaurant',
    label: VENUE_CONFIGS.restaurant.label,
    description: 'Pensado para comidas, cenas y recomendaciones de platos.',
  },
  {
    value: 'bar_cafe',
    label: VENUE_CONFIGS.bar_cafe.label,
    description: 'Ideal para bares, cafeterías, desayunos, meriendas o tapas.',
  },
  {
    value: 'cocktail_bar',
    label: VENUE_CONFIGS.cocktail_bar.label,
    description: 'Orientado a copas, cócteles, combinados y bebidas de noche.',
  },
]

export const MENU_ACCESS_OPTIONS: MenuAccessOption[] = [
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

export function getVenueOption(venueType?: VenueType | null): VenueOption {
  const normalized = normalizeVenueType(venueType)
  return VENUE_OPTIONS.find((option) => option.value === normalized) ?? VENUE_OPTIONS[0]
}

export function getMenuAccessOption(menuAccessMode?: MenuAccessMode | null): MenuAccessOption {
  const normalized = normalizeMenuAccessMode(menuAccessMode)
  return MENU_ACCESS_OPTIONS.find((option) => option.value === normalized) ?? MENU_ACCESS_OPTIONS[2]
}

export function getVenueConfig(venueType?: VenueType | null): VenueConfig {
  return VENUE_CONFIGS[normalizeVenueType(venueType)]
}

export function getVenueTypeLabel(venueType?: VenueType | null): string {
  return getVenueOption(venueType).label
}

export function getChatLauncherCopy(venueType?: VenueType | null): ChatLauncherCopy {
  const venueConfig = getVenueConfig(venueType)
  return {
    badge: 'Asistente IA',
    title: venueConfig.chatLauncherTitle,
    subtitle: venueConfig.chatLauncherSubtitle,
  }
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
  return getMenuAccessOption(menuAccessMode).label
}

export function getAccessModeDescription(menuAccessMode?: MenuAccessMode | null): string {
  return getMenuAccessOption(menuAccessMode).description
}

export function getAccessChecklistStep(menuAccessMode?: MenuAccessMode | null): string {
  const mode = normalizeMenuAccessMode(menuAccessMode)
  if (mode === 'general_qr') return 'Activar QR general'
  if (mode === 'table_qr') return 'Crear mesas y QR'
  return 'Configurar acceso y QR'
}

export function getAccessManagementTitle(menuAccessMode?: MenuAccessMode | null): string {
  return supportsTableQr(menuAccessMode) ? 'Acceso y códigos QR' : 'Acceso a la carta'
}

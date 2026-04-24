const RESERVED_TOP_LEVEL_ROUTES = new Set([
  'admin',
  'api',
  'auth',
  'aviso-legal',
  'contacto',
  'cookies',
  'privacidad',
  'terminos',
  'trial-expired',
])

function getPathSegments(pathname?: null | string): string[] {
  if (!pathname) return []
  return pathname.split('/').filter(Boolean)
}

export function isPublicMenuRoute(pathname?: null | string): boolean {
  const segments = getPathSegments(pathname)
  if (segments.length === 0) return false

  const [topLevel, maybeMesa, maybeTableId] = segments
  if (RESERVED_TOP_LEVEL_ROUTES.has(topLevel)) return false

  if (segments.length === 1) return true
  if (segments.length === 3 && maybeMesa === 'mesa' && maybeTableId.length > 0) return true

  return false
}

export function getGlobalThemeTogglePosition(pathname?: null | string): string {
  if (isPublicMenuRoute(pathname)) {
    return 'fixed top-[5.25rem] right-4 z-[70] md:top-6'
  }

  return 'fixed top-4 right-4 z-[70]'
}

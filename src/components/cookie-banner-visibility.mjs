export function shouldShowCookieBanner(pathname, consent) {
  const normalizedPathname = pathname?.replace(/\/$/, '') ?? ''
  const publicPageSlugs = new Set(['aviso-legal', 'contacto', 'cookies', 'privacidad', 'terminos', 'trial-expired'])
  const segments = normalizedPathname.split('/').filter(Boolean)
  const isCustomerMenuRoute =
    segments.length === 1
      ? /^[a-z0-9-]+$/.test(segments[0]) && !publicPageSlugs.has(segments[0])
      : segments.length === 3 && /^[a-z0-9-]+$/.test(segments[0]) && segments[1] === 'mesa' && segments[2].length > 0

  return !isCustomerMenuRoute && consent === null
}

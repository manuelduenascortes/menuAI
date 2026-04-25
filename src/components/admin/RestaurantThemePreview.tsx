import type { CSSProperties } from 'react'
import type { VenueType } from '@/lib/types'
import type { RestaurantFontClasses } from '@/lib/restaurant-fonts'
import { getRestaurantTheme } from '@/lib/restaurant-theme'
import { getVenueConfig } from '@/lib/venue-config'
import { MessageCircle } from 'lucide-react'

export default function RestaurantThemePreview({
  restaurantName,
  venueType,
  logoUrl,
  primaryColor,
  fontClasses,
}: {
  restaurantName: string
  venueType: VenueType
  logoUrl?: string | null
  primaryColor: string
  fontClasses: RestaurantFontClasses
}) {
  const theme = getRestaurantTheme(primaryColor)
  const venueConfig = getVenueConfig(venueType)
  const style = {
    '--preview-primary': theme.primary,
    '--preview-primary-light': theme.primaryLight,
    '--preview-primary-foreground': theme.primaryForeground,
  } as CSSProperties

  return (
    <aside className="rounded-xl border border-border bg-card p-3 shadow-sm" style={style}>
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <p className={`truncate text-lg leading-tight text-foreground ${fontClasses.heading}`}>
            {restaurantName || 'Nombre del local'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{venueConfig.label}</p>
        </div>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={restaurantName}
            className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{ backgroundColor: 'var(--preview-primary-light)', color: 'var(--preview-primary)' }}
          >
            {(restaurantName || 'M').charAt(0)}
          </div>
        )}
      </div>

      <div className={fontClasses.body}>
        <div className="mb-3 flex gap-1.5 overflow-hidden">
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: 'var(--preview-primary)', color: 'var(--preview-primary-foreground)' }}
          >
            Entrantes
          </span>
          <span className="rounded-full px-3 py-1 text-xs text-muted-foreground">Principales</span>
        </div>

        <section>
          <h4 className={`mb-2 text-xl text-foreground ${fontClasses.heading}`}>Entrantes</h4>
          <div className="space-y-2">
            {[
              ['Croquetas caseras', 'Cremosas, doradas y hechas al momento', '8.50EUR'],
              ['Ensalada de temporada', 'Producto fresco con vinagreta suave', '11.00EUR'],
            ].map(([name, description, price]) => (
              <div key={name} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold" style={{ color: 'var(--preview-primary)' }}>
                    {price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 flex justify-end">
          <div
            className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium shadow-sm"
            style={{ backgroundColor: 'var(--preview-primary)', color: 'var(--preview-primary-foreground)' }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Te ayudo?
          </div>
        </div>
      </div>
    </aside>
  )
}

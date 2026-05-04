import { getFullMenu } from '@/lib/menu-cache'
import { notFound } from 'next/navigation'
import MenuView from '@/components/cliente/MenuView'
import type { Metadata } from 'next'
import { getVenueConfig } from '@/lib/venue-config'
import { getRestaurantFontClasses } from '@/lib/restaurant-fonts'

interface Props {
  params: Promise<{ restaurantSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { restaurantSlug } = await params
  const result = await getFullMenu(restaurantSlug)
  const restaurant = result?.restaurant

  if (!restaurant) return { title: 'Local no encontrado' }

  const venueConfig = getVenueConfig(restaurant.venue_type)

  return {
    title: `${restaurant.name} - Carta digital`,
    description: restaurant.description || `${venueConfig.publicDescription} ${restaurant.name}.`,
    openGraph: {
      title: `${restaurant.name} - Carta digital`,
      description: restaurant.description || `Carta digital de ${restaurant.name} con asistente IA.`,
      type: 'website',
    },
  }
}

export default async function RestaurantPage({ params }: Props) {
  const { restaurantSlug } = await params
  const result = await getFullMenu(restaurantSlug)
  if (!result) notFound()

  return (
    <MenuView
      restaurant={result.restaurant}
      categories={result.categories}
      tableId={null}
      fontClasses={getRestaurantFontClasses(result.restaurant.font_style)}
    />
  )
}

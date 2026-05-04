import { createServerSupabase } from '@/lib/supabase'
import { getFullMenu } from '@/lib/menu-cache'
import { notFound } from 'next/navigation'
import MenuView from '@/components/cliente/MenuView'
import type { Metadata } from 'next'
import { getVenueConfig } from '@/lib/venue-config'
import { getRestaurantFontClasses } from '@/lib/restaurant-fonts'

interface Props {
  params: Promise<{ restaurantSlug: string; tableId: string }>
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
  }
}

export default async function TablePage({ params }: Props) {
  const { restaurantSlug, tableId } = await params
  const supabase = await createServerSupabase()

  const result = await getFullMenu(restaurantSlug)
  if (!result) notFound()

  const { data: table } = await supabase
    .from('tables')
    .select('*')
    .eq('id', tableId)
    .eq('restaurant_id', result.restaurant.id)
    .single()

  if (!table) notFound()

  return (
    <MenuView
      restaurant={result.restaurant}
      categories={result.categories}
      tableId={tableId}
      tableNumber={table.number}
      fontClasses={getRestaurantFontClasses(result.restaurant.font_style)}
    />
  )
}

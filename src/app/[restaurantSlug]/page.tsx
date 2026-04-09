import { createServerSupabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import MenuView from '@/components/cliente/MenuView'

interface Props {
  params: Promise<{ restaurantSlug: string }>
}

export default async function RestaurantPage({ params }: Props) {
  const { restaurantSlug } = await params
  const supabase = await createServerSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) notFound()

  const { data: categories } = await supabase
    .from('categories')
    .select(`
      *,
      menu_items (
        *,
        ingredients (*),
        menu_item_allergens ( allergen_id, allergens (*) ),
        menu_item_tags ( tag_id, dietary_tags (*) )
      )
    `)
    .eq('restaurant_id', restaurant.id)
    .order('display_order')

  return <MenuView restaurant={restaurant} categories={categories ?? []} tableId={null} />
}

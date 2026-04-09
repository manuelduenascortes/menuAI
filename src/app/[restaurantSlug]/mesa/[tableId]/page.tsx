import { createServerSupabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import MenuView from '@/components/cliente/MenuView'

interface Props {
  params: Promise<{ restaurantSlug: string; tableId: string }>
}

export default async function TablePage({ params }: Props) {
  const { restaurantSlug, tableId } = await params
  const supabase = await createServerSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) notFound()

  const { data: table } = await supabase
    .from('tables')
    .select('*')
    .eq('id', tableId)
    .eq('restaurant_id', restaurant.id)
    .single()

  if (!table) notFound()

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

  return <MenuView restaurant={restaurant} categories={categories ?? []} tableId={tableId} tableNumber={table.number} />
}

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('user_id', user.id)
    .single()

  if (!restaurant) {
    return new Response(JSON.stringify({ error: 'Restaurante no encontrado' }), { status: 404 })
  }

  const admin = createAdminSupabase()
  const { data: categories } = await admin
    .from('categories')
    .select(`
      id, name, emoji, description, display_order,
      menu_items (
        id, name, description, price, image_url, available, display_order,
        ingredients ( name ),
        menu_item_allergens ( allergens ( name, icon ) ),
        menu_item_tags ( dietary_tags ( name, icon ) )
      )
    `)
    .eq('restaurant_id', restaurant.id)
    .order('display_order')
    .order('display_order', { foreignTable: 'menu_items' })

  const payload = {
    restaurant: { name: restaurant.name, slug: restaurant.slug },
    categories: categories ?? [],
    exported_at: new Date().toISOString(),
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="carta-${restaurant.slug}.json"`,
    },
  })
}

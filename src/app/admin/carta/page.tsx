import { redirect } from 'next/navigation'
import Breadcrumbs from '@/components/admin/Breadcrumbs'
import { createServerSupabase } from '@/lib/supabase'
import { getVenueConfig } from '@/lib/venue-config'
import CartaPageClient from './CartaPageClient'

export default async function CartaPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!restaurant) redirect('/admin/dashboard')

  const venueConfig = getVenueConfig(restaurant.venue_type)

  const [categoriesRes, allergenRes, tagsRes] = await Promise.all([
    supabase
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
      .order('display_order'),
    supabase.from('allergens').select('*').order('name'),
    supabase.from('dietary_tags').select('*').order('name'),
  ])

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Carta' },
        ]}
      />

      <div className="mb-8">
        <h1 className="font-serif text-3xl text-foreground">Gestion de carta</h1>
        <p className="mt-1 text-muted-foreground">
          {`Anade y edita categorias, ${venueConfig.itemPlural}, ingredientes, imagenes y alergenos.`}
        </p>
      </div>

      <CartaPageClient
        restaurant={restaurant}
        initialCategories={categoriesRes.data ?? []}
        allergens={allergenRes.data ?? []}
        dietaryTags={tagsRes.data ?? []}
      />
    </div>
  )
}

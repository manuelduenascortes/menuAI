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

  const categoryIds = (await supabase.from('categories').select('id').eq('restaurant_id', restaurant.id)).data?.map(c => c.id) ?? []

  const [categoriesRes, allergenRes, tagsRes, noPhotoRes, noDescRes, noPriceRes] = await Promise.all([
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
      .order('display_order')
      .order('display_order', { foreignTable: 'menu_items' }),
    supabase.from('allergens').select('*').order('name'),
    supabase.from('dietary_tags').select('*').order('name'),
    supabase.from('menu_items').select('id', { count: 'exact' }).in('category_id', categoryIds).is('image_url', null),
    supabase.from('menu_items').select('id', { count: 'exact' }).in('category_id', categoryIds).is('description', null),
    supabase.from('menu_items').select('id', { count: 'exact' }).in('category_id', categoryIds).eq('price', 0),
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
        <h1 className="font-serif text-2xl sm:text-3xl text-foreground">Gestion de carta</h1>
        <p className="mt-1 text-muted-foreground">
          {`Añade y edita categorías, ${venueConfig.itemPlural}, ingredientes, imágenes y alérgenos.`}
        </p>
      </div>

      <CartaPageClient
        restaurant={restaurant}
        initialCategories={categoriesRes.data ?? []}
        allergens={allergenRes.data ?? []}
        dietaryTags={tagsRes.data ?? []}
        validationStats={{
          noPhoto: noPhotoRes.count ?? 0,
          noDescription: noDescRes.count ?? 0,
          noPrice: noPriceRes.count ?? 0,
        }}
      />
    </div>
  )
}

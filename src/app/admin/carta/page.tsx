import { createServerSupabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import CartaManager from '@/components/admin/CartaManager'
import CartaPageClient from './CartaPageClient'

export default async function CartaPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!restaurant) redirect('/admin/dashboard')

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Carta</h1>
        <p className="text-gray-500 mt-1">Añade y edita categorías, platos, ingredientes y alergenos</p>
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

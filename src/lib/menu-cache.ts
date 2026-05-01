import { createAdminSupabase } from '@/lib/supabase'
import type { FullMenu } from '@/lib/types'

const menuCache = new Map<string, { data: FullMenu; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

export function invalidateMenuCache(slug: string) {
  menuCache.delete(slug)
}

export async function getFullMenu(slug: string): Promise<FullMenu | null> {
  const cached = menuCache.get(slug)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  if (menuCache.size > 50) {
    const now = Date.now()
    for (const [key, entry] of menuCache) {
      if (now - entry.ts > CACHE_TTL) menuCache.delete(key)
    }
  }

  const supabase = createAdminSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!restaurant) return null

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedCategories = (categories ?? []).map((category: any) => ({
    ...category,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menu_items: (category.menu_items ?? []).map((item: any) => ({
      ...item,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allergens: (item.menu_item_allergens ?? []).map((entry: any) => entry.allergens).filter(Boolean),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dietary_tags: (item.menu_item_tags ?? []).map((entry: any) => entry.dietary_tags).filter(Boolean),
    })),
  }))

  const menu: FullMenu = { restaurant, categories: normalizedCategories }
  menuCache.set(slug, { data: menu, ts: Date.now() })
  return menu
}

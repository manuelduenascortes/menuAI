import type { SupabaseClient } from '@supabase/supabase-js'
import type { Restaurant } from './types'

/**
 * Shared query: fetch full menu (restaurant + categories + items + relations)
 * Used by public pages, table pages, and chat API.
 */
export async function getFullMenuBySlug(
  supabase: SupabaseClient,
  slug: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ restaurant: Restaurant; categories: any[] } | null> {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!restaurant) return null

  const { data: categories } = await supabase
    .from('categories')
    .select(
      `
      *,
      menu_items (
        *,
        ingredients (*),
        menu_item_allergens ( allergen_id, allergens (*) ),
        menu_item_tags ( tag_id, dietary_tags (*) )
      )
    `
    )
    .eq('restaurant_id', restaurant.id)
    .order('display_order')

  return { restaurant, categories: categories ?? [] }
}

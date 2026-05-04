import type { Allergen, DietaryTag } from '@/lib/types'

export interface CategoryWithItems {
  id: string
  name: string
  emoji?: string
  description?: string
  display_order: number
  menu_items: MenuItemFull[]
}

export interface MenuItemFull {
  id: string
  name: string
  description?: string
  price: number
  available: boolean
  image_url?: string
  ingredients: { id: string; name: string }[]
  menu_item_allergens: { allergen_id: string; allergens: Allergen }[]
  menu_item_tags: { tag_id: string; dietary_tags: DietaryTag }[]
}

export type VenueType = 'restaurant' | 'bar_cafe' | 'cocktail_bar'

export type MenuAccessMode = 'general_qr' | 'table_qr' | 'both'

export type FontStyle = 'clasico' | 'elegante' | 'moderno' | 'casual' | 'minimalista'

export interface Restaurant {
  id: string
  user_id: string
  name: string
  slug: string
  venue_type?: VenueType | null
  menu_access_mode?: MenuAccessMode | null
  description?: string
  logo_url?: string
  primary_color?: string
  font_style?: FontStyle | null
  address?: string
  phone?: string
  trial_ends_at?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_status?: string
  establishment_type?: string
  created_at: string
  updated_at: string
}

export interface Table {
  id: string
  restaurant_id: string
  number: number
  label?: string
  qr_code_url?: string
  created_at: string
}

export interface Category {
  id: string
  restaurant_id: string
  name: string
  description?: string
  emoji?: string
  display_order: number
  created_at: string
  menu_items?: MenuItem[]
}

export interface Allergen {
  id: string
  name: string
  icon?: string
}

export interface DietaryTag {
  id: string
  name: string
  icon?: string
  color?: string
}

export interface Ingredient {
  id: string
  menu_item_id: string
  name: string
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  available: boolean
  display_order: number
  created_at: string
  updated_at: string
  ingredients?: Ingredient[]
  allergens?: Allergen[]
  dietary_tags?: DietaryTag[]
}

export interface FullMenu {
  restaurant: Restaurant
  categories: (Category & {
    menu_items: (MenuItem & {
      ingredients: Ingredient[]
      allergens: Allergen[]
      dietary_tags: DietaryTag[]
    })[]
  })[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

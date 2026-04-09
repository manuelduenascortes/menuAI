'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CartaManager from '@/components/admin/CartaManager'
import MenuImport from '@/components/admin/MenuImport'
import { Button } from '@/components/ui/button'
import type { Restaurant, Allergen, DietaryTag } from '@/lib/types'

interface CategoryWithItems {
  id: string
  name: string
  emoji?: string
  description?: string
  display_order: number
  menu_items: {
    id: string
    name: string
    description?: string
    price: number
    available: boolean
    image_url?: string
    ingredients: { id: string; name: string }[]
    menu_item_allergens: { allergen_id: string; allergens: Allergen }[]
    menu_item_tags: { tag_id: string; dietary_tags: DietaryTag }[]
  }[]
}

export default function CartaPageClient({
  restaurant,
  initialCategories,
  allergens,
  dietaryTags,
}: {
  restaurant: Restaurant
  initialCategories: CategoryWithItems[]
  allergens: Allergen[]
  dietaryTags: DietaryTag[]
}) {
  const router = useRouter()
  const [showImport, setShowImport] = useState(false)

  return (
    <div className="space-y-6">
      {/* Import toggle button */}
      <div className="flex justify-end">
        <Button
          variant={showImport ? 'outline' : 'default'}
          onClick={() => setShowImport(!showImport)}
        >
          {showImport ? '✕ Cerrar importador' : '📸 Importar carta con IA'}
        </Button>
      </div>

      {/* Import panel */}
      {showImport && (
        <MenuImport
          restaurantId={restaurant.id}
          onComplete={() => {
            setShowImport(false)
            router.refresh()
          }}
        />
      )}

      {/* Existing carta manager */}
      <CartaManager
        restaurant={restaurant}
        initialCategories={initialCategories}
        allergens={allergens}
        dietaryTags={dietaryTags}
      />
    </div>
  )
}

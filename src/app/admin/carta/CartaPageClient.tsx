'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CartaManager from '@/components/admin/CartaManager'
import MenuImport from '@/components/admin/MenuImport'
import AIEnrichPanel from '@/components/admin/AIEnrichPanel'
import { Button } from '@/components/ui/button'
import { Sparkles, Wand2, X } from 'lucide-react'
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
  const [showEnrich, setShowEnrich] = useState(false)

  return (
    <div className="space-y-6">
      {/* Mode buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        {showImport ? (
          <Button
            variant="outline"
            onClick={() => setShowImport(false)}
            className="cursor-pointer"
          >
            <X className="mr-1.5 h-4 w-4" />
            Cerrar importador
          </Button>
        ) : !showEnrich ? (
          <>
            <Button
              size="lg"
              onClick={() => setShowImport(true)}
              className="cursor-pointer gap-2 px-8 shadow-md"
            >
              <Sparkles className="h-5 w-5" />
              Importar carta con IA
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowEnrich(true)}
              className="cursor-pointer gap-2 px-8"
            >
              <Wand2 className="h-5 w-5" />
              Enriquecer carta con IA
            </Button>
          </>
        ) : null}
      </div>

      {/* Import panel */}
      {showImport && (
        <MenuImport
          restaurantId={restaurant.id}
          allergens={allergens}
          venueType={restaurant.venue_type}
          onComplete={() => {
            setShowImport(false)
            router.refresh()
          }}
        />
      )}

      {/* AI enrichment panel */}
      {showEnrich && (
        <AIEnrichPanel
          restaurant={restaurant}
          categories={initialCategories}
          allergens={allergens}
          onClose={() => {
            setShowEnrich(false)
            router.refresh()
          }}
        />
      )}

      {/* Carta manager (hidden when enrich panel is active) */}
      {!showEnrich && (
        <CartaManager
          restaurant={restaurant}
          initialCategories={initialCategories}
          allergens={allergens}
          dietaryTags={dietaryTags}
        />
      )}
    </div>
  )
}

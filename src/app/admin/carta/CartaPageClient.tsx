'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CartaManager from '@/components/admin/CartaManager'
import MenuImport from '@/components/admin/MenuImport'
import AIEnrichPanel from '@/components/admin/AIEnrichPanel'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Sparkles, Wand2, X } from 'lucide-react'
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
  validationStats,
}: {
  restaurant: Restaurant
  initialCategories: CategoryWithItems[]
  allergens: Allergen[]
  dietaryTags: DietaryTag[]
  validationStats?: { noPhoto: number; noDescription: number; noPrice: number }
}) {
  const router = useRouter()
  const [showImport, setShowImport] = useState(false)
  const [showEnrich, setShowEnrich] = useState(false)
  const [dismissedBanner, setDismissedBanner] = useState(false)

  const showBanner =
    !dismissedBanner &&
    validationStats &&
    (validationStats.noPhoto > 0 || validationStats.noDescription > 0 || validationStats.noPrice > 0)

  const bannerParts: string[] = []
  if (validationStats?.noPhoto) bannerParts.push(`${validationStats.noPhoto} sin foto`)
  if (validationStats?.noDescription) bannerParts.push(`${validationStats.noDescription} sin descripción`)
  if (validationStats?.noPrice) bannerParts.push(`${validationStats.noPrice} con precio 0`)

  return (
    <div className="space-y-6">
      {showBanner && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">
            <strong>Carta incompleta:</strong> {bannerParts.join(', ')} — completa estos datos antes de compartir el menú.
          </span>
          <button
            onClick={() => setDismissedBanner(true)}
            className="shrink-0 opacity-60 hover:opacity-100"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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

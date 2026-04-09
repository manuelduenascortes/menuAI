'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import ChatInterface from './ChatInterface'
import type { Restaurant } from '@/lib/types'

interface Allergen { id: string; name: string; icon?: string }
interface DietaryTag { id: string; name: string; icon?: string; color?: string }
interface Ingredient { id: string; name: string }
interface MenuItem {
  id: string; name: string; description?: string; price: number; available: boolean; image_url?: string
  ingredients: Ingredient[]
  menu_item_allergens: { allergen_id: string; allergens: Allergen }[]
  menu_item_tags: { tag_id: string; dietary_tags: DietaryTag }[]
}
interface Category {
  id: string; name: string; emoji?: string; description?: string
  menu_items: MenuItem[]
}

interface Props {
  restaurant: Restaurant
  categories: Category[]
  tableId: string | null
  tableNumber?: number
}

const FILTER_TAGS = ['Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 'Halal']

export default function MenuView({ restaurant, categories, tableId, tableNumber }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.id ?? null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [chatOpen, setChatOpen] = useState(false)

  const filteredCategories = categories.map(cat => ({
    ...cat,
    menu_items: cat.menu_items.filter(item => {
      if (!item.available) return false
      if (activeFilters.length === 0) return true
      return activeFilters.every(f =>
        item.menu_item_tags.some(t => t.dietary_tags.name === f)
      )
    }),
  })).filter(cat => cat.menu_items.length > 0)

  function toggleFilter(name: string) {
    setActiveFilters(prev =>
      prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg text-gray-900">{restaurant.name}</h1>
              {tableNumber && (
                <p className="text-xs text-gray-500">Mesa {tableNumber}</p>
              )}
            </div>
            {restaurant.logo_url && (
              <img src={restaurant.logo_url} alt={restaurant.name} className="h-10 w-10 rounded-full object-cover" />
            )}
          </div>

          {/* Filtros rápidos */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
            {FILTER_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleFilter(tag)}
                className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
                  activeFilters.includes(tag)
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Nav categorías */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
            {filteredCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className={`shrink-0 text-sm px-3 py-1 rounded-full transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Carta */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-28 space-y-8">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p>No hay platos con los filtros seleccionados</p>
            <button onClick={() => setActiveFilters([])} className="text-sm text-orange-500 mt-2 underline">
              Quitar filtros
            </button>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <section key={cat.id} id={`cat-${cat.id}`}>
              <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                {cat.emoji && <span>{cat.emoji}</span>}
                {cat.name}
              </h2>
              {cat.description && <p className="text-sm text-gray-500 mb-3">{cat.description}</p>}
              <div className="space-y-3">
                {cat.menu_items.map(item => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Botón flotante chatbot */}
      <div className="fixed bottom-6 right-4 z-40">
        <button
          onClick={() => setChatOpen(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-full shadow-lg transition-all active:scale-95"
        >
          <span className="text-xl">🤖</span>
          <span className="font-medium text-sm">¿Te ayudo a elegir?</span>
        </button>
      </div>

      {/* Chatbot */}
      {chatOpen && (
        <ChatInterface
          restaurantSlug={restaurant.slug}
          restaurantName={restaurant.name}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}

function MenuItemCard({ item }: { item: MenuItem }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex">
        {item.image_url && (
          <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover shrink-0" />
        )}
        <div className="p-3 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 leading-tight">{item.name}</h3>
            <span className="text-orange-600 font-bold shrink-0">{item.price.toFixed(2)}€</span>
          </div>

          {item.description && (
            <p className="text-sm text-gray-500 mt-1 leading-snug line-clamp-2">{item.description}</p>
          )}

          <div className="flex flex-wrap gap-1 mt-2">
            {item.menu_item_tags.map(mt => (
              <span key={mt.tag_id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                {mt.dietary_tags.icon} {mt.dietary_tags.name}
              </span>
            ))}
            {item.menu_item_allergens.slice(0, 3).map(ma => (
              <span key={ma.allergen_id} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                {ma.allergens.icon} {ma.allergens.name}
              </span>
            ))}
            {item.menu_item_allergens.length > 3 && (
              <span className="text-xs text-gray-400">+{item.menu_item_allergens.length - 3} alergenos</span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
          {item.ingredients.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ingredientes</p>
              <p className="text-sm text-gray-700">{item.ingredients.map(i => i.name).join(', ')}</p>
            </div>
          )}
          {item.menu_item_allergens.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">⚠️ Alergenos</p>
              <div className="flex flex-wrap gap-1">
                {item.menu_item_allergens.map(ma => (
                  <Badge key={ma.allergen_id} variant="outline" className="text-xs">
                    {ma.allergens.icon} {ma.allergens.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

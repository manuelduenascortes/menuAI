'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, X, ChevronDown, AlertTriangle, Leaf, Search } from 'lucide-react'
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
    <div className="min-h-screen bg-background">
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-5 pt-4 pb-3">
          {/* Restaurant name + table */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-serif text-xl text-foreground">{restaurant.name}</h1>
              {tableNumber && (
                <p className="text-xs text-muted-foreground mt-0.5">Mesa {tableNumber}</p>
              )}
            </div>
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-10 w-10 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="font-serif text-sm text-primary">
                  {restaurant.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Dietary filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FILTER_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleFilter(tag)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                  activeFilters.includes(tag)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Category navigation */}
          <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {filteredCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id)
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className={`shrink-0 text-sm px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-foreground text-background font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ─── MENU CONTENT ─── */}
      <main className="max-w-2xl mx-auto px-5 py-6 pb-28 space-y-10">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay platos con los filtros seleccionados</p>
            <button
              onClick={() => setActiveFilters([])}
              className="text-sm text-primary mt-3 underline underline-offset-4 cursor-pointer"
            >
              Quitar filtros
            </button>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-36">
              <div className="mb-4">
                <h2 className="font-serif text-2xl text-foreground flex items-center gap-2">
                  {cat.emoji && <span>{cat.emoji}</span>}
                  {cat.name}
                </h2>
                {cat.description && (
                  <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
                )}
              </div>

              <div className="space-y-3">
                {cat.menu_items.map(item => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ─── FAB Chatbot ─── */}
      <div className="fixed bottom-6 right-5 z-40">
        <button
          onClick={() => setChatOpen(true)}
          className="flex items-center gap-2.5 bg-foreground text-background px-5 py-3 rounded-full shadow-lg transition-all active:scale-[0.97] cursor-pointer hover:opacity-90"
          aria-label="Abrir asistente IA"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium text-sm">¿Te ayudo?</span>
        </button>
      </div>

      {/* ─── CHAT OVERLAY ─── */}
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

/* ─── MENU ITEM CARD ─── */
function MenuItemCard({ item }: { item: MenuItem }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer transition-colors hover:border-primary/20 active:scale-[0.995]"
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } }}
    >
      <div className="flex">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-24 h-24 object-cover shrink-0"
          />
        )}
        <div className="p-4 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-foreground leading-snug">{item.name}</h3>
            <span className="text-primary font-semibold shrink-0 tabular-nums">
              {item.price.toFixed(2)}€
            </span>
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Tags row */}
          {(item.menu_item_tags.length > 0 || item.menu_item_allergens.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {item.menu_item_tags.map(mt => (
                <span
                  key={mt.tag_id}
                  className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
                >
                  <Leaf className="w-3 h-3" />
                  {mt.dietary_tags.name}
                </span>
              ))}
              {item.menu_item_allergens.slice(0, 3).map(ma => (
                <span
                  key={ma.allergen_id}
                  className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {ma.allergens.name}
                </span>
              ))}
              {item.menu_item_allergens.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{item.menu_item_allergens.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3 animate-fade-in">
          {item.ingredients.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Ingredientes
              </p>
              <p className="text-sm text-foreground/80">
                {item.ingredients.map(i => i.name).join(', ')}
              </p>
            </div>
          )}
          {item.menu_item_allergens.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Alérgenos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.menu_item_allergens.map(ma => (
                  <Badge
                    key={ma.allergen_id}
                    variant="outline"
                    className="text-xs"
                  >
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

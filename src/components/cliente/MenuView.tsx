'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Leaf, MessageCircle, Search, Sparkles } from 'lucide-react'
import ChatInterface from './ChatInterface'
import type { Restaurant } from '@/lib/types'
import { getChatLauncherCopy, getVenueConfig, normalizeVenueType } from '@/lib/venue-config'

interface Allergen { id: string; name: string; icon?: string }
interface DietaryTag { id: string; name: string; icon?: string; color?: string }
interface Ingredient { id: string; name: string }
interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  available: boolean
  image_url?: string
  ingredients: Ingredient[]
  menu_item_allergens: { allergen_id: string; allergens: Allergen }[]
  menu_item_tags: { tag_id: string; dietary_tags: DietaryTag }[]
}
interface Category {
  id: string
  name: string
  emoji?: string
  description?: string
  menu_items: MenuItem[]
}

interface Props {
  restaurant: Restaurant
  categories: Category[]
  tableId: string | null
  tableNumber?: number
}

const RESTAURANT_FILTER_TAGS = ['Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 'Halal']

export default function MenuView({ restaurant, categories, tableId: _tableId, tableNumber }: Props) {
  void _tableId
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0]?.id ?? null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [chatOpen, setChatOpen] = useState(false)

  const venueType = normalizeVenueType(restaurant.venue_type)
  const venueConfig = getVenueConfig(venueType)
  const chatLauncherCopy = getChatLauncherCopy(venueType)
  const availableFilterTags = useMemo(() => {
    if (venueType !== 'restaurant') return []
    return RESTAURANT_FILTER_TAGS.filter(tag =>
      categories.some(category =>
        category.menu_items.some(item =>
          item.menu_item_tags.some(menuTag => menuTag.dietary_tags.name === tag)
        )
      )
    )
  }, [categories, venueType])

  const filteredCategories = useMemo(() => categories.map(category => ({
    ...category,
    menu_items: category.menu_items.filter(item => {
      if (!item.available) return false
      if (activeFilters.length === 0) return true
      return activeFilters.every(filterName =>
        item.menu_item_tags.some(entry => entry.dietary_tags.name === filterName)
      )
    }),
  })).filter(category => category.menu_items.length > 0), [activeFilters, categories])

  const activeCategory = filteredCategories.some(category => category.id === selectedCategory)
    ? selectedCategory
    : filteredCategories[0]?.id ?? null

  function toggleFilter(name: string) {
    setActiveFilters(prev =>
      prev.includes(name) ? prev.filter(value => value !== name) : [...prev, name]
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-5 pt-4 pb-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="font-serif text-xl text-foreground">{restaurant.name}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">{venueConfig.label}</p>
                {tableNumber && (
                  <p className="text-xs text-muted-foreground">Mesa {tableNumber}</p>
                )}
              </div>
            </div>
            {restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-10 w-10 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <span className="font-serif text-sm text-primary">
                  {restaurant.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <p className="mb-2.5 text-xs leading-relaxed text-muted-foreground">
            {venueConfig.publicHint}
          </p>

          {availableFilterTags.length > 0 && (
            <div role="group" aria-label="Filtros rápidos" className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {availableFilterTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleFilter(tag)}
                  aria-pressed={activeFilters.includes(tag)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                    activeFilters.includes(tag)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          <nav aria-label="Categorías de la carta" className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {filteredCategories.map(category => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id)
                  document.getElementById(`cat-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                aria-current={activeCategory === category.id ? 'true' : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors cursor-pointer ${
                  activeCategory === category.id
                    ? 'bg-foreground font-medium text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {category.emoji && <span className="mr-1">{category.emoji}</span>}
                {category.name}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-2xl space-y-10 px-5 py-6 pb-28">
        {filteredCategories.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Search className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="font-medium">No hay productos con los filtros seleccionados</p>
            <button
              onClick={() => setActiveFilters([])}
              className="mt-3 cursor-pointer text-sm text-primary underline underline-offset-4"
            >
              Quitar filtros
            </button>
          </div>
        ) : (
          filteredCategories.map(category => (
            <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-36">
              <div className="mb-4">
                <h2 className="flex items-center gap-2 font-serif text-2xl text-foreground">
                  {category.emoji && <span>{category.emoji}</span>}
                  {category.name}
                </h2>
                {category.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                )}
              </div>

              <ul role="list" className="space-y-3">
                {category.menu_items.map(item => (
                  <li key={item.id}>
                    <MenuItemCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      <div className="fixed right-5 bottom-6 z-40">
        <button
          onClick={() => setChatOpen(true)}
          className="flex max-w-[19rem] items-center gap-3 rounded-[1.75rem] border border-primary/15 bg-[linear-gradient(135deg,rgba(17,24,39,0.96),rgba(55,65,81,0.92))] px-3.5 py-3 text-left text-background shadow-[0_18px_45px_-24px_rgba(17,24,39,0.9)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-24px_rgba(17,24,39,0.95)] active:scale-[0.98] cursor-pointer"
          aria-label="Abrir asistente IA"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
              <Sparkles className="h-3 w-3" />
              {chatLauncherCopy.badge}
            </span>
            <span className="mt-1 block text-sm font-semibold leading-tight text-white">
              {chatLauncherCopy.title}
            </span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-white/72">
              {chatLauncherCopy.subtitle}
            </span>
          </div>
        </button>
      </div>

      {chatOpen && (
        <ChatInterface
          restaurantSlug={restaurant.slug}
          restaurantName={restaurant.name}
          venueType={restaurant.venue_type}
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
      className="cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/20 active:scale-[0.995]"
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setExpanded(!expanded)
        }
      }}
    >
      <div className="flex items-start">
        {item.image_url && (
          <div className="shrink-0 p-3 pr-0">
            <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-border/50 bg-muted/50 shadow-sm sm:h-28 sm:w-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.name}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="leading-snug font-medium text-foreground">{item.name}</h3>
            <span className="shrink-0 tabular-nums font-semibold text-primary">
              {item.price.toFixed(2)}EUR
            </span>
          </div>

          {item.description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}

          {(item.menu_item_tags.length > 0 || item.menu_item_allergens.length > 0) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {item.menu_item_tags.map(entry => (
                <span
                  key={entry.tag_id}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  <Leaf className="h-3 w-3" />
                  {entry.dietary_tags.name}
                </span>
              ))}
              {item.menu_item_allergens.slice(0, 3).map(entry => (
                <span
                  key={entry.allergen_id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {entry.allergens.name}
                </span>
              ))}
              {item.menu_item_allergens.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{item.menu_item_allergens.length - 3}
                  <span className="sr-only"> alérgenos más</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="animate-fade-in space-y-3 border-t border-border px-4 pt-3 pb-4">
          {item.ingredients.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ingredientes
              </p>
              <p className="text-sm text-foreground/80">
                {item.ingredients.map(entry => entry.name).join(', ')}
              </p>
            </div>
          )}
          {item.menu_item_allergens.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                Alérgenos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.menu_item_allergens.map(entry => (
                  <Badge
                    key={entry.allergen_id}
                    variant="outline"
                    className="text-xs"
                  >
                    {entry.allergens.icon} {entry.allergens.name}
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

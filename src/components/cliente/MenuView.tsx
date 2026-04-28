'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Leaf, Search, ShoppingCart, Sparkles, X } from 'lucide-react'
import ChatInterface, { type ChatMenuItem } from './ChatInterface'
import CartDrawer from './CartDrawer'
import ThemeToggle from '@/components/ThemeToggle'
import type { CartItem, Restaurant } from '@/lib/types'
import type { RestaurantFontClasses } from '@/lib/restaurant-fonts'
import { getRestaurantTheme } from '@/lib/restaurant-theme'
import { getVenueConfig, normalizeVenueType } from '@/lib/venue-config'

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
  fontClasses: RestaurantFontClasses
}

const RESTAURANT_FILTER_TAGS = ['Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 'Halal']

const ASSISTANT_TUTORIAL_COPY = {
  restaurant: {
    title: '¿No sabes qué pedir?',
    body: 'Toca aquí y el asistente te recomienda platos según tus gustos, alergias o si quieres algo ligero.',
  },
  bar_cafe: {
    title: '¿No sabes qué tomar?',
    body: 'Toca aquí y el asistente te recomienda cafés, tapas, desayunos o bebidas según lo que te apetezca.',
  },
  cocktail_bar: {
    title: '¿No sabes qué tomar?',
    body: 'Toca aquí y el asistente te recomienda cócteles, copas o bebidas según sabor, intensidad y si prefieres alcohol o no.',
  },
} satisfies Record<string, { title: string; body: string }>

export default function MenuView({ restaurant, categories, tableId: _tableId, tableNumber, fontClasses }: Props) {
  void _tableId
  const assistantTipStorageKey = `menuai-assistant-tip:${restaurant.slug}`
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0]?.id ?? null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [showAssistantTip, setShowAssistantTip] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  const venueType = normalizeVenueType(restaurant.venue_type)
  const venueConfig = getVenueConfig(venueType)
  const assistantTutorial = ASSISTANT_TUTORIAL_COPY[venueType]
  const theme = getRestaurantTheme(restaurant.primary_color)
  const themeStyle = {
    '--restaurant-primary': theme.primary,
    '--restaurant-primary-light': theme.primaryLight,
    '--restaurant-primary-foreground': theme.primaryForeground,
    '--restaurant-primary-readable-light': theme.primaryReadableOnLight,
    '--restaurant-primary-readable-dark': theme.primaryReadableOnDark,
  } as CSSProperties
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

  const chatMenuItems = useMemo<ChatMenuItem[]>(() =>
    categories
      .flatMap(c => c.menu_items)
      .filter(item => item.available)
      .map(item => ({ id: item.id, name: item.name, image_url: item.image_url, price: item.price })),
    [categories]
  )

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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        setShowAssistantTip(window.localStorage.getItem(assistantTipStorageKey) !== 'seen')
      } catch {
        setShowAssistantTip(true)
      }
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [assistantTipStorageKey])

  function addToCart(item: { id: string; name: string; image_url?: string; price: number }) {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { id: item.id, name: item.name, image_url: item.image_url, price: item.price, quantity: 1 }]
    })
  }

  function handleAddToCart(itemId: string) {
    const source = chatMenuItems.find(i => i.id === itemId)
    if (source) addToCart(source)
  }

  function handleUpdateQuantity(itemId: string, delta: number) {
    setCartItems(prev =>
      prev
        .map(i => i.id === itemId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    )
  }

  function handleClearCart() {
    setCartItems([])
  }

  function toggleFilter(name: string) {
    setActiveFilters(prev =>
      prev.includes(name) ? prev.filter(value => value !== name) : [...prev, name]
    )
  }

  function dismissAssistantTip() {
    setShowAssistantTip(false)
    try {
      window.localStorage.setItem(assistantTipStorageKey, 'seen')
    } catch {}
  }

  function openChat() {
    dismissAssistantTip()
    setChatOpen(true)
  }

  return (
    <div
      className={`min-h-screen bg-background [--restaurant-primary-readable:var(--restaurant-primary-readable-light)] dark:[--restaurant-primary-readable:var(--restaurant-primary-readable-dark)] ${fontClasses.body}`}
      style={themeStyle}
    >
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className={`${fontClasses.heading} text-xl text-foreground`}>{restaurant.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">{venueConfig.label}</p>
                {tableNumber && (
                  <p className="text-xs text-muted-foreground">Mesa {tableNumber}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="ghost" size="icon" />
              {restaurant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="h-10 w-10 rounded-full object-cover border border-border"
                />
              ) : (
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--restaurant-primary-light)' }}
                >
                  <span className={`${fontClasses.heading} text-sm`} style={{ color: 'var(--restaurant-primary-readable)' }}>
                    {restaurant.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">
            {venueConfig.publicHint}
          </p>

          {availableFilterTags.length > 0 && (
            <div role="group" aria-label="Filtros rapidos" className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {availableFilterTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleFilter(tag)}
                  aria-pressed={activeFilters.includes(tag)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                    activeFilters.includes(tag)
                      ? ''
                      : 'bg-card text-muted-foreground border-border'
                  }`}
                  style={activeFilters.includes(tag) ? {
                    backgroundColor: 'var(--restaurant-primary)',
                    borderColor: 'var(--restaurant-primary)',
                    color: 'var(--restaurant-primary-foreground)',
                  } : undefined}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          <nav aria-label="Categorías de la carta" className="flex gap-1.5 mt-2.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {filteredCategories.map(category => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id)
                  document.getElementById(`cat-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                aria-current={activeCategory === category.id ? 'true' : undefined}
                className={`shrink-0 text-sm px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                  activeCategory === category.id
                    ? 'font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={activeCategory === category.id ? {
                  backgroundColor: 'var(--restaurant-primary)',
                  color: 'var(--restaurant-primary-foreground)',
                } : undefined}
              >
                {category.emoji && <span className="mr-1">{category.emoji}</span>}
                {category.name}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main id="main-content" className="max-w-2xl mx-auto px-5 py-6 pb-28 space-y-10">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay productos con los filtros seleccionados</p>
            <button
              onClick={() => setActiveFilters([])}
              className="text-sm mt-3 underline underline-offset-4 cursor-pointer"
              style={{ color: 'var(--restaurant-primary-readable)' }}
            >
              Quitar filtros
            </button>
          </div>
        ) : (
          filteredCategories.map(category => (
            <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-36">
              <div className="mb-4">
                <h2 className={`${fontClasses.heading} text-2xl text-foreground flex items-center gap-2`}>
                  {category.emoji && <span>{category.emoji}</span>}
                  {category.name}
                </h2>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                )}
              </div>

              <ul role="list" className="space-y-3">
                {category.menu_items.map(item => (
                  <li key={item.id}>
                    <MenuItemCard
                      item={item}
                      fontClasses={fontClasses}
                      cartCount={cartItems.find(c => c.id === item.id)?.quantity ?? 0}
                      onAddToCart={() => addToCart(item)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      {cartItems.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 left-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-xl ring-2 ring-white/30 transition-all hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer"
          style={{
            backgroundColor: 'var(--restaurant-primary)',
            color: 'var(--restaurant-primary-foreground)',
          }}
          aria-label={`Ver pedido, ${cartItems.reduce((s, i) => s + i.quantity, 0)} artículos`}
        >
          <ShoppingCart className="h-5 w-5" />
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
            style={{
              backgroundColor: 'var(--restaurant-primary-foreground)',
              color: 'var(--restaurant-primary)',
            }}
          >
            {cartItems.reduce((s, i) => s + i.quantity, 0)}
          </span>
        </button>
      )}

      {showAssistantTip && !chatOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45"
          onClick={dismissAssistantTip}
          aria-label="Cerrar ayuda del asistente"
        />
      )}

      <div className="fixed bottom-6 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-3">
        {showAssistantTip && !chatOpen && (
          <div className="relative w-[min(21rem,calc(100vw-2.5rem))] rounded-2xl border border-white/20 bg-background p-4 shadow-2xl">
            <button
              type="button"
              onClick={dismissAssistantTip}
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cerrar ayuda del asistente"
            >
              <X className="h-4 w-4" />
            </button>
            <p className={`pr-8 text-lg leading-tight text-foreground ${fontClasses.heading}`}>
              {assistantTutorial.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {assistantTutorial.body}
            </p>
            <div
              className="absolute -bottom-2 right-16 h-4 w-4 rotate-45 border-b border-r border-white/20 bg-background"
              aria-hidden="true"
            />
          </div>
        )}

        <button
          onClick={openChat}
          className="flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold shadow-xl ring-2 ring-white/30 transition-all hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer"
          style={{
            backgroundColor: 'var(--restaurant-primary)',
            color: 'var(--restaurant-primary-foreground)',
          }}
          aria-label="Abrir asistente IA"
        >
          <Sparkles className="h-5 w-5" />
          <span>Elegir con IA</span>
        </button>
      </div>

      {chatOpen && (
        <ChatInterface
          restaurantSlug={restaurant.slug}
          restaurantName={restaurant.name}
          venueType={restaurant.venue_type}
          onClose={() => setChatOpen(false)}
          menuItems={chatMenuItems}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
          onOpenCart={() => setCartOpen(true)}
        />
      )}

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onClear={handleClearCart}
        themeVars={themeStyle}
      />
    </div>
  )
}

function MenuItemCard({ item, fontClasses, cartCount = 0, onAddToCart }: {
  item: MenuItem
  fontClasses: RestaurantFontClasses
  cartCount?: number
  onAddToCart?: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer transition-colors active:scale-[0.995]"
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
          <div className="p-3 pr-0 shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 relative rounded-lg overflow-hidden border border-border/50 bg-muted/50 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          </div>
        )}
        <div className="p-4 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className={`font-medium text-foreground leading-snug ${fontClasses.body}`}>{item.name}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold tabular-nums" style={{ color: 'var(--restaurant-primary-readable)' }}>
                {item.price.toFixed(2)}EUR
              </span>
              <button
                onClick={e => { e.stopPropagation(); onAddToCart?.() }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold leading-none cursor-pointer transition-all active:scale-90"
                style={cartCount > 0 ? {
                  backgroundColor: 'var(--restaurant-primary)',
                  color: 'var(--restaurant-primary-foreground)',
                } : {
                  backgroundColor: 'var(--restaurant-primary-light)',
                  color: 'var(--restaurant-primary-readable)',
                }}
                aria-label={cartCount > 0 ? `${cartCount} en carrito, añadir otro ${item.name}` : `Añadir ${item.name} al carrito`}
              >
                {cartCount > 0 ? cartCount : '+'}
              </button>
            </div>
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
              {item.description}
            </p>
          )}

          {(item.menu_item_tags.length > 0 || item.menu_item_allergens.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {item.menu_item_tags.map(entry => (
                <span
                  key={entry.tag_id}
                  className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
                >
                  <Leaf className="w-3 h-3" />
                  {entry.dietary_tags.name}
                </span>
              ))}
              {item.menu_item_allergens.slice(0, 3).map(entry => (
                <span
                  key={entry.allergen_id}
                  className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                >
                  <AlertTriangle className="w-3 h-3" />
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
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3 animate-fade-in">
          {item.ingredients.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Ingredientes
              </p>
              <p className="text-sm text-foreground/80">
                {item.ingredients.map(entry => entry.name).join(', ')}
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

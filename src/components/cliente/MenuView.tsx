'use client'

import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Leaf, Search, ShoppingCart, Sparkles, X } from 'lucide-react'
import ChatInterface, { type ChatMenuItem } from './ChatInterface'
import CartDrawer from './CartDrawer'
import ThemeToggle from '@/components/ThemeToggle'
import type { CartItem, Restaurant } from '@/lib/types'
import type { RestaurantFontClasses } from '@/lib/restaurant-fonts'
import { getRestaurantTheme } from '@/lib/restaurant-theme'
import { getVenueConfig, normalizeVenueType } from '@/lib/venue-config'
import { motion } from 'framer-motion'
import CartAnimationProvider from './CartAnimationProvider'
import { useCartAnimation } from '@/hooks/useCartAnimation'
import { parseOpeningHours, type DayHours } from '@/components/admin/OpeningHoursTable'

function formatHoursForDisplay(raw: string): string {
  const days = parseOpeningHours(raw)
  if (!days) return raw
  const open = days.filter((d: DayHours) => d.open && d.from && d.to)
  if (open.length === 0) return ''

  const groups: { label: string; hours: string }[] = []
  let i = 0
  while (i < open.length) {
    const start = open[i]
    let end = start
    let j = i + 1
    while (j < open.length && open[j].from === start.from && open[j].to === start.to) {
      end = open[j]
      j++
    }
    const label = start.day === end.day ? start.day : `${start.day}–${end.day}`
    groups.push({ label, hours: `${start.from}–${start.to}` })
    i = j
  }
  return groups.map(g => `${g.label}: ${g.hours}`).join(' · ')
}

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

function MenuViewInner({ restaurant, categories, tableId, tableNumber, fontClasses }: Props) {
  const assistantTipStorageKey = `menuai-assistant-tip:${restaurant.slug}`
  const cartStorageKey = `menuai-cart:${restaurant.slug}:${tableId ?? 'general'}`
  const CART_TTL_MS = 4 * 60 * 60 * 1000
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0]?.id ?? null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [showAssistantTip, setShowAssistantTip] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartHydrated, setCartHydrated] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cartStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { items: CartItem[]; savedAt: number }
        if (parsed && Array.isArray(parsed.items) && Date.now() - parsed.savedAt < CART_TTL_MS) {
          setCartItems(parsed.items)
        } else {
          window.localStorage.removeItem(cartStorageKey)
        }
      }
    } catch {}
    setCartHydrated(true)
  }, [cartStorageKey, CART_TTL_MS])

  useEffect(() => {
    if (!cartHydrated) return
    try {
      if (cartItems.length === 0) {
        window.localStorage.removeItem(cartStorageKey)
      } else {
        window.localStorage.setItem(
          cartStorageKey,
          JSON.stringify({ items: cartItems, savedAt: Date.now() }),
        )
      }
    } catch {}
  }, [cartItems, cartHydrated, cartStorageKey])

  const { cartButtonRef, cartBumpControls, badgePulseControls, flyToCart } = useCartAnimation()

  const venueType = normalizeVenueType(restaurant.venue_type)
  const venueConfig = getVenueConfig(venueType)
  const assistantTutorial = ASSISTANT_TUTORIAL_COPY[venueType]
  const theme = useMemo(() => getRestaurantTheme(restaurant.primary_color), [restaurant.primary_color])
  const themeStyle = useMemo(() => ({
    '--restaurant-primary': theme.primary,
    '--restaurant-primary-light': theme.primaryLight,
    '--restaurant-primary-foreground': theme.primaryForeground,
    '--restaurant-primary-readable-light': theme.primaryReadableOnLight,
    '--restaurant-primary-readable-dark': theme.primaryReadableOnDark,
  } as CSSProperties), [theme])

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
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (activeFilters.length === 0) return true
      return activeFilters.every(filterName =>
        item.menu_item_tags.some(entry => entry.dietary_tags.name === filterName)
      )
    }),
  })).filter(category => category.menu_items.length > 0), [activeFilters, categories, searchQuery])

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

  const addToCart = useCallback((item: { id: string; name: string; image_url?: string; price: number }) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { id: item.id, name: item.name, image_url: item.image_url, price: item.price, quantity: 1 }]
    })
  }, [])

  const handleAddToCart = useCallback((itemId: string) => {
    const source = chatMenuItems.find(i => i.id === itemId)
    if (source) addToCart(source)
  }, [chatMenuItems, addToCart])

  const handleUpdateQuantity = useCallback((itemId: string, delta: number) => {
    setCartItems(prev =>
      prev
        .map(i => i.id === itemId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    )
  }, [])

  const handleClearCart = useCallback(() => {
    setCartItems([])
  }, [])

  const toggleFilter = useCallback((name: string) => {
    setActiveFilters(prev =>
      prev.includes(name) ? prev.filter(value => value !== name) : [...prev, name]
    )
  }, [])

  const dismissAssistantTip = useCallback(() => {
    setShowAssistantTip(false)
    try {
      window.localStorage.setItem(assistantTipStorageKey, 'seen')
    } catch {}
  }, [assistantTipStorageKey])

  const openChat = useCallback(() => {
    dismissAssistantTip()
    setChatOpen(true)
  }, [dismissAssistantTip])

  const cartItemsMap = useMemo(
    () => new Map(cartItems.map(i => [i.id, i.quantity])),
    [cartItems]
  )

  const handleCartAddFromCard = useCallback((item: MenuItem, originEl: HTMLElement) => {
    flyToCart(originEl)
    addToCart(item)
  }, [flyToCart, addToCart])

  return (
    <div
      className={`min-h-screen bg-background [--restaurant-primary-readable:var(--restaurant-primary-readable-light)] dark:[--restaurant-primary-readable:var(--restaurant-primary-readable-dark)] ${fontClasses.body}`}
      style={themeStyle}
    >
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-5 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <h1 className={`${fontClasses.heading} text-xl text-foreground truncate`}>{restaurant.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">{venueConfig.label}</p>
                {tableNumber && (
                  <p className="text-xs text-muted-foreground">Mesa {tableNumber}</p>
                )}
              </div>
              {restaurant.opening_hours && (() => {
                const formatted = formatHoursForDisplay(restaurant.opening_hours)
                return formatted ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatted}
                  </p>
                ) : null
              })()}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle variant="ghost" size="icon" />
              {restaurant.logo_url ? (
                <div className="relative h-10 w-10 rounded-full overflow-hidden border border-border">
                  <Image
                    src={restaurant.logo_url}
                    alt={restaurant.name}
                    fill
                    sizes="40px"
                    priority
                    className="object-cover"
                  />
                </div>
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

          <p className="hidden sm:block text-xs text-muted-foreground leading-relaxed mb-2.5">
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

          <div className="relative mt-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar en la carta..."
              className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-9 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--restaurant-primary)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

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

      <main
        id="main-content"
        className="max-w-2xl mx-auto px-5 py-6 space-y-10"
        style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
      >
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {searchQuery ? 'No se encontraron platos para tu búsqueda' : 'No hay productos con los filtros seleccionados'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setActiveFilters([])}
                className="text-sm mt-3 underline underline-offset-4 cursor-pointer"
                style={{ color: 'var(--restaurant-primary-readable)' }}
              >
                Quitar filtros
              </button>
            )}
          </div>
        ) : (
          filteredCategories.map(category => (
            <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-52">
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
                  <li
                    key={item.id}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '0 140px' }}
                  >
                    <MenuItemCard
                      item={item}
                      fontClasses={fontClasses}
                      cartCount={cartItemsMap.get(item.id) ?? 0}
                      onAddToCart={handleCartAddFromCard}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      {cartItems.length > 0 && (() => {
        const totalCartCount = cartItems.reduce((s, i) => s + i.quantity, 0)
        return (
          <motion.button
            ref={cartButtonRef}
            animate={cartBumpControls}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCartOpen(true)}
            className="fixed left-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-xl ring-2 ring-white/30 cursor-pointer"
            style={{
              bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
              backgroundColor: 'var(--restaurant-primary)',
              color: 'var(--restaurant-primary-foreground)',
            }}
            aria-label={`Ver pedido, ${totalCartCount} artículos`}
          >
            <ShoppingCart className="h-5 w-5" />
            <motion.span
              animate={badgePulseControls}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
              style={{
                backgroundColor: 'var(--restaurant-primary-foreground)',
                color: 'var(--restaurant-primary)',
              }}
            >
              {totalCartCount}
            </motion.span>
          </motion.button>
        )
      })()}

      {showAssistantTip && !chatOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45"
          onClick={dismissAssistantTip}
          aria-label="Cerrar ayuda del asistente"
        />
      )}

      <div
        className="fixed right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-3"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
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
          <span className="hidden sm:inline">Elegir con IA</span>
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

export default function MenuView(props: Props) {
  return (
    <CartAnimationProvider>
      <MenuViewInner {...props} />
    </CartAnimationProvider>
  )
}

const MenuItemCard = memo(function MenuItemCard({ item, fontClasses, cartCount = 0, onAddToCart }: {
  item: MenuItem
  fontClasses: RestaurantFontClasses
  cartCount?: number
  onAddToCart?: (item: MenuItem, originEl: HTMLElement) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const detailId = `item-detail-${item.id}`

  return (
    <article className="relative bg-card rounded-xl border border-border overflow-hidden transition-colors">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={detailId}
        className="absolute inset-0 z-0 cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-muted/30"
      >
        <span className="sr-only">
          {expanded ? 'Ocultar' : 'Mostrar'} detalles de {item.name}
        </span>
      </button>

      <div className="relative z-[1] flex items-start pointer-events-none">
        {item.image_url && (
          <div className="p-3 pr-0 shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 relative rounded-lg overflow-hidden border border-border/50 bg-muted/50 shadow-sm">
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                loading="lazy"
                sizes="(min-width: 640px) 112px, 96px"
                className="object-cover [@media(hover:hover)]:transition-transform [@media(hover:hover)]:duration-500 [@media(hover:hover)]:hover:scale-105"
              />
            </div>
          </div>
        )}
        <div className="p-4 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className={`min-w-0 font-medium text-foreground leading-snug ${fontClasses.body}`}>{item.name}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-semibold tabular-nums" style={{ color: 'var(--restaurant-primary-readable)' }}>
                {item.price.toFixed(2)} €
              </span>
              <button
                onClick={e => { e.stopPropagation(); onAddToCart?.(item, e.currentTarget) }}
                className="pointer-events-auto relative z-[2] min-w-11 min-h-11 w-11 h-11 rounded-full flex items-center justify-center text-base font-bold leading-none cursor-pointer transition-transform active:scale-90"
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
        <div id={detailId} className="relative z-[1] px-4 pb-4 border-t border-border pt-3 space-y-3 animate-fade-in pointer-events-none">
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
    </article>
  )
})

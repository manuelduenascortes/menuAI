import { createAdminSupabase } from '@/lib/supabase'
import type { FullMenu } from '@/lib/types'
import type { Redis as UpstashRedis } from '@upstash/redis'

const CACHE_TTL_SECONDS = 5 * 60
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000

// ---------- Upstash Redis (multi-instance safe) ----------
let redisClient: UpstashRedis | null = null
let redisInitTried = false

async function getRedis(): Promise<UpstashRedis | null> {
  if (redisInitTried) return redisClient
  redisInitTried = true

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    const { Redis } = await import('@upstash/redis')
    redisClient = new Redis({ url, token })
    return redisClient
  } catch (err) {
    console.error('menu-cache: failed to init Upstash Redis', err)
    return null
  }
}

const redisKey = (slug: string) => `menuai:menu:${slug}`

// ---------- Fallback in-memory (dev / when Upstash is not configured) ----------
const memoryCache = new Map<string, { data: FullMenu; ts: number }>()

function readMemory(slug: string): FullMenu | null {
  const entry = memoryCache.get(slug)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    memoryCache.delete(slug)
    return null
  }
  return entry.data
}

function writeMemory(slug: string, data: FullMenu) {
  if (memoryCache.size > 50) {
    const now = Date.now()
    for (const [key, entry] of memoryCache) {
      if (now - entry.ts > CACHE_TTL_MS) memoryCache.delete(key)
    }
  }
  memoryCache.set(slug, { data, ts: Date.now() })
}

// ---------- Public API ----------
export async function invalidateMenuCache(slug: string): Promise<void> {
  memoryCache.delete(slug)
  const redis = await getRedis()
  if (redis) {
    try {
      await redis.del(redisKey(slug))
    } catch (err) {
      console.error('menu-cache: redis del failed', err)
    }
  }
}

export async function getFullMenu(slug: string): Promise<FullMenu | null> {
  // 1) Memory cache (process-local, sub-ms)
  const fromMemory = readMemory(slug)
  if (fromMemory) return fromMemory

  // 2) Redis cache (cross-instance)
  const redis = await getRedis()
  if (redis) {
    try {
      const cached = await redis.get(redisKey(slug))
      if (cached) {
        // Upstash REST returns parsed JSON when stored via `set` with object,
        // and string when stored as plain string. Handle both.
        const parsed: FullMenu = typeof cached === 'string' ? JSON.parse(cached) : (cached as FullMenu)
        writeMemory(slug, parsed)
        return parsed
      }
    } catch (err) {
      console.error('menu-cache: redis get failed', err)
    }
  }

  // 3) DB fetch
  const supabase = createAdminSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!restaurant) return null

  const { data: categories } = await supabase
    .from('categories')
    .select(`
      *,
      menu_items (
        *,
        ingredients (*),
        menu_item_allergens ( allergen_id, allergens (*) ),
        menu_item_tags ( tag_id, dietary_tags (*) )
      )
    `)
    .eq('restaurant_id', restaurant.id)
    .order('display_order')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedCategories = (categories ?? []).map((category: any) => ({
    ...category,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menu_items: (category.menu_items ?? []).map((item: any) => ({
      ...item,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allergens: (item.menu_item_allergens ?? []).map((entry: any) => entry.allergens).filter(Boolean),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dietary_tags: (item.menu_item_tags ?? []).map((entry: any) => entry.dietary_tags).filter(Boolean),
    })),
  }))

  const menu: FullMenu = { restaurant, categories: normalizedCategories }

  writeMemory(slug, menu)

  if (redis) {
    try {
      await redis.set(redisKey(slug), JSON.stringify(menu), { ex: CACHE_TTL_SECONDS })
    } catch (err) {
      console.error('menu-cache: redis set failed', err)
    }
  }

  return menu
}

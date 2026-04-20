import { NextRequest } from 'next/server'
import { groq, GROQ_MODEL } from '@/lib/groq'
import { createAdminSupabase } from '@/lib/supabase'
import { buildMenuSystemPromptV2 } from '@/lib/menu-context'
import { checkRateLimit } from '@/lib/redis'
import { getChatUsage, getChatLimit, incrementChatUsage } from '@/lib/usage'
import type { FullMenu } from '@/lib/types'
import { z } from 'zod'

const ChatReq = z.object({
  restaurantSlug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(1200),
  })).min(1).max(10),
})

// Cache simple en memoria (se resetea con cada deploy/cold start)
const menuCache = new Map<string, { data: FullMenu; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

async function getFullMenu(slug: string): Promise<FullMenu | null> {
  const cached = menuCache.get(slug)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  // Prune stale entries
  if (menuCache.size > 50) {
    const now = Date.now()
    for (const [key, entry] of menuCache) {
      if (now - entry.ts > CACHE_TTL) menuCache.delete(key)
    }
  }

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
  const normalizedCategories = (categories ?? []).map((c: any) => ({
    ...c,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menu_items: (c.menu_items ?? []).map((i: any) => ({
      ...i,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allergens: (i.menu_item_allergens ?? []).map((x: any) => x.allergens).filter(Boolean),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dietary_tags: (i.menu_item_tags ?? []).map((x: any) => x.dietary_tags).filter(Boolean),
    })),
  }))

  const menu: FullMenu = { restaurant, categories: normalizedCategories }
  menuCache.set(slug, { data: menu, ts: Date.now() })
  return menu
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  let restaurantSlugForLogs = 'unknown'
  let charsIn = 0
  let charsOut = 0

  try {
    const rawBody = await req.json()
    const parsed = ChatReq.safeParse(rawBody)

    if (!parsed.success) {
      return new Response('Bad request', { status: 400 })
    }

    const { messages, restaurantSlug } = parsed.data
    restaurantSlugForLogs = restaurantSlug

    charsIn = messages.reduce((acc, msg) => acc + msg.content.length, 0)

    // Rate Limit (Upstash Redis if configured, in-memory fallback)
    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown-ip').split(',')[0].trim()
    if (!(await checkRateLimit(ip, restaurantSlug))) {
      console.warn(JSON.stringify({
        event: 'chat_rate_limit',
        slug: restaurantSlug,
        ip,
        timestamp: new Date().toISOString()
      }))
      return new Response('Too Many Requests', { status: 429 })
    }

    const menu = await getFullMenu(restaurantSlug)
    if (!menu) {
      console.warn(JSON.stringify({
        event: 'chat_error',
        slug: restaurantSlug,
        error: 'Restaurant not found',
        latency_ms: Date.now() - startTime
      }))
      return new Response('Restaurant not found', { status: 404 })
    }

    // Chat usage limit per restaurant/month
    const restaurantId = menu.restaurant.id
    const subscriptionStatus = menu.restaurant.subscription_status ?? null
    const limit = getChatLimit(subscriptionStatus)
    const currentUsage = await getChatUsage(restaurantId)

    if (currentUsage >= limit) {
      console.warn(JSON.stringify({
        event: 'chat_usage_limit',
        slug: restaurantSlug,
        usage: currentUsage,
        limit,
        timestamp: new Date().toISOString()
      }))
      return new Response(
        'Nuestro asistente ha alcanzado el límite de consultas de este mes. Puedes seguir consultando la carta directamente.',
        { status: 429 }
      )
    }

    const systemPrompt = buildMenuSystemPromptV2(menu)

    const abortController = new AbortController()
    req.signal.addEventListener('abort', () => abortController.abort())

    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 512,
      temperature: 0.1,
    }, { signal: abortController.signal })

    // Increment usage after successful Groq call start
    await incrementChatUsage(restaurantId).catch(() => {})

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (req.signal.aborted) break
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              charsOut += text.length
              controller.enqueue(encoder.encode(text))
            }
          }
        } catch (streamError: unknown) {
          if (streamError instanceof Error && streamError.name !== 'AbortError') {
            console.error(JSON.stringify({
              event: 'chat_stream_error',
              slug: restaurantSlugForLogs,
              error: String(streamError),
              latency_ms: Date.now() - startTime
            }))
          }
        } finally {
          controller.close()

          const event = req.signal.aborted ? 'chat_aborted' : 'chat_success'
          console.log(JSON.stringify({
            event,
            slug: restaurantSlugForLogs,
            latency_ms: Date.now() - startTime,
            chars_in: charsIn,
            chars_out: charsOut,
            approx_tokens: Math.round((charsIn + charsOut) / 4)
          }))
        }
      },
      cancel() {
        abortController.abort()
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response('Aborted', { status: 499 })
    }

    console.error(JSON.stringify({
      event: 'chat_error',
      slug: restaurantSlugForLogs,
      error: error instanceof Error ? error.message : String(error),
      latency_ms: Date.now() - startTime
    }))
    return new Response('Error interno', { status: 500 })
  }
}

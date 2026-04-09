import { NextRequest } from 'next/server'
import { groq, GROQ_MODEL } from '@/lib/groq'
import { createAdminSupabase } from '@/lib/supabase'
import { buildMenuSystemPrompt } from '@/lib/menu-context'
import type { FullMenu } from '@/lib/types'

// Cache simple en memoria (se resetea con cada deploy)
const menuCache = new Map<string, { data: FullMenu; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

async function getFullMenu(slug: string): Promise<FullMenu | null> {
  const cached = menuCache.get(slug)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

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

  const menu: FullMenu = { restaurant, categories: categories ?? [] }
  menuCache.set(slug, { data: menu, ts: Date.now() })
  return menu
}

export async function POST(req: NextRequest) {
  try {
    const { messages, restaurantSlug } = await req.json()

    if (!restaurantSlug || !messages?.length) {
      return new Response('Missing params', { status: 400 })
    }

    const menu = await getFullMenu(restaurantSlug)
    if (!menu) return new Response('Restaurant not found', { status: 404 })

    const systemPrompt = buildMenuSystemPrompt(menu)

    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            controller.enqueue(encoder.encode(text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Chat error:', error)
    return new Response('Error interno', { status: 500 })
  }
}

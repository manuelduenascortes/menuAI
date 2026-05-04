import { NextRequest } from 'next/server'
import { createOpenRouterChatStream, OR_MODEL } from '@/lib/openrouter'
import { buildMenuSystemPromptV2 } from '@/lib/menu-context'
import { checkRateLimit } from '@/lib/redis'
import { getChatUsage, getChatLimit, incrementChatUsage } from '@/lib/usage'
import { getFullMenu } from '@/lib/menu-cache'
import { z } from 'zod'

const ChatReq = z.object({
  restaurantSlug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(1200),
  })).min(1).max(100),
})

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

    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown-ip').split(',')[0].trim()
    if (!(await checkRateLimit(ip, restaurantSlug))) {
      console.warn(JSON.stringify({
        event: 'chat_rate_limit',
        slug: restaurantSlug,
        ip,
        timestamp: new Date().toISOString(),
      }))
      return new Response('Too Many Requests', { status: 429 })
    }

    const menu = await getFullMenu(restaurantSlug)
    if (!menu) {
      console.warn(JSON.stringify({
        event: 'chat_error',
        slug: restaurantSlug,
        error: 'Restaurant not found',
        latency_ms: Date.now() - startTime,
      }))
      return new Response('Local no encontrado', { status: 404 })
    }

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
        timestamp: new Date().toISOString(),
      }))
      return new Response(
        'Nuestro asistente ha alcanzado el limite de consultas de este mes. Puedes seguir consultando la carta directamente.',
        { status: 429 }
      )
    }

    const systemPrompt = buildMenuSystemPromptV2(menu)
    const abortController = new AbortController()
    req.signal.addEventListener('abort', () => abortController.abort())

    const stream = await createOpenRouterChatStream({
      model: OR_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(messages as any[]),
      ],
      max_tokens: 512,
      temperature: 0.1,
    }, abortController.signal)

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let streamSucceeded = false
        try {
          for await (const chunk of stream) {
            if (req.signal.aborted) break
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              charsOut += text.length
              controller.enqueue(encoder.encode(text))
            }
          }
          streamSucceeded = !req.signal.aborted
        } catch (streamError: unknown) {
          if (streamError instanceof Error && streamError.name !== 'AbortError') {
            console.error(JSON.stringify({
              event: 'chat_stream_error',
              slug: restaurantSlugForLogs,
              error: String(streamError),
              latency_ms: Date.now() - startTime,
            }))
          }
        } finally {
          controller.close()

          // Solo contamos uso si el stream produjo contenido o terminó OK
          if (streamSucceeded || charsOut > 0) {
            await incrementChatUsage(restaurantId).catch(() => {})
          }

          const event = req.signal.aborted ? 'chat_aborted' : 'chat_success'
          console.log(JSON.stringify({
            event,
            slug: restaurantSlugForLogs,
            latency_ms: Date.now() - startTime,
            chars_in: charsIn,
            chars_out: charsOut,
            approx_tokens: Math.round((charsIn + charsOut) / 4),
          }))
        }
      },
      cancel() {
        abortController.abort()
      },
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
      latency_ms: Date.now() - startTime,
    }))
    return new Response('Error interno', { status: 500 })
  }
}

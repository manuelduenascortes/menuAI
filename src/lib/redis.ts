import 'server-only'

// Upstash Redis rate limiter — only active when env vars are set.
// Falls back to in-memory Map when not configured (dev / early stage).

let ratelimit: { limit: (key: string) => Promise<{ success: boolean }> } | null = null

async function getUpstashRatelimit() {
  if (ratelimit) return ratelimit

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')

    ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'menuai:rl',
    })
    return ratelimit
  }

  return null
}

// In-memory fallback for dev / when Upstash is not configured
const memoryMap = new Map<string, { count: number; ts: number }>()
const WINDOW_MS = 60_000
const MAX_REQ = 5

function memoryRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = memoryMap.get(key)

  // Prune periodically
  if (memoryMap.size > 200) {
    for (const [k, v] of memoryMap) {
      if (now - v.ts > WINDOW_MS) memoryMap.delete(k)
    }
  }

  if (!entry || now - entry.ts > WINDOW_MS) {
    memoryMap.set(key, { count: 1, ts: now })
    return true
  }
  if (entry.count >= MAX_REQ) return false
  entry.count++
  return true
}

export async function checkRateLimit(ip: string, slug: string): Promise<boolean> {
  const key = `${slug}:${ip}`

  const rl = await getUpstashRatelimit()
  if (rl) {
    const { success } = await rl.limit(key)
    return success
  }

  return memoryRateLimit(key)
}

import 'server-only'
import { createAdminSupabase } from './supabase'

const CHAT_LIMITS: Record<string, number> = {
  trial: 200,
  trialing: 200,
  active_monthly: 1500,
  active_semestral: 2500,
  active_annual: 4000,
  active: 1500, // fallback for active without plan info
}

function getMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getChatLimit(subscriptionStatus: string | null): number {
  if (!subscriptionStatus) return CHAT_LIMITS.trial
  return CHAT_LIMITS[subscriptionStatus] ?? CHAT_LIMITS.trial
}

export async function getChatUsage(restaurantId: string): Promise<number> {
  const supabase = createAdminSupabase()
  const monthKey = getMonthKey()

  const { data } = await supabase
    .from('chat_usage')
    .select('count')
    .eq('restaurant_id', restaurantId)
    .eq('month_key', monthKey)
    .single()

  return data?.count ?? 0
}

export async function incrementChatUsage(restaurantId: string): Promise<number> {
  const supabase = createAdminSupabase()
  const monthKey = getMonthKey()

  // Upsert: insert or increment
  const { data } = await supabase.rpc('increment_chat_usage', {
    p_restaurant_id: restaurantId,
    p_month_key: monthKey,
  })

  return data ?? 0
}

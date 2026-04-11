import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!restaurant?.stripe_customer_id) {
    return NextResponse.json({ error: 'No hay suscripción' }, { status: 404 })
  }

  const origin = request.headers.get('origin') || ''

  const session = await getStripe().billingPortal.sessions.create({
    customer: restaurant.stripe_customer_id,
    return_url: `${origin}/admin/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}

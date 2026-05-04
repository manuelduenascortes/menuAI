import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { priceId } = await request.json()
  if (!priceId) {
    return NextResponse.json({ error: 'priceId requerido' }, { status: 400 })
  }

  // Allowlist: solo aceptar los 3 priceIds oficiales definidos en env
  const allowedPriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_SEMESTRAL,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL,
  ].filter((id): id is string => typeof id === 'string' && id.length > 0)

  if (!allowedPriceIds.includes(priceId)) {
    return NextResponse.json({ error: 'Plan no válido' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const { data: restaurant } = await admin
    .from('restaurants')
    .select('id, stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })
  }

  // Get or create Stripe customer
  let customerId = restaurant.stripe_customer_id
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { restaurant_id: restaurant.id, supabase_user_id: user.id },
    })
    customerId = customer.id
    await admin
      .from('restaurants')
      .update({ stripe_customer_id: customerId })
      .eq('id', restaurant.id)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/admin/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/trial-expired`,
    subscription_data: {
      metadata: { restaurant_id: restaurant.id },
    },
  })

  return NextResponse.json({ url: session.url })
}

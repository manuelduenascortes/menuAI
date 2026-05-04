import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminSupabase } from '@/lib/supabase'
import Stripe from 'stripe'

function derivePlanStatus(subscription: Stripe.Subscription): string {
  const item = subscription.items.data[0]
  const interval = item?.price.recurring?.interval
  const count = item?.price.recurring?.interval_count ?? 1
  if (interval === 'year') return 'active_annual'
  if (count >= 6) return 'active_semestral'
  return 'active_monthly'
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminSupabase()

  // Idempotencia: si ya procesamos este event.id, salimos.
  // Si la tabla stripe_events no existe aún, ignoramos el error y seguimos
  // (el SQL de migración está en supabase/schema.sql).
  const insertedEvent = await admin
    .from('stripe_events')
    .insert({ id: event.id, type: event.type })
    .select('id')
    .maybeSingle()

  if (insertedEvent.error) {
    const code = insertedEvent.error.code
    // 23505 = unique_violation (ya procesado) — evitamos reprocesarlo
    if (code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    // 42P01 = undefined_table (migración pendiente) — degradamos sin idempotencia
    if (code !== '42P01') {
      console.error('stripe_events insert error:', insertedEvent.error.message)
    }
  }

  // Helper: confirma que restaurantId pertenece al customerId antes de mutar
  async function isCustomerOwner(restaurantId: string, customerId: string): Promise<boolean> {
    const { data } = await admin
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    return Boolean(data)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const subscriptionId = session.subscription as string
      const customerId = session.customer as string

      const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
      const restaurantId = subscription.metadata.restaurant_id

      if (restaurantId) {
        await admin
          .from('restaurants')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: derivePlanStatus(subscription),
          })
          .eq('id', restaurantId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const restaurantId = subscription.metadata.restaurant_id
      const customerId = subscription.customer as string

      if (restaurantId && (await isCustomerOwner(restaurantId, customerId))) {
        await admin
          .from('restaurants')
          .update({ subscription_status: derivePlanStatus(subscription) })
          .eq('id', restaurantId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const restaurantId = subscription.metadata.restaurant_id
      const customerId = subscription.customer as string

      if (restaurantId && (await isCustomerOwner(restaurantId, customerId))) {
        await admin
          .from('restaurants')
          .update({
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('id', restaurantId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

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

      if (restaurantId) {
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

      if (restaurantId) {
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

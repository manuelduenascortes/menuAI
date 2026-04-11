import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminSupabase } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

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

      // Get restaurant_id from subscription metadata
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
      const restaurantId = subscription.metadata.restaurant_id

      if (restaurantId) {
        await admin
          .from('restaurants')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: subscription.status,
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
          .update({ subscription_status: subscription.status })
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

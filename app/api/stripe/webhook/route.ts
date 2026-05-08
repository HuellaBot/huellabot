import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new NextResponse('Webhook signature invalid', { status: 400 })
  }

  const getClinicId = (obj: { metadata?: Stripe.Metadata | null }): string | null =>
    obj.metadata?.clinic_id ?? null

  switch (event.type) {
    case 'checkout.session.completed': {
      const session   = event.data.object as Stripe.Checkout.Session
      const clinicId  = getClinicId(session)
      const subId     = session.subscription as string
      if (!clinicId || !subId) break

      const sub = await stripe.subscriptions.retrieve(subId)
      await updateSubscription(clinicId, sub)
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub      = event.data.object as Stripe.Subscription
      const clinicId = getClinicId(sub)
      if (!clinicId) break
      await updateSubscription(clinicId, sub)
      break
    }

    case 'customer.subscription.deleted': {
      const sub      = event.data.object as Stripe.Subscription
      const clinicId = getClinicId(sub)
      if (!clinicId) break
      await supabase.from('clinics').update({
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
      }).eq('id', clinicId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice  = event.data.object as Stripe.Invoice
      const subId    = invoice.subscription as string
      if (!subId) break
      const sub      = await stripe.subscriptions.retrieve(subId)
      const clinicId = getClinicId(sub)
      if (!clinicId) break
      await supabase.from('clinics').update({ subscription_status: 'past_due' }).eq('id', clinicId)
      break
    }
  }

  return new NextResponse(null, { status: 200 })
}

async function updateSubscription(clinicId: string, sub: Stripe.Subscription) {
  await supabase.from('clinics').update({
    stripe_subscription_id: sub.id,
    subscription_status:    sub.status,
    subscription_ends_at:   new Date(sub.current_period_end * 1000).toISOString(),
  }).eq('id', clinicId)
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: clinic } = await supabase
    .from('clinics').select('id, name, stripe_customer_id').eq('user_id', user.id).single()
  if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // Reusar customer de Stripe si ya existe
  let customerId = clinic.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: clinic.name,
      metadata: { clinic_id: clinic.id, user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('clinics').update({ stripe_customer_id: customerId }).eq('id', clinic.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { clinic_id: clinic.id },
    },
    success_url: `${appUrl}/dashboard/settings?subscribed=true`,
    cancel_url:  `${appUrl}/upgrade`,
    metadata: { clinic_id: clinic.id },
  })

  return NextResponse.json({ url: session.url })
}

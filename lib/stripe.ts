import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export const PLANS = {
  monthly: {
    name: 'Huella Bot Pro',
    priceId: process.env.STRIPE_PRICE_ID!,
    amount: 250000, // $2,500 MXN — shown in UI, actual amount set in Stripe
  },
}

export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing'
}

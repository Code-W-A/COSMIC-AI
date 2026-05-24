import "server-only"

import Stripe from "stripe"

let stripeClient: Stripe | null = null

function requiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getStripe() {
  if (stripeClient) return stripeClient

  stripeClient = new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  })

  return stripeClient
}

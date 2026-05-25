import type { BillingInterval } from "@/types/subscription"

export type DisplayPricing = {
  subscription: {
    monthly: { current: string; previous: string }
    annual: { current: string; previous: string }
  }
  oneOff: {
    relationshipReport: string
  }
}

export const displayPricing: DisplayPricing = {
  subscription: {
    monthly: {
      current: "34.99 RON",
      previous: "49 RON",
    },
    annual: {
      current: "349 RON",
      previous: "399 RON",
    },
  },
  oneOff: {
    relationshipReport: "29 RON",
  },
}

export function getSubscriptionDisplayPrice(interval: BillingInterval) {
  return interval === "annual"
    ? displayPricing.subscription.annual
    : displayPricing.subscription.monthly
}

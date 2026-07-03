import test from "node:test"
import assert from "node:assert/strict"

import { resolveStripeSubscriptionState } from "@/lib/stripe/subscription-state"

test("resolveStripeSubscriptionState maps deleted subscriptions back to free", () => {
  const state = resolveStripeSubscriptionState({
    status: "active",
    deleted: true,
    metadataPlan: "premium",
    metadataInterval: "monthly",
    recurringInterval: "month",
    currentPeriodEndSeconds: 1_700_000_000,
  })

  assert.equal(state.subscriptionStatus, "canceled")
  assert.equal(state.subscriptionPlan, "free")
  assert.equal(state.billingInterval, null)
  assert.equal(state.cancelAtPeriodEnd, false)
  assert.equal(state.shouldClearGrace, true)
})

test("resolveStripeSubscriptionState keeps premium only for active subscriptions", () => {
  const active = resolveStripeSubscriptionState({
    status: "active",
    metadataPlan: "premium",
    metadataInterval: "monthly",
    recurringInterval: "month",
    currentPeriodEndSeconds: 1_700_000_000,
  })

  assert.equal(active.subscriptionStatus, "active")
  assert.equal(active.subscriptionPlan, "premium")
  assert.equal(active.billingInterval, "monthly")
})

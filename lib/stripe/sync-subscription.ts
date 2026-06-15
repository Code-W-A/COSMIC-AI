import { FieldValue, Timestamp } from "firebase-admin/firestore"
import type Stripe from "stripe"

import { trackAnalyticsEvent } from "@/lib/analytics/track-server"
import { getAdminDb } from "@/lib/firebase/admin"
import { getBillingEventRef, getUserDocument, getUserRef } from "@/lib/firebase/firestore"
import { logInfo, logWarn } from "@/lib/logging/logger"
import { getLimitForPlan } from "@/lib/subscription/limits"
import {
  getEffectivePlanForStatus,
  isGraceEligibleStatus,
  isPremiumStatus,
  normalizeStripeSubscriptionStatus,
} from "@/lib/subscription/subscription"
import { getSubscriptionCatalogFromPriceId, isPaidPlan } from "@/lib/stripe/prices"
import { getStripe } from "@/lib/stripe/server"
import type { BillingInterval, SubscriptionPlan } from "@/types/subscription"

function getExpandableId(value: unknown) {
  if (!value) return null
  if (typeof value === "string") return value
  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id
  }
  return null
}

function timestampToMillis(value: unknown) {
  if (!value || typeof value !== "object") return null
  if ("toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return ((value as { toDate: () => Date }).toDate()).getTime()
  }
  if ("seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
    return (value as { seconds: number }).seconds * 1000
  }
  return null
}

export function getStripeCustomerId(
  customer: Stripe.Subscription["customer"] | Stripe.Checkout.Session["customer"] | null
) {
  return getExpandableId(customer)
}

export function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null
}

export function getSubscriptionInterval(subscription: Stripe.Subscription): BillingInterval | null {
  const interval = subscription.items.data[0]?.price?.recurring?.interval
  if (interval === "month") return "monthly"
  if (interval === "year") return "annual"
  return null
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.current_period_end ?? null
}

function resolvePaidPlanFromMetadata(subscription: Stripe.Subscription): SubscriptionPlan | null {
  const metadataPlan = subscription.metadata?.plan
  return isPaidPlan(metadataPlan) ? metadataPlan : null
}

function resolveBillingIntervalFromMetadata(
  subscription: Stripe.Subscription
): BillingInterval | null {
  const metadataInterval = subscription.metadata?.interval
  if (metadataInterval === "monthly" || metadataInterval === "annual") {
    return metadataInterval
  }
  return null
}

function resolveStripePlan(
  subscription: Stripe.Subscription,
  subscriptionStatus: ReturnType<typeof normalizeStripeSubscriptionStatus>
): SubscriptionPlan {
  const priceId = getSubscriptionPriceId(subscription)
  const subscriptionCatalog = getSubscriptionCatalogFromPriceId(priceId)

  if (subscriptionCatalog.plan !== "free") {
    return subscriptionCatalog.plan
  }

  const metadataPlan = resolvePaidPlanFromMetadata(subscription)
  if (metadataPlan) {
    return metadataPlan
  }

  if (isPremiumStatus(subscriptionStatus)) {
    return "premium"
  }

  return "free"
}

export async function findUidByStripeCustomerId(stripeCustomerId?: string | null) {
  if (!stripeCustomerId) return null

  const snapshot = await getAdminDb()
    .collection("users")
    .where("stripeCustomerId", "==", stripeCustomerId)
    .limit(1)
    .get()

  if (snapshot.empty) return null

  return snapshot.docs[0].id
}

export async function resolveUidForSubscription(subscription: Stripe.Subscription) {
  const uidFromMetadata = subscription.metadata?.uid
  if (uidFromMetadata) return uidFromMetadata

  return findUidByStripeCustomerId(getStripeCustomerId(subscription.customer))
}

async function saveBillingEvent(
  uid: string,
  source: string,
  data: {
    type: string
    stripeEventId?: string
    status?: string
    plan?: string
    raw?: Record<string, unknown>
  }
) {
  const billingEvent: Record<string, unknown> = {
    type: data.type,
    source,
    raw: data.raw ?? {},
    createdAt: FieldValue.serverTimestamp(),
  }

  if (data.stripeEventId) {
    billingEvent.stripeEventId = data.stripeEventId
  }

  if (data.status) {
    billingEvent.status = data.status
  }

  if (data.plan) {
    billingEvent.plan = data.plan
  }

  const eventId = data.stripeEventId ?? `${source}_${Date.now()}`
  await getBillingEventRef(uid, eventId).set(billingEvent)
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  })
}

export interface SyncSubscriptionOptions {
  uid?: string | null
  deleted?: boolean
  source?: string
  stripeEventId?: string
  stripeEventType?: string
}

export async function syncUserSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  options: SyncSubscriptionOptions = {}
) {
  const uid = options.uid ?? (await resolveUidForSubscription(subscription))
  const deleted = options.deleted ?? false
  const source = options.source ?? "stripe_sync"
  const stripeCustomerId = getStripeCustomerId(subscription.customer)
  const priceId = getSubscriptionPriceId(subscription)
  const currentPeriodEndSeconds = getCurrentPeriodEnd(subscription)
  const stripeStatus = deleted ? "canceled" : subscription.status
  const subscriptionStatus = normalizeStripeSubscriptionStatus(stripeStatus)
  const stripePlan = resolveStripePlan(subscription, subscriptionStatus)
  const billingInterval = deleted
    ? null
    : getSubscriptionInterval(subscription) ??
      getSubscriptionCatalogFromPriceId(priceId).interval ??
      resolveBillingIntervalFromMetadata(subscription)
  const currentPeriodEnd =
    currentPeriodEndSeconds && !deleted
      ? Timestamp.fromMillis(currentPeriodEndSeconds * 1000)
      : null

  if (!uid) {
    await logWarn("stripe.sync", "stripe_subscription_uid_missing", {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      source,
      eventId: options.stripeEventId,
      eventType: options.stripeEventType,
    })
    return null
  }

  const existingUser = await getUserDocument(uid)
  const graceUntilMs = timestampToMillis(existingUser?.graceUntil)
  const nowMs = Date.now()
  const isInGrace = typeof graceUntilMs === "number" && graceUntilMs > nowMs
  const keepPaidPlanViaGrace =
    !deleted && stripePlan !== "free" && isGraceEligibleStatus(subscriptionStatus) && isInGrace
  const hasPremiumStatus = isPremiumStatus(subscriptionStatus)
  const subscriptionPlan = deleted
    ? "free"
    : hasPremiumStatus || keepPaidPlanViaGrace
      ? stripePlan
      : getEffectivePlanForStatus(subscriptionStatus, stripePlan)
  const shouldClearGrace =
    deleted ||
    hasPremiumStatus ||
    stripeStatus === "canceled" ||
    (typeof graceUntilMs === "number" && graceUntilMs <= nowMs)

  await getUserRef(uid).set(
    {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus,
      subscriptionPlan,
      subscriptionInterval: subscriptionPlan === "free" ? null : billingInterval,
      currentPeriodEnd: currentPeriodEnd ?? FieldValue.delete(),
      cancelAtPeriodEnd: deleted ? false : subscription.cancel_at_period_end,
      graceUntil: shouldClearGrace ? FieldValue.delete() : existingUser?.graceUntil ?? FieldValue.delete(),
      graceReason: shouldClearGrace ? FieldValue.delete() : existingUser?.graceReason ?? FieldValue.delete(),
      monthlyQuestionLimit: getLimitForPlan(subscriptionPlan),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  await saveBillingEvent(uid, source, {
    type: options.stripeEventType ?? "subscription.synced",
    stripeEventId: options.stripeEventId,
    status: subscriptionStatus,
    plan: subscriptionPlan,
    raw: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
      priceId,
      billingInterval,
      cancelAtPeriodEnd: deleted ? false : subscription.cancel_at_period_end,
      currentPeriodEnd: currentPeriodEndSeconds,
      isInGrace,
      keepPaidPlanViaGrace,
    },
  })

  await logInfo("stripe.sync", "stripe_subscription_synced", {
    uid,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus,
    subscriptionPlan,
    billingInterval,
    cancelAtPeriodEnd: deleted ? false : subscription.cancel_at_period_end,
    isInGrace,
    source,
  })

  if (deleted) {
    await trackAnalyticsEvent("subscription_cancelled", {
      uid,
      source: "pricing",
      plan: subscriptionPlan,
      interval: billingInterval ?? undefined,
    })
  }

  return {
    uid,
    subscriptionStatus,
    subscriptionPlan,
    billingInterval,
  }
}

export async function syncCheckoutSessionForUid(uid: string, sessionId: string) {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  })

  if (session.metadata?.uid && session.metadata.uid !== uid) {
    throw new Error("checkout_session_uid_mismatch")
  }

  const stripeCustomerId = getStripeCustomerId(session.customer)
  const userDocument = await getUserDocument(uid)

  if (
    userDocument?.stripeCustomerId &&
    stripeCustomerId &&
    userDocument.stripeCustomerId !== stripeCustomerId
  ) {
    throw new Error("checkout_session_customer_mismatch")
  }

  if (stripeCustomerId) {
    await getUserRef(uid).set(
      {
        stripeCustomerId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  const subscriptionId = getExpandableId(session.subscription)
  if (!subscriptionId) {
    throw new Error("checkout_session_missing_subscription")
  }

  const subscription =
    typeof session.subscription === "object" && session.subscription
      ? (session.subscription as Stripe.Subscription)
      : await retrieveStripeSubscription(subscriptionId)

  return syncUserSubscriptionFromStripe(subscription, {
    uid,
    source: "checkout_session_sync",
    stripeEventType: "checkout.session.completed",
  })
}

export async function syncLatestSubscriptionForUid(uid: string) {
  const userDocument = await getUserDocument(uid)

  if (!userDocument) {
    throw new Error("user_not_found")
  }

  const stripe = getStripe()

  if (userDocument.stripeSubscriptionId) {
    const subscription = await retrieveStripeSubscription(userDocument.stripeSubscriptionId)
    return syncUserSubscriptionFromStripe(subscription, {
      uid,
      deleted: subscription.status === "canceled",
      source: "subscription_refresh",
      stripeEventType: "customer.subscription.updated",
    })
  }

  if (!userDocument.stripeCustomerId) {
    throw new Error("stripe_customer_missing")
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: userDocument.stripeCustomerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  })

  const activeSubscription =
    subscriptions.data.find((subscription) =>
      ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(subscription.status)
    ) ?? subscriptions.data[0]

  if (!activeSubscription) {
    throw new Error("stripe_subscription_missing")
  }

  return syncUserSubscriptionFromStripe(activeSubscription, {
    uid,
    deleted: activeSubscription.status === "canceled",
    source: "subscription_refresh",
    stripeEventType: "customer.subscription.updated",
  })
}

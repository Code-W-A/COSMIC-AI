import { FieldValue, Timestamp } from "firebase-admin/firestore"
import type Stripe from "stripe"

import { trackAnalyticsEvent } from "@/lib/analytics/track-server"
import { getAdminDb } from "@/lib/firebase/admin"
import { getBillingEventRef, getUserDocument, getUserRef } from "@/lib/firebase/firestore"
import { logInfo, logWarn } from "@/lib/logging/logger"
import { getLimitForPlan } from "@/lib/subscription/limits"
import { getSubscriptionCatalogFromPriceId } from "@/lib/stripe/prices"
import {
  resolveStripeSubscriptionState as resolveSubscriptionState,
  type ResolvedStripeSubscriptionState,
} from "@/lib/stripe/subscription-state"
import { getStripe } from "@/lib/stripe/server"

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

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.current_period_end ?? null
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

export function resolveStripeSubscriptionState(args: {
  subscription: Stripe.Subscription
  deleted?: boolean
  existingGraceUntilMs?: number | null
  nowMs?: number
}): ResolvedStripeSubscriptionState {
  const subscription = args.subscription
  return {
    ...resolveSubscriptionState({
      status: subscription.status,
      deleted: args.deleted,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadataPlan: subscription.metadata?.plan,
      metadataInterval: subscription.metadata?.interval,
      priceId: getSubscriptionPriceId(subscription),
      recurringInterval: subscription.items.data[0]?.price?.recurring?.interval ?? null,
      currentPeriodEndSeconds: getCurrentPeriodEnd(subscription),
      existingGraceUntilMs: args.existingGraceUntilMs,
      nowMs: args.nowMs,
    }),
    stripeCustomerId: getStripeCustomerId(subscription.customer),
  }
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

  if (!uid) {
    const stripeCustomerId = getStripeCustomerId(subscription.customer)
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
  const state = resolveStripeSubscriptionState({
    subscription,
    deleted,
    existingGraceUntilMs: graceUntilMs,
  })
  const currentPeriodEnd =
    state.currentPeriodEndSeconds && !deleted
      ? Timestamp.fromMillis(state.currentPeriodEndSeconds * 1000)
      : null

  await getUserRef(uid).set(
    {
      stripeCustomerId: state.stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: state.subscriptionStatus,
      subscriptionPlan: state.subscriptionPlan,
      subscriptionInterval:
        state.subscriptionPlan === "free" ? null : state.billingInterval,
      currentPeriodEnd: currentPeriodEnd ?? FieldValue.delete(),
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      graceUntil:
        state.shouldClearGrace ? FieldValue.delete() : existingUser?.graceUntil ?? FieldValue.delete(),
      graceReason:
        state.shouldClearGrace ? FieldValue.delete() : existingUser?.graceReason ?? FieldValue.delete(),
      monthlyQuestionLimit: getLimitForPlan(state.subscriptionPlan),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  await saveBillingEvent(uid, source, {
    type: options.stripeEventType ?? "subscription.synced",
    stripeEventId: options.stripeEventId,
    status: state.subscriptionStatus,
    plan: state.subscriptionPlan,
    raw: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: state.stripeCustomerId,
      priceId: state.priceId,
      billingInterval: state.billingInterval,
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      currentPeriodEnd: state.currentPeriodEndSeconds,
      isInGrace: state.isInGrace,
      keepPaidPlanViaGrace: state.keepPaidPlanViaGrace,
    },
  })

  await logInfo("stripe.sync", "stripe_subscription_synced", {
    uid,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: state.subscriptionStatus,
    subscriptionPlan: state.subscriptionPlan,
    billingInterval: state.billingInterval,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    isInGrace: state.isInGrace,
    source,
  })

  if (deleted) {
    await trackAnalyticsEvent("subscription_cancelled", {
      uid,
      source: "pricing",
      plan: state.subscriptionPlan,
      interval: state.billingInterval ?? undefined,
    })
  }

  return {
    uid,
    subscriptionStatus: state.subscriptionStatus,
    subscriptionPlan: state.subscriptionPlan,
    billingInterval: state.billingInterval,
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

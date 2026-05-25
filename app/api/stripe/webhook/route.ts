import { FieldValue, Timestamp } from "firebase-admin/firestore"
import type Stripe from "stripe"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { BillingEnvError, assertStripeWebhookEnvReady } from "@/lib/billing/env"
import { getAdminDb } from "@/lib/firebase/admin"
import { getBillingEventRef, getReportPurchaseRef, getUserDocument, getUserRef } from "@/lib/firebase/firestore"
import { logError, logInfo, logWarn } from "@/lib/logging/logger"
import {
  cancelOblioInvoiceForStripeInvoice,
  issueOblioCorrectionForStripeCreditNote,
  issueOblioInvoiceForStripeInvoice,
  markOblioCorrectionVoided,
} from "@/lib/oblio/invoice"
import {
  SUBSCRIPTION_GRACE_DAYS,
  SUBSCRIPTION_GRACE_REASON_INVOICE_PAYMENT_FAILED,
  getEffectivePlanForStatus,
  isGraceEligibleStatus,
  isPremiumStatus,
  normalizeStripeSubscriptionStatus,
} from "@/lib/subscription/subscription"
import { getLimitForPlan } from "@/lib/subscription/limits"
import { getReportSkuFromPriceId, getSubscriptionCatalogFromPriceId } from "@/lib/stripe/prices"
import { getStripe } from "@/lib/stripe/server"
import type { BillingInterval, ReportSku } from "@/types/subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    throw new Error("Missing required environment variable: STRIPE_WEBHOOK_SECRET")
  }

  return secret
}

function getExpandableId(value: unknown) {
  if (!value) return null
  if (typeof value === "string") return value
  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id
  }
  return null
}

function getCustomerId(customer: Stripe.Subscription["customer"] | Stripe.Invoice["customer"] | null) {
  return getExpandableId(customer)
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

async function findUidByStripeCustomerId(stripeCustomerId?: string | null) {
  if (!stripeCustomerId) return null

  const snapshot = await getAdminDb()
    .collection("users")
    .where("stripeCustomerId", "==", stripeCustomerId)
    .limit(1)
    .get()

  if (snapshot.empty) return null

  return snapshot.docs[0].id
}

async function resolveUidForSubscription(subscription: Stripe.Subscription) {
  const uidFromMetadata = subscription.metadata?.uid

  if (uidFromMetadata) return uidFromMetadata

  return findUidByStripeCustomerId(getCustomerId(subscription.customer))
}

async function resolveUidForInvoice(invoice: Stripe.Invoice) {
  const uidFromMetadata = invoice.metadata?.uid

  if (uidFromMetadata) return uidFromMetadata

  return findUidByStripeCustomerId(getCustomerId(invoice.customer))
}

async function resolveUidForCreditNote(creditNote: Stripe.CreditNote) {
  const uidFromMetadata = creditNote.metadata?.uid

  if (uidFromMetadata) return uidFromMetadata

  return findUidByStripeCustomerId(getExpandableId(creditNote.customer))
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const parentSubscription =
    invoice.parent?.type === "subscription_details"
      ? invoice.parent.subscription_details?.subscription
      : null
  const parentId = getExpandableId(parentSubscription)

  if (parentId) return parentId

  return getExpandableId((invoice as Stripe.Invoice & { subscription?: unknown }).subscription)
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0]

  return firstItem?.current_period_end ?? null
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null
}

function getSubscriptionInterval(subscription: Stripe.Subscription): BillingInterval | null {
  const interval = subscription.items.data[0]?.price?.recurring?.interval
  if (interval === "month") return "monthly"
  if (interval === "year") return "annual"
  return null
}

async function saveBillingEvent(
  uid: string,
  event: Stripe.Event,
  data: {
    status?: string
    plan?: string
    raw?: Record<string, unknown>
  } = {}
) {
  const billingEvent: Record<string, unknown> = {
    type: event.type,
    stripeEventId: event.id,
    raw: data.raw ?? {},
    createdAt: FieldValue.serverTimestamp(),
  }

  if (data.status) {
    billingEvent.status = data.status
  }

  if (data.plan) {
    billingEvent.plan = data.plan
  }

  await getBillingEventRef(uid, event.id).set(billingEvent)
}

async function syncSubscription(event: Stripe.Event, subscription: Stripe.Subscription, deleted = false) {
  const uid = await resolveUidForSubscription(subscription)
  const stripeCustomerId = getCustomerId(subscription.customer)
  const priceId = getSubscriptionPriceId(subscription)
  const currentPeriodEndSeconds = getCurrentPeriodEnd(subscription)
  const stripeStatus = deleted ? "canceled" : subscription.status
  const subscriptionStatus = normalizeStripeSubscriptionStatus(stripeStatus)
  const subscriptionCatalog = getSubscriptionCatalogFromPriceId(priceId)
  const stripePlan = subscriptionCatalog.plan
  const billingInterval = deleted
    ? null
    : getSubscriptionInterval(subscription) ?? subscriptionCatalog.interval
  const currentPeriodEnd =
    currentPeriodEndSeconds && !deleted
      ? Timestamp.fromMillis(currentPeriodEndSeconds * 1000)
      : null

  if (!uid) {
    await logWarn("stripe.webhook", "stripe_subscription_uid_missing", {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      eventId: event.id,
      eventType: event.type,
    })
    return
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

  await saveBillingEvent(uid, event, {
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

  await logInfo("stripe.webhook", "stripe_subscription_synced", {
    uid,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus,
    subscriptionPlan,
    billingInterval,
    cancelAtPeriodEnd: deleted ? false : subscription.cancel_at_period_end,
    isInGrace,
  })
}

async function retrieveSubscription(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  })
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  const uid = session.metadata?.uid ?? (await findUidByStripeCustomerId(getExpandableId(session.customer)))
  const stripeCustomerId = getExpandableId(session.customer)
  const subscriptionId = getExpandableId(session.subscription)
  const checkoutType = session.metadata?.checkoutType

  if (uid) {
    await logInfo("growth", "checkout_completed", {
      uid,
      checkoutType,
      stripeCheckoutSessionId: session.id,
    })
  }

  if (uid && stripeCustomerId) {
    await getUserRef(uid).set(
      {
        stripeCustomerId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  if (subscriptionId) {
    const subscription = await retrieveSubscription(subscriptionId)
    await syncSubscription(event, subscription)
    return
  }

  if (uid && checkoutType === "one_off" && session.mode === "payment") {
    const sku =
      (session.metadata?.sku as ReportSku | undefined) ??
      getReportSkuFromPriceId(session.metadata?.priceId ?? null)
    if (sku) {
      const purchaseRef = getReportPurchaseRef(uid)
      await purchaseRef.set({
        uid,
        sku,
        status: "paid",
        stripeSessionId: session.id,
        stripePaymentIntentId: getExpandableId(session.payment_intent),
        stripeCustomerId,
        amountTotal: session.amount_total ?? undefined,
        currency: session.currency ?? undefined,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      await logInfo("growth", "report_purchased", {
        uid,
        sku,
        reportPurchaseId: purchaseRef.id,
        stripeCheckoutSessionId: session.id,
      })
    }
  }

  if (uid) {
    await saveBillingEvent(uid, event, {
      status: session.status ?? undefined,
      plan: session.metadata?.plan || undefined,
      raw: {
        checkoutSessionId: session.id,
        stripeCustomerId,
        subscriptionId,
        checkoutType,
        mode: session.mode,
      },
    })
  }
}

async function handleInvoiceEvent(event: Stripe.Event, kind: "succeeded" | "failed") {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  const uid = await resolveUidForInvoice(invoice)

  await logInfo(
    "stripe.webhook",
    kind === "succeeded"
      ? "stripe_invoice_payment_succeeded"
      : "stripe_invoice_payment_failed",
    {
      uid: uid ?? undefined,
      invoiceId: invoice.id,
      stripeCustomerId: getCustomerId(invoice.customer),
      subscriptionId,
    }
  )

  if (uid && kind === "failed") {
    const graceUntil = Timestamp.fromMillis(
      Date.now() + SUBSCRIPTION_GRACE_DAYS * 24 * 60 * 60 * 1000
    )

    await getUserRef(uid).set(
      {
        graceUntil,
        graceReason: SUBSCRIPTION_GRACE_REASON_INVOICE_PAYMENT_FAILED,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  if (subscriptionId) {
    const subscription = await retrieveSubscription(subscriptionId)
    await syncSubscription(event, subscription)
  }

  if (kind === "succeeded" && uid) {
    try {
      await issueOblioInvoiceForStripeInvoice({ uid, invoice })
    } catch (error) {
      await logWarn("stripe.webhook", "oblio_invoice_issue_skipped", {
        uid,
        invoiceId: invoice.id,
        error: getErrorMessage(error),
      })
    }

    await getUserRef(uid).set(
      {
        graceUntil: FieldValue.delete(),
        graceReason: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  if (uid) {
    await saveBillingEvent(uid, event, {
      status: invoice.status ?? undefined,
      raw: {
        invoiceId: invoice.id,
        stripeCustomerId: getCustomerId(invoice.customer),
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        graceApplied: kind === "failed",
      },
    })
  }
}

async function handleCreditNoteCreated(event: Stripe.Event) {
  const creditNote = event.data.object as Stripe.CreditNote
  const uid = await resolveUidForCreditNote(creditNote)

  if (!uid) {
    await logWarn("stripe.webhook", "stripe_credit_note_uid_missing", {
      stripeEventId: event.id,
      stripeCreditNoteId: creditNote.id,
      stripeCustomerId: getExpandableId(creditNote.customer),
    })
    return
  }

  await issueOblioCorrectionForStripeCreditNote({
    uid,
    creditNote,
    stripeEventId: event.id,
  })

  await saveBillingEvent(uid, event, {
    status: creditNote.status,
    raw: {
      stripeCreditNoteId: creditNote.id,
      stripeInvoiceId: getExpandableId(creditNote.invoice),
      amount: creditNote.total,
      currency: creditNote.currency,
      creditType: creditNote.type,
    },
  })
}

async function handleCreditNoteVoided(event: Stripe.Event) {
  const creditNote = event.data.object as Stripe.CreditNote
  const uid = await resolveUidForCreditNote(creditNote)

  if (!uid) {
    await logWarn("stripe.webhook", "stripe_credit_note_void_uid_missing", {
      stripeEventId: event.id,
      stripeCreditNoteId: creditNote.id,
      stripeCustomerId: getExpandableId(creditNote.customer),
    })
    return
  }

  await markOblioCorrectionVoided({
    uid,
    creditNote,
    stripeEventId: event.id,
  })

  await saveBillingEvent(uid, event, {
    status: creditNote.status,
    raw: {
      stripeCreditNoteId: creditNote.id,
      stripeInvoiceId: getExpandableId(creditNote.invoice),
      amount: creditNote.total,
      currency: creditNote.currency,
      creditType: creditNote.type,
    },
  })
}

async function handleInvoiceVoided(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const uid = await resolveUidForInvoice(invoice)

  if (!uid) {
    await logWarn("stripe.webhook", "stripe_invoice_void_uid_missing", {
      stripeEventId: event.id,
      stripeInvoiceId: invoice.id,
      stripeCustomerId: getCustomerId(invoice.customer),
    })
    return
  }

  await cancelOblioInvoiceForStripeInvoice({
    uid,
    stripeInvoiceId: invoice.id,
    stripeEventId: event.id,
  })

  await saveBillingEvent(uid, event, {
    status: invoice.status ?? undefined,
    raw: {
      stripeInvoiceId: invoice.id,
      stripeCustomerId: getCustomerId(invoice.customer),
      amountPaid: invoice.amount_paid,
      amountDue: invoice.amount_due,
    },
  })
}

export async function POST(request: Request) {
  try {
    assertStripeWebhookEnvReady()
  } catch (error) {
    if (error instanceof BillingEnvError) {
      await logError("stripe.webhook", "billing_env_invalid", {
        missingKeys: error.missingKeys,
      })
      return errorResponse(
        "billing_env_invalid",
        "Billing environment is not configured correctly.",
        500
      )
    }
    throw error
  }

  await logInfo("stripe.webhook", "stripe_webhook_received", {
    hasSignature: Boolean(request.headers.get("stripe-signature")),
  })

  const rawBody = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return errorResponse("stripe_signature_missing", "Missing Stripe signature.", 400)
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, getWebhookSecret())
  } catch (error) {
    await logError("stripe.webhook", "stripe_webhook_error", { error })
    return errorResponse("stripe_webhook_verification_failed", "Invalid Stripe signature.", 400)
  }

  await logInfo("stripe.webhook", "stripe_webhook_verified", {
    eventId: event.id,
    eventType: event.type,
  })

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event)
        break
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscription(event, event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.deleted":
        await syncSubscription(event, event.data.object as Stripe.Subscription, true)
        break
      case "invoice.payment_succeeded":
        await handleInvoiceEvent(event, "succeeded")
        break
      case "invoice.payment_failed":
        await handleInvoiceEvent(event, "failed")
        break
      case "credit_note.created":
        await handleCreditNoteCreated(event)
        break
      case "credit_note.voided":
        await handleCreditNoteVoided(event)
        break
      case "invoice.voided":
        await handleInvoiceVoided(event)
        break
      default:
        break
    }

    return successResponse({ received: true })
  } catch (error) {
    await logError("stripe.webhook", "stripe_webhook_error", {
      eventId: event.id,
      eventType: event.type,
      error,
    })

    return errorResponse(
      "stripe_webhook_error",
      process.env.NODE_ENV === "production"
        ? "Unable to process Stripe webhook."
        : getErrorMessage(error),
      500
    )
  }
}

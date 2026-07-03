import { FieldValue } from "firebase-admin/firestore"
import { NextResponse } from "next/server"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { BillingEnvError, assertStripeEnvReady } from "@/lib/billing/env"
import { isBillingProfileComplete } from "@/lib/billing/profile"
import {
  createUserDocumentIfMissing,
  getUserDocument,
  getUserRef,
} from "@/lib/firebase/firestore"
import { trackAnalyticsEvent } from "@/lib/analytics/track-server"
import { logError, logInfo } from "@/lib/logging/logger"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import {
  appendLiveTestPricingParams,
  validateLiveTestPricing,
} from "@/lib/stripe/live-test-pricing"
import { getOneOffPriceId, getSubscriptionPriceId, type PricingMode } from "@/lib/stripe/prices"
import { getStripe } from "@/lib/stripe/server"
import type {
  BillingInterval,
  CheckoutType,
  PaidSubscriptionPlan,
  ReportSku,
} from "@/types/subscription"
import type Stripe from "stripe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getAppUrl(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto")
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = request.headers.get("host")
  const baseHost = forwardedHost ?? host

  if (baseHost) {
    const proto = forwardedProto ?? (baseHost.includes("localhost") ? "http" : "https")
    const requestUrl = `${proto}://${baseHost}`
    if (process.env.NODE_ENV !== "production") return requestUrl
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) return envUrl

  return "http://localhost:3000"
}

type SubscriptionCheckoutRequest = {
  checkoutType: "subscription"
  plan: "premium"
  interval: BillingInterval
}

type OneOffCheckoutRequest = {
  checkoutType: "one_off"
  sku: ReportSku
}

type CheckoutRequest = SubscriptionCheckoutRequest | OneOffCheckoutRequest

type ParsedCheckoutRequest = {
  checkout: CheckoutRequest
  pricingMode: PricingMode
}

function resolvePricingMode(body: Record<string, unknown>): PricingMode {
  if (body.liveTestPricing !== true) return "standard"

  const clientToken =
    typeof body.liveTestToken === "string" ? body.liveTestToken : undefined

  return validateLiveTestPricing(clientToken) ? "live_test" : "standard"
}

function getBillingSetupUrl(request: CheckoutRequest, pricingMode: PricingMode) {
  const params = new URLSearchParams()
  params.set("checkoutType", request.checkoutType)

  if (request.checkoutType === "subscription") {
    params.set("plan", request.plan)
    params.set("interval", request.interval)
  } else {
    params.set("sku", request.sku)
  }

  const baseUrl = `/billing/setup?${params.toString()}`

  if (pricingMode !== "live_test") return baseUrl

  const token = process.env.STRIPE_LIVE_TEST_PRICING_TOKEN?.trim()
  if (!token) return baseUrl

  return appendLiveTestPricingParams(baseUrl, { enabled: true, token })
}

function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "annual"
}

function isCheckoutType(value: unknown): value is CheckoutType {
  return value === "subscription" || value === "one_off"
}

function isReportSku(value: unknown): value is ReportSku {
  return value === "relationship_report"
}

function isPaidSubscriptionPlan(value: unknown): value is PaidSubscriptionPlan {
  return value === "premium" || value === "cosmic_plus"
}

function isMissingStripeCustomerError(error: unknown, stripeCustomerId: string) {
  if (!error || typeof error !== "object") return false

  const maybeStripeError = error as {
    code?: unknown
    message?: unknown
    raw?: { code?: unknown; message?: unknown }
  }

  const code =
    typeof maybeStripeError.code === "string"
      ? maybeStripeError.code
      : typeof maybeStripeError.raw?.code === "string"
        ? maybeStripeError.raw.code
        : null
  const message =
    typeof maybeStripeError.message === "string"
      ? maybeStripeError.message
      : typeof maybeStripeError.raw?.message === "string"
        ? maybeStripeError.raw.message
        : null

  return (
    code === "resource_missing" &&
    Boolean(message?.includes("No such customer")) &&
    Boolean(message?.includes(stripeCustomerId))
  )
}

async function createStripeCustomer(
  stripe: Stripe,
  params: {
    uid: string
    email?: string | null
    name?: string | null
  }
) {
  return stripe.customers.create({
    email: params.email ?? undefined,
    name: params.name ?? undefined,
    metadata: {
      uid: params.uid,
    },
  })
}

function parseCheckoutRequest(body: Record<string, unknown>): ParsedCheckoutRequest | null {
  const pricingMode = resolvePricingMode(body)
  let checkout: CheckoutRequest | null = null

  if (!isCheckoutType(body.checkoutType)) {
    // Backward compatibility with old payload: { plan: "premium" }
    if (isPaidSubscriptionPlan(body.plan) && body.plan === "premium") {
      checkout = {
        checkoutType: "subscription",
        plan: body.plan,
        interval: "monthly",
      }
    }
  } else if (body.checkoutType === "subscription") {
    if (body.plan === "premium" && isBillingInterval(body.interval)) {
      checkout = {
        checkoutType: "subscription",
        plan: body.plan,
        interval: body.interval,
      }
    }
  } else if (isReportSku(body.sku)) {
    checkout = {
      checkoutType: "one_off",
      sku: body.sku,
    }
  }

  if (!checkout) return null

  return { checkout, pricingMode }
}

async function createCheckoutSession(
  stripe: Stripe,
  stripeCustomerId: string,
  checkoutRequest: CheckoutRequest,
  params: {
    appUrl: string
    baseMetadata: Record<string, string>
    uid: string
    pricingMode: PricingMode
  }
) {
  const oneOffPriceId =
    checkoutRequest.checkoutType === "one_off"
      ? getOneOffPriceId(checkoutRequest.sku, params.pricingMode)
      : null

  const sessionMetadata: Record<string, string> = {
    ...params.baseMetadata,
  }

  if (params.pricingMode === "live_test") {
    sessionMetadata.pricingMode = "live_test"
  }

  return checkoutRequest.checkoutType === "subscription"
    ? stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        line_items: [
          {
            price: getSubscriptionPriceId(
              checkoutRequest.plan,
              checkoutRequest.interval,
              params.pricingMode
            ),
            quantity: 1,
          },
        ],
        success_url: `${params.appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${params.appUrl}/pricing?checkout=cancelled`,
        metadata: {
          ...sessionMetadata,
          plan: checkoutRequest.plan,
          interval: checkoutRequest.interval,
          reportType: "",
        },
        subscription_data: {
          metadata: (() => {
            const subscriptionMetadata: Record<string, string> = {
              uid: params.uid,
              checkoutType: "subscription",
              plan: checkoutRequest.plan,
              interval: checkoutRequest.interval,
            }

            if (params.pricingMode === "live_test") {
              subscriptionMetadata.pricingMode = "live_test"
            }

            return subscriptionMetadata
          })(),
        },
      })
    : stripe.checkout.sessions.create({
        mode: "payment",
        customer: stripeCustomerId,
        line_items: [
          {
            price: oneOffPriceId as string,
            quantity: 1,
          },
        ],
        success_url: `${params.appUrl}/report?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${params.appUrl}/report?checkout=cancelled`,
        metadata: {
          ...sessionMetadata,
          plan: "",
          interval: "",
          reportType: checkoutRequest.sku,
          sku: checkoutRequest.sku,
          priceId: oneOffPriceId ?? "",
        },
      })
}

export async function POST(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400)
  }

  const parsedCheckoutRequest = parseCheckoutRequest(body)

  if (!parsedCheckoutRequest) {
    return errorResponse("invalid_checkout_request", "Provide a valid checkout payload.", 400)
  }

  const { checkout: checkoutRequest, pricingMode } = parsedCheckoutRequest

  try {
    assertStripeEnvReady()
    await createUserDocumentIfMissing(user)

    const stripe = getStripe()
    const userRef = getUserRef(user.uid)
    const userDocument = await getUserDocument(user.uid)

    if (!userDocument) {
      return errorResponse("user_not_found", "User profile was not found.", 404)
    }

    if (!isBillingProfileComplete(userDocument.billingProfile)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "billing_profile_required",
            message: "Complete billing details before starting checkout.",
          },
          setupUrl: getBillingSetupUrl(checkoutRequest, pricingMode),
        },
        { status: 409 }
      )
    }

    let stripeCustomerId = userDocument.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(stripe, {
        uid: user.uid,
        email: user.email ?? userDocument.email,
        name: user.name ?? userDocument.displayName,
      })

      stripeCustomerId = customer.id

      await userRef.set(
        {
          stripeCustomerId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      await logInfo("stripe.checkout", "stripe_customer_created", {
        uid: user.uid,
        stripeCustomerId,
      })
    }

    const appUrl = getAppUrl(request)
    const baseMetadata: Record<string, string> = {
      uid: user.uid,
      checkoutType: checkoutRequest.checkoutType,
    }

    await logInfo("growth", "checkout_started", {
      uid: user.uid,
      checkoutType: checkoutRequest.checkoutType,
      plan: checkoutRequest.checkoutType === "subscription" ? checkoutRequest.plan : undefined,
      interval:
        checkoutRequest.checkoutType === "subscription" ? checkoutRequest.interval : undefined,
      sku: checkoutRequest.checkoutType === "one_off" ? checkoutRequest.sku : undefined,
    })

    const checkoutLocale = getRequestLocale(request) === "ro" ? "ro" : "en"

    await trackAnalyticsEvent("checkout_started", {
      uid: user.uid,
      locale: checkoutLocale,
      source: "pricing",
      checkoutType: checkoutRequest.checkoutType,
      plan: checkoutRequest.checkoutType === "subscription" ? checkoutRequest.plan : undefined,
      interval:
        checkoutRequest.checkoutType === "subscription" ? checkoutRequest.interval : undefined,
    })

    let session: Stripe.Checkout.Session

    try {
      session = await createCheckoutSession(stripe, stripeCustomerId, checkoutRequest, {
        appUrl,
        baseMetadata,
        uid: user.uid,
        pricingMode,
      })
    } catch (error) {
      if (!stripeCustomerId || !isMissingStripeCustomerError(error, stripeCustomerId)) {
        throw error
      }

      await logInfo("stripe.checkout", "stripe_customer_recreating_after_missing", {
        uid: user.uid,
        staleStripeCustomerId: stripeCustomerId,
      })

      const replacementCustomer = await createStripeCustomer(stripe, {
        uid: user.uid,
        email: user.email ?? userDocument.email,
        name: user.name ?? userDocument.displayName,
      })

      stripeCustomerId = replacementCustomer.id

      await userRef.set(
        {
          stripeCustomerId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      await logInfo("stripe.checkout", "stripe_customer_recreated", {
        uid: user.uid,
        stripeCustomerId,
      })

      session = await createCheckoutSession(stripe, stripeCustomerId, checkoutRequest, {
        appUrl,
        baseMetadata,
        uid: user.uid,
        pricingMode,
      })
    }

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout Session URL.")
    }

    await logInfo("stripe.checkout", "checkout_session_created", {
      uid: user.uid,
      checkoutType: checkoutRequest.checkoutType,
      plan: checkoutRequest.checkoutType === "subscription" ? checkoutRequest.plan : undefined,
      interval:
        checkoutRequest.checkoutType === "subscription" ? checkoutRequest.interval : undefined,
      sku: checkoutRequest.checkoutType === "one_off" ? checkoutRequest.sku : undefined,
      checkoutSessionId: session.id,
    })

    return successResponse({ url: session.url })
  } catch (error) {
    if (error instanceof BillingEnvError) {
      await logError("stripe.checkout", "billing_env_invalid", {
        uid: user.uid,
        missingKeys: error.missingKeys,
      })
      return errorResponse(
        "billing_env_invalid",
        "Billing environment is not configured correctly.",
        500
      )
    }

    await logError("stripe.checkout", "checkout_session_failed", {
      uid: user.uid,
      checkoutRequest,
      error,
    })

    return errorResponse(
      "checkout_session_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to start checkout."
        : getErrorMessage(error),
      500
    )
  }
}

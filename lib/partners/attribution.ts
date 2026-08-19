import "server-only"

import { FieldValue } from "firebase-admin/firestore"
import type { DecodedIdToken } from "firebase-admin/auth"

import { getUserDocument, getUserRef } from "@/lib/firebase/firestore"
import { logInfo } from "@/lib/logging/logger"
import {
  DEFAULT_REFERRAL_COUPON_ID,
  DEFAULT_REFERRAL_DISCOUNT_PERCENT,
  getReferralCodeFromCookieHeader,
  normalizeEmail,
  normalizeReferralCode,
} from "@/lib/partners/codes"
import {
  getActivePartnerByCode,
  getActivePartnerByEmail,
  recordReferralConversion,
} from "@/lib/partners/store"
import { getLimitForPlan } from "@/lib/subscription/limits"
import type { PartnerDocument } from "@/lib/partners/types"

export function resolveReferralCodeFromRequest(
  request: Request,
  bodyCode?: string | null
): string | null {
  return (
    normalizeReferralCode(bodyCode) ??
    getReferralCodeFromCookieHeader(request.headers.get("cookie"))
  )
}

export async function applyReferralOnUserCreate(params: {
  uid: string
  email?: string | null
  referralCode?: string | null
}): Promise<string | null> {
  const partner = await getActivePartnerByCode(params.referralCode)
  if (!partner) return null

  const userEmail = normalizeEmail(params.email)
  if (userEmail && userEmail === partner.email) {
    return null
  }

  const user = await getUserDocument(params.uid)
  if (user?.referredBy) return user.referredBy

  await getUserRef(params.uid).set(
    {
      referredBy: partner.code,
      referralCapturedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  await recordReferralConversion({
    conversionId: `${partner.code}:signup:${params.uid}`,
    type: "signup",
    partnerCode: partner.code,
    uid: params.uid,
    email: params.email ?? null,
  })

  await logInfo("partners", "referral_signup_attributed", {
    uid: params.uid,
    partnerCode: partner.code,
  })

  return partner.code
}

export async function grantComplimentaryPremiumForUid(params: {
  uid: string
  partnerCode: string
}) {
  const user = await getUserDocument(params.uid)
  if (user?.stripeSubscriptionId && user.subscriptionStatus === "active") {
    return false
  }

  await getUserRef(params.uid).set(
    {
      subscriptionStatus: "active",
      subscriptionPlan: "premium",
      subscriptionInterval: null,
      premiumSource: "complimentary_partner",
      complimentaryPartnerCode: params.partnerCode,
      monthlyQuestionLimit: getLimitForPlan("premium"),
      cancelAtPeriodEnd: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  await logInfo("partners", "complimentary_premium_granted", {
    uid: params.uid,
    partnerCode: params.partnerCode,
  })

  return true
}

export async function grantComplimentaryPartnerPremiumIfEligible(
  decodedToken: DecodedIdToken
): Promise<PartnerDocument | null> {
  const partner = await getActivePartnerByEmail(decodedToken.email ?? null)
  if (!partner?.grantPremium) return null

  await grantComplimentaryPremiumForUid({
    uid: decodedToken.uid,
    partnerCode: partner.code,
  })

  return partner
}

export function getReferralCouponId(partner?: PartnerDocument | null) {
  const fromPartner = partner?.stripeCouponId?.trim()
  if (fromPartner) return fromPartner

  const percent = getReferralDiscountPercent(partner)
  if (percent === DEFAULT_REFERRAL_DISCOUNT_PERCENT) {
    const fromEnv = process.env.STRIPE_REFERRAL_COUPON_ID?.trim()
    return fromEnv || DEFAULT_REFERRAL_COUPON_ID
  }

  return `astroai_influencer_${percent}_once`
}

export function getReferralDiscountPercent(partner?: PartnerDocument | null) {
  if (typeof partner?.discountPercent === "number" && partner.discountPercent > 0) {
    return partner.discountPercent
  }
  return DEFAULT_REFERRAL_DISCOUNT_PERCENT
}

export async function resolveCheckoutReferral(params: {
  uid: string
  email?: string | null
  request: Request
}): Promise<PartnerDocument | null> {
  const user = await getUserDocument(params.uid)
  const userEmail = normalizeEmail(params.email ?? user?.email)
  const ownedPartner = await getActivePartnerByEmail(userEmail)
  if (ownedPartner) return null

  const code = user?.referredBy ?? resolveReferralCodeFromRequest(params.request)
  return getActivePartnerByCode(code)
}

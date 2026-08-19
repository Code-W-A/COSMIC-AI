import "server-only"

import type Stripe from "stripe"

import { getReferralCouponId, getReferralDiscountPercent } from "@/lib/partners/attribution"
import type { PartnerDocument } from "@/lib/partners/types"

export async function ensureReferralCoupon(
  stripe: Stripe,
  partner?: PartnerDocument | null
): Promise<{ couponId: string; percentOff: number } | null> {
  const couponId = getReferralCouponId(partner)
  const percentOff = getReferralDiscountPercent(partner)
  const isManagedCoupon = !partner?.stripeCouponId?.trim()

  try {
    const coupon = await stripe.coupons.retrieve(couponId)
    return {
      couponId: coupon.id,
      percentOff: coupon.percent_off ?? percentOff,
    }
  } catch {
    if (!isManagedCoupon) {
      return null
    }

    const created = await stripe.coupons.create({
      id: couponId,
      percent_off: percentOff,
      duration: "once",
      name: `Influencer referral ${percentOff}% — first invoice`,
    })

    return {
      couponId: created.id,
      percentOff: created.percent_off ?? percentOff,
    }
  }
}

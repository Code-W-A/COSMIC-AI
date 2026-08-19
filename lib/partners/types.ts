import type { FirestoreTimestampLike } from "@/types/user"
import type { BillingInterval } from "@/types/subscription"

export type PartnerStatus = "active" | "paused"

export interface PartnerDocument {
  code: string
  name: string
  email: string
  status: PartnerStatus
  grantPremium: boolean
  commissionPercent: number
  discountPercent: number
  stripeCouponId?: string | null
  uid?: string | null
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}

export type ReferralConversionType = "signup" | "invoice_paid"

export interface ReferralConversionDocument {
  type: ReferralConversionType
  partnerCode: string
  uid: string
  email?: string | null
  plan?: string | null
  interval?: BillingInterval | null
  amountPaid?: number | null
  currency?: string | null
  billingPhase?: string | null
  stripeInvoiceId?: string | null
  stripeSessionId?: string | null
  createdAt: FirestoreTimestampLike
}

export type PremiumSource = "stripe" | "complimentary_partner"

export interface PartnerPreview {
  code: string
  name: string
  discountPercent: number
}

export interface PartnerAdminSummary {
  code: string
  name: string
  email: string
  uid?: string | null
  status: PartnerStatus
  grantPremium: boolean
  commissionPercent: number
  discountPercent: number
  sharePath: string
  shareUrl: string
  signupCount: number
  paidCount: number
  paidAmountTotal: number
}

export interface AdminUserOption {
  uid: string
  email: string
  displayName: string
  alreadyPartner: boolean
  partnerCode?: string | null
}

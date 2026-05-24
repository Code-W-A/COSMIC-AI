import type { AgentType } from "./agent"
import type { BillingInterval, ReportSku, SubscriptionPlan, SubscriptionStatus } from "./subscription"
import type { AgentCard, UsedAstrologyData } from "@/lib/agents/types"
import type { NatalChartData } from "@/lib/divineapi/types"

export type FirestoreTimestampLike = {
  toDate?: () => Date
  seconds?: number
  nanoseconds?: number
}

export const mainFocusValues = [
  "love",
  "compatibility",
  "self_discovery",
  "career",
  "daily_guidance",
] as const

export type MainFocus = (typeof mainFocusValues)[number]

export function isMainFocus(value: unknown): value is MainFocus {
  return typeof value === "string" && mainFocusValues.includes(value as MainFocus)
}

export const sexAtBirthValues = ["male", "female"] as const
export type SexAtBirth = (typeof sexAtBirthValues)[number]

export function isSexAtBirth(value: unknown): value is SexAtBirth {
  return typeof value === "string" && sexAtBirthValues.includes(value as SexAtBirth)
}

export interface UserDocument {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
  stripeCustomerId?: string
  subscriptionStatus: SubscriptionStatus
  subscriptionPlan: SubscriptionPlan
  stripeSubscriptionId?: string
  subscriptionInterval?: BillingInterval | null
  currentPeriodEnd?: FirestoreTimestampLike
  cancelAtPeriodEnd?: boolean
  graceUntil?: FirestoreTimestampLike
  graceReason?: string
  monthlyQuestionCount: number
  monthlyQuestionLimit: number
  monthlyUsageResetAt: FirestoreTimestampLike
  billingProfile?: BillingProfileDocument
}

export interface BillingProfileDocument {
  type: "individual"
  fullName: string
  email: string
  phone: string
  addressLine1: string
  city: string
  county: string
  country: string
  postalCode: string
  isComplete: boolean
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}

export interface CosmicProfileDocument {
  name: string
  birthDate: string
  birthTime: string
  birthPlace: string
  sexAtBirth: SexAtBirth
  mainFocus: MainFocus
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
  divineNatalRaw?: Record<string, unknown>
  natalSummary?: NatalChartData["summary"]
  sunSign?: string
  moonSign?: string
  risingSign?: string
  natalChartGeneratedAt?: FirestoreTimestampLike
  zodiacSign?: string
  latitude?: number
  longitude?: number
  timezoneIana?: string
  timezoneOffsetNow?: number
  timezoneOffsetAtBirth?: number
  // Legacy offset used before introducing explicit timezone fields.
  timezone?: string | number
}

export interface ReadingDocument {
  agentType: AgentType
  question: string
  response?: string
  answer?: string
  cards?: AgentCard[]
  followUpQuestions?: string[]
  usedAstrologyData?: UsedAstrologyData
  model?: string
  divineApiUsed?: boolean
  tokensUsed?: number
  isPremium: boolean
  createdAt: FirestoreTimestampLike
}

export interface BillingEventDocument {
  type: string
  stripeEventId?: string
  status?: string
  plan?: string
  createdAt: FirestoreTimestampLike
  raw?: Record<string, unknown>
}

export type InvoiceJobStatus = "pending" | "issued" | "failed"

export interface InvoiceJobDocument {
  uid: string
  stripeInvoiceId: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  status: InvoiceJobStatus
  attemptCount: number
  nextRetryAt?: FirestoreTimestampLike
  lastError?: string
  oblioInvoice?: {
    seriesName?: string
    number?: string
    link?: string
  }
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}

export type InvoiceCorrectionStatus = "pending" | "issued" | "failed" | "pending_manual" | "voided"

export interface InvoiceCorrectionDocument {
  uid: string
  stripeInvoiceId: string
  stripeCreditNoteId?: string
  stripeEventId?: string
  status: InvoiceCorrectionStatus
  action: "credit_note_created" | "credit_note_voided" | "invoice_voided"
  amount?: number
  currency?: string
  attemptCount: number
  nextRetryAt?: FirestoreTimestampLike
  lastError?: string
  oblioInvoice?: {
    seriesName?: string
    number?: string
    link?: string
  }
  rawStripeObject?: Record<string, unknown>
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}

export interface LogDocument {
  level: "info" | "warn" | "error"
  scope: string
  message: string
  uid?: string
  metadata?: Record<string, unknown>
  createdAt: FirestoreTimestampLike
}

export type ReportPurchaseStatus = "paid" | "consumed" | "refunded"

export interface ReportPurchaseDocument {
  uid: string
  sku: ReportSku
  status: ReportPurchaseStatus
  stripeSessionId: string
  stripePaymentIntentId?: string
  stripeCustomerId?: string
  amountTotal?: number
  currency?: string
  consumedAt?: FirestoreTimestampLike
  refundedAt?: FirestoreTimestampLike
  createdAt: FirestoreTimestampLike
  updatedAt: FirestoreTimestampLike
}

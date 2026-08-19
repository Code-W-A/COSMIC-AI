export const ANALYTICS_EVENTS = [
  "landing_view",
  "register_started",
  "register_completed",
  "onboarding_started",
  "onboarding_completed",
  "chat_message_sent",
  "free_limit_reached",
  "paywall_viewed",
  "checkout_started",
  "subscription_completed",
  "subscription_cancelled",
] as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number]

export const CLIENT_ANALYTICS_EVENTS = [
  "landing_view",
  "register_started",
  "onboarding_started",
] as const

export type ClientAnalyticsEvent = (typeof CLIENT_ANALYTICS_EVENTS)[number]

export const ANALYTICS_SOURCES = ["landing", "pricing", "chat", "onboarding"] as const

export type AnalyticsSource = (typeof ANALYTICS_SOURCES)[number]

export type AnalyticsLocale = "ro" | "en"

export type AnalyticsMetadata = {
  uid?: string
  locale?: AnalyticsLocale
  source?: AnalyticsSource
  plan?: string
  interval?: string
  agentType?: string
  checkoutType?: string
  monthlyQuestionLimit?: number
  referralCode?: string
}

const analyticsEventSet = new Set<string>(ANALYTICS_EVENTS)
const clientAnalyticsEventSet = new Set<string>(CLIENT_ANALYTICS_EVENTS)
const analyticsSourceSet = new Set<string>(ANALYTICS_SOURCES)

export function isAnalyticsEvent(value: string): value is AnalyticsEvent {
  return analyticsEventSet.has(value)
}

export function isClientAnalyticsEvent(value: string): value is ClientAnalyticsEvent {
  return clientAnalyticsEventSet.has(value)
}

export function isAnalyticsSource(value: string): value is AnalyticsSource {
  return analyticsSourceSet.has(value)
}

export function isAnalyticsLocale(value: string): value is AnalyticsLocale {
  return value === "ro" || value === "en"
}

export function parseAnalyticsMetadata(raw: unknown): AnalyticsMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }

  const input = raw as Record<string, unknown>
  const metadata: AnalyticsMetadata = {}

  if (typeof input.locale === "string" && isAnalyticsLocale(input.locale)) {
    metadata.locale = input.locale
  }

  if (typeof input.source === "string" && isAnalyticsSource(input.source)) {
    metadata.source = input.source
  }

  if (typeof input.plan === "string" && input.plan.trim()) {
    metadata.plan = input.plan.trim().slice(0, 64)
  }

  if (typeof input.interval === "string" && input.interval.trim()) {
    metadata.interval = input.interval.trim().slice(0, 32)
  }

  if (typeof input.agentType === "string" && input.agentType.trim()) {
    metadata.agentType = input.agentType.trim().slice(0, 64)
  }

  if (typeof input.checkoutType === "string" && input.checkoutType.trim()) {
    metadata.checkoutType = input.checkoutType.trim().slice(0, 64)
  }

  if (typeof input.monthlyQuestionLimit === "number" && Number.isFinite(input.monthlyQuestionLimit)) {
    metadata.monthlyQuestionLimit = input.monthlyQuestionLimit
  }

  if (typeof input.referralCode === "string" && input.referralCode.trim()) {
    metadata.referralCode = input.referralCode.trim().slice(0, 32)
  }

  return metadata
}

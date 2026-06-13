import "server-only"

import { logInfo } from "@/lib/logging/logger"

import type { AnalyticsEvent, AnalyticsMetadata } from "./events"

export function trackAnalyticsEvent(event: AnalyticsEvent, metadata?: AnalyticsMetadata) {
  return logInfo("analytics", event, metadata)
}

export function trackFreeLimitReached(
  metadata: AnalyticsMetadata & { monthlyQuestionLimit?: number }
) {
  const { monthlyQuestionLimit, ...rest } = metadata

  return Promise.all([
    trackAnalyticsEvent("free_limit_reached", {
      ...rest,
      ...(typeof monthlyQuestionLimit === "number" ? { monthlyQuestionLimit } : {}),
    }),
    trackAnalyticsEvent("paywall_viewed", {
      ...rest,
      source: rest.source ?? "chat",
      ...(typeof monthlyQuestionLimit === "number" ? { monthlyQuestionLimit } : {}),
    }),
  ])
}

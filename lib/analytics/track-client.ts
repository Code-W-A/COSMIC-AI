"use client"

import { getFirebaseIdToken } from "@/lib/api/client"
import { resolveClientLocale } from "@/lib/i18n/client"
import { DEFAULT_LOCALE } from "@/lib/i18n/locale"

import type { AnalyticsMetadata, ClientAnalyticsEvent } from "./events"

const LANDING_VIEW_SESSION_KEY = "cosmic_analytics_landing_view"

function shouldSkipClientEvent(event: ClientAnalyticsEvent) {
  if (event !== "landing_view") return false
  if (typeof window === "undefined") return true

  try {
    if (sessionStorage.getItem(LANDING_VIEW_SESSION_KEY)) return true
    sessionStorage.setItem(LANDING_VIEW_SESSION_KEY, "1")
  } catch {
    // sessionStorage may be unavailable in private mode
  }

  return false
}

export async function trackAnalyticsEvent(
  event: ClientAnalyticsEvent,
  metadata?: AnalyticsMetadata
) {
  if (shouldSkipClientEvent(event)) return

  const locale =
    metadata?.locale ??
    (typeof window !== "undefined"
      ? resolveClientLocale(window.location.pathname)
      : DEFAULT_LOCALE)
  const token = await getFirebaseIdToken().catch(() => null)

  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-locale": locale,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ event, metadata: { ...metadata, locale } }),
      keepalive: true,
    })
  } catch {
    // Analytics must not block UX.
  }
}

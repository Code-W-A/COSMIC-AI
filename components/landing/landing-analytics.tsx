"use client"

import { useEffect } from "react"

import { trackAnalyticsEvent } from "@/lib/analytics/track-client"
import { useTranslations } from "@/lib/i18n/client"

export function LandingAnalytics() {
  const { locale } = useTranslations()

  useEffect(() => {
    void trackAnalyticsEvent("landing_view", { locale, source: "landing" })
  }, [locale])

  return null
}

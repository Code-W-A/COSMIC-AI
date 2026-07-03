"use client"

import { LegalPageClient } from "@/components/legal/legal-page-client"
import { cookiePolicy } from "@/lib/legal/cookies"
import { useTranslations } from "@/lib/i18n/client"

export default function CookiesPage() {
  const { locale } = useTranslations()

  return (
    <LegalPageClient
      document={cookiePolicy[locale]}
      testId="legal-cookies-page"
    />
  )
}

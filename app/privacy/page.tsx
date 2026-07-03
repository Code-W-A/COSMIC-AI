"use client"

import { LegalPageClient } from "@/components/legal/legal-page-client"
import { privacyPolicy } from "@/lib/legal/privacy"
import { useTranslations } from "@/lib/i18n/client"

export default function PrivacyPage() {
  const { locale } = useTranslations()

  return (
    <LegalPageClient
      document={privacyPolicy[locale]}
      testId="legal-privacy-page"
    />
  )
}

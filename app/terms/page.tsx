"use client"

import { LegalPageClient } from "@/components/legal/legal-page-client"
import { termsOfService } from "@/lib/legal/terms"
import { useTranslations } from "@/lib/i18n/client"

export default function TermsPage() {
  const { locale } = useTranslations()

  return (
    <LegalPageClient
      document={termsOfService[locale]}
      testId="legal-terms-page"
    />
  )
}

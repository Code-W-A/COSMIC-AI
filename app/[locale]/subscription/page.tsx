import { redirect } from "next/navigation"

import { isLocale, type Locale } from "@/lib/i18n/locale"

export default async function LocaleSubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const safeLocale: Locale = isLocale(locale) ? locale : "ro"
  redirect(`/${safeLocale}/account/subscription`)
}


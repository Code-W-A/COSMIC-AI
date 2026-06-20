import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SentryExamplePageClient } from "@/components/sentry/sentry-example-page-client"
import { isSentryExamplePageEnabled } from "@/lib/sentry/example-page"

export const metadata: Metadata = {
  title: "Sentry Example",
  robots: {
    index: false,
    follow: false,
  },
}

type SentryExamplePageProps = {
  searchParams: Promise<{ key?: string | string[] }>
}

export default async function SentryExamplePage({ searchParams }: SentryExamplePageProps) {
  const params = await searchParams
  const key = Array.isArray(params.key) ? params.key[0] : params.key

  if (!isSentryExamplePageEnabled(key)) {
    notFound()
  }

  const apiExamplePath = key ? `/api/sentry-example?key=${encodeURIComponent(key)}` : "/api/sentry-example"

  return (
    <div className="min-h-dvh bg-[#070311] text-white">
      <SentryExamplePageClient apiExamplePath={apiExamplePath} />
    </div>
  )
}

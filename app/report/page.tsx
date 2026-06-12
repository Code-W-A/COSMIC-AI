"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"

import { AuthGuard } from "@/components/auth/auth-guard"
import { useLocalizedPath } from "@/lib/i18n/client"

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportPageContent />
    </Suspense>
  )
}

function ReportPageContent() {
  const router = useRouter()
  const localizedPath = useLocalizedPath()

  useEffect(() => {
    router.replace(localizedPath("/pricing"))
  }, [localizedPath, router])

  return (
    <AuthGuard>
      <main className="flex min-h-dvh items-center justify-center bg-background" />
    </AuthGuard>
  )
}

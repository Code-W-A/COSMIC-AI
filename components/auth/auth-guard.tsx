"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"

import { CosmicAuthLoading } from "@/components/auth/cosmic-auth-loading"
import { useAuth } from "@/components/auth/auth-provider"
import { useCurrentLocale } from "@/lib/i18n/client"

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const locale = useCurrentLocale()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${locale}/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [loading, locale, pathname, router, user])

  if (loading || !user) {
    return <CosmicAuthLoading />
  }

  return <>{children}</>
}

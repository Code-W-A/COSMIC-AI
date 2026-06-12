"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { CosmicAuthLoading } from "@/components/auth/cosmic-auth-loading"
import { useAuth } from "@/components/auth/auth-provider"
import { resolvePostAuthRoute } from "@/lib/auth/resolvePostAuthRoute"
import { logClientEvent } from "@/lib/logging/client-log"
import { useLocalizedPath } from "@/lib/i18n/client"

export function LandingAuthRedirect({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const localizedPath = useLocalizedPath()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (loading || !user) return

    let cancelled = false
    setRedirecting(true)

    logClientEvent("auth.route", "landing_auth_redirect_started", {
      uid: user.uid,
      email: user.email ?? null,
    })

    resolvePostAuthRoute({
      explicitNextPath: null,
      localizedPath,
    })
      .then((nextPath) => {
        if (!cancelled) router.replace(nextPath)
      })
      .catch(() => {
        logClientEvent("auth.route", "landing_auth_redirect_failed", {
          uid: user.uid,
          email: user.email ?? null,
        })
        if (!cancelled) router.replace(localizedPath("/onboarding"))
      })

    return () => {
      cancelled = true
    }
  }, [loading, localizedPath, router, user])

  if (loading || user || redirecting) {
    return <CosmicAuthLoading />
  }

  return <>{children}</>
}

"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

import { CosmicAuthLoading } from "@/components/auth/cosmic-auth-loading"
import { useAuth } from "@/components/auth/auth-provider"
import {
  getLandingRedirectPath,
  getProfileRouteState,
} from "@/lib/auth/resolvePostAuthRoute"
import { apiFetch } from "@/lib/api/client"
import { logClientEvent } from "@/lib/logging/client-log"
import { useLocalizedPath } from "@/lib/i18n/client"
import type { SubscriptionStatusResponse } from "@/types/subscription"

export type LandingAuthState =
  | { phase: "guest" }
  | { phase: "loading" }
  | { phase: "ready"; isPremium: boolean }

const LandingAuthContext = createContext<LandingAuthState>({ phase: "loading" })

export function useLandingAuth() {
  return useContext(LandingAuthContext)
}

export function LandingAuthProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const localizedPath = useLocalizedPath()
  const [state, setState] = useState<LandingAuthState>({ phase: "loading" })
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setState({ phase: "guest" })
      setRedirecting(false)
      return
    }

    let cancelled = false
    setState({ phase: "loading" })
    setRedirecting(false)

    logClientEvent("auth.route", "landing_auth_redirect_started", {
      uid: user.uid,
      email: user.email ?? null,
    })

    Promise.all([
      getProfileRouteState(localizedPath),
      apiFetch<{ success: true } & SubscriptionStatusResponse>(
        "/api/subscription/status"
      ).catch(() => null),
    ])
      .then(([profileState, subscriptionPayload]) => {
        if (cancelled) return

        const redirectPath = getLandingRedirectPath(
          profileState.response,
          localizedPath
        )

        if (redirectPath) {
          setRedirecting(true)
          logClientEvent("auth.route", "landing_auth_redirect_resolved", {
            uid: user.uid,
            email: user.email ?? null,
            destination: redirectPath,
            profileComplete: profileState.response?.profileComplete ?? null,
            natalReady: profileState.response?.natalReady ?? null,
          })
          router.replace(redirectPath)
          return
        }

        setState({
          phase: "ready",
          isPremium: Boolean(subscriptionPayload?.isPremium),
        })
      })
      .catch(() => {
        if (cancelled) return

        logClientEvent("auth.route", "landing_auth_redirect_failed", {
          uid: user.uid,
          email: user.email ?? null,
        })
        setRedirecting(true)
        router.replace(localizedPath("/onboarding"))
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, localizedPath, router, user])

  if (authLoading) {
    return <CosmicAuthLoading />
  }

  if (user && (state.phase === "loading" || redirecting)) {
    return <CosmicAuthLoading />
  }

  return (
    <LandingAuthContext.Provider value={state}>{children}</LandingAuthContext.Provider>
  )
}

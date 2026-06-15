"use client"

import { apiFetch } from "@/lib/api/client"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { logClientEvent } from "@/lib/logging/client-log"

type LocalizedPathFn = (path: string) => string

export interface ProfileRouteResponse {
  profile: unknown | null
  profileComplete?: boolean
  natalReady?: boolean
}

interface ProfileRouteState {
  destination: string
  response: ProfileRouteResponse | null
  error: string | null
}

interface ResolvePostAuthRouteParams {
  explicitNextPath: string | null
  localizedPath: LocalizedPathFn
}

function isChatPath(path: string, localizedPath: LocalizedPathFn) {
  const chatPath = localizedPath("/chat")
  return path === chatPath || path.endsWith("/chat")
}

export function getLandingRedirectPath(
  response: ProfileRouteResponse | null,
  localizedPath: LocalizedPathFn
): string | null {
  if (!response || response.profileComplete !== true) {
    return localizedPath("/onboarding")
  }

  if (response.natalReady !== true) {
    return localizedPath("/onboarding?phase=divine")
  }

  return null
}

export async function getProfileRouteState(
  localizedPath: LocalizedPathFn
): Promise<ProfileRouteState> {
  try {
    const response = await apiFetch<ProfileRouteResponse>("/api/user/profile", {
      method: "GET",
    })

    if (response.profileComplete !== true) {
      return {
        destination: localizedPath("/onboarding"),
        response,
        error: null,
      }
    }

    if (response.natalReady !== true) {
      return {
        destination: localizedPath("/onboarding?phase=divine"),
        response,
        error: null,
      }
    }

    return {
      destination: localizedPath("/chat"),
      response,
      error: null,
    }
  } catch (error) {
    return {
      destination: localizedPath("/onboarding"),
      response: null,
      error: error instanceof Error ? error.message : "unknown_error",
    }
  }
}

export async function resolvePostAuthRoute({
  explicitNextPath,
  localizedPath,
}: ResolvePostAuthRouteParams) {
  const uid = getFirebaseAuth().currentUser?.uid ?? null
  const email = getFirebaseAuth().currentUser?.email ?? null
  const { destination: profileDestination, response, error } =
    await getProfileRouteState(localizedPath)

  if (response?.profileComplete !== true) {
    logClientEvent("auth.route", "post_auth_route_incomplete_profile", {
      uid,
      email,
      explicitNextPath,
      ignoredExplicitNext: Boolean(explicitNextPath),
      destination: profileDestination,
      profileComplete: response?.profileComplete ?? null,
      natalReady: response?.natalReady ?? null,
    })
    return profileDestination
  }

  if (
    response?.natalReady !== true &&
    explicitNextPath &&
    isChatPath(explicitNextPath, localizedPath)
  ) {
    logClientEvent("auth.route", "post_auth_route_natal_required", {
      uid,
      email,
      explicitNextPath,
      destination: profileDestination,
    })
    return profileDestination
  }

  if (explicitNextPath) {
    logClientEvent("auth.route", "post_auth_route_explicit_next", {
      uid,
      email,
      explicitNextPath,
      profileComplete: response?.profileComplete ?? null,
      natalReady: response?.natalReady ?? null,
    })
    return explicitNextPath
  }

  logClientEvent("auth.route", "post_auth_route_resolved", {
    uid,
    email,
    destination: profileDestination,
    hasProfile: Boolean(response?.profile),
    profileComplete: response?.profileComplete ?? null,
    natalReady: response?.natalReady ?? null,
    profileFetchError: error,
  })

  return profileDestination
}

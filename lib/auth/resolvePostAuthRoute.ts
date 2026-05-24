"use client"

import { apiFetch } from "@/lib/api/client"

type LocalizedPathFn = (path: string) => string

interface ProfileResponse {
  profile: unknown | null
  profileComplete?: boolean
}

interface ResolvePostAuthRouteParams {
  explicitNextPath: string | null
  localizedPath: LocalizedPathFn
}

export async function resolvePostAuthRoute({
  explicitNextPath,
  localizedPath,
}: ResolvePostAuthRouteParams) {
  if (explicitNextPath) return explicitNextPath

  try {
    const response = await apiFetch<ProfileResponse>("/api/user/profile", {
      method: "GET",
    })

    if (!response.profile || response.profileComplete === false) {
      return localizedPath("/onboarding")
    }

    return localizedPath("/chat")
  } catch {
    // Prefer returning users to product usage when profile fetch fails.
    return localizedPath("/chat")
  }
}

"use client"

import { apiFetch } from "@/lib/api/client"

type LocalizedPathFn = (path: string) => string

interface ProfileResponse {
  profile: unknown | null
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

    return response.profile ? localizedPath("/chat") : localizedPath("/onboarding")
  } catch {
    // Prefer returning users to product usage when profile fetch fails.
    return localizedPath("/chat")
  }
}

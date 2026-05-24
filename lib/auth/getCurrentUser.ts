import "server-only"

import type { DecodedIdToken } from "firebase-admin/auth"

import { getAdminAuth } from "@/lib/firebase/admin"
import { logWarn } from "@/lib/logging/logger"

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization")

  if (!header) return null

  const [scheme, token] = header.split(" ")

  if (scheme?.toLowerCase() !== "bearer" || !token) return null

  return token
}

export async function getCurrentUser(request: Request): Promise<DecodedIdToken | null> {
  const token = getBearerToken(request)

  if (!token) return null

  try {
    return await getAdminAuth().verifyIdToken(token)
  } catch (error) {
    await logWarn("auth", "firebase_token_verification_failed", { error })
    return null
  }
}

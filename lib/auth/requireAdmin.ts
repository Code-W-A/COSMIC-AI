import "server-only"

import type { DecodedIdToken } from "firebase-admin/auth"
import { NextResponse } from "next/server"

import { errorResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { normalizeEmail } from "@/lib/partners/codes"

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter((value): value is string => Boolean(value))
}

export function isAdminEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  return getAdminEmails().includes(normalized)
}

export async function requireAdmin(
  request: Request
): Promise<DecodedIdToken | NextResponse> {
  const user = await requireUser(request)
  if (isAuthResponse(user)) return user

  if (!isAdminEmail(user.email)) {
    return errorResponse("forbidden", "Admin access required.", 403)
  }

  return user
}

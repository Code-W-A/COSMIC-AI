import "server-only"

import type { DecodedIdToken } from "firebase-admin/auth"
import { NextResponse } from "next/server"

import { errorResponse } from "@/lib/api/responses"
import { getCurrentUser } from "@/lib/auth/getCurrentUser"

export async function requireUser(request: Request): Promise<DecodedIdToken | NextResponse> {
  const user = await getCurrentUser(request)

  if (!user) {
    return errorResponse("unauthenticated", "You must be signed in to continue.", 401)
  }

  return user
}

export function isAuthResponse(value: DecodedIdToken | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

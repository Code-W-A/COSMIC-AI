import { Timestamp } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getReadingsCollection } from "@/lib/firebase/firestore"
import { logError } from "@/lib/logging/logger"
import type { ReadingDocument } from "@/types/user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function toDateIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

export async function GET(request: Request) {
  const user = await requireUser(request)
  if (isAuthResponse(user)) return user

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "20")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20
  const cursor = searchParams.get("cursor")

  try {
    let query = getReadingsCollection(user.uid).orderBy("createdAt", "desc").limit(limit)
    if (cursor) {
      const cursorDate = new Date(cursor)
      if (!Number.isNaN(cursorDate.valueOf())) {
        query = query.startAfter(Timestamp.fromDate(cursorDate))
      }
    }

    const snapshot = await query.get()
    const readings = snapshot.docs.map((doc) => {
      const data = doc.data() as Partial<ReadingDocument>
      const answer = data.answer ?? data.response ?? ""

      return {
        id: doc.id,
        agentType: data.agentType ?? "love",
        createdAt: toDateIso(data.createdAt),
        question: data.question ?? "",
        answerPreview: answer.slice(0, 220),
        locale: data.locale === "ro" ? "ro" : "en",
        hasLocalizedAstrology: isRecord(data.astrologySnapshotLocalized),
      }
    })

    const last = snapshot.docs[snapshot.docs.length - 1]
    const nextCursor = last ? toDateIso(last.get("createdAt")) : null

    return successResponse({
      readings,
      nextCursor,
    })
  } catch (error) {
    await logError("readings", "readings_list_failed", {
      uid: user.uid,
      error,
    })
    return errorResponse(
      "readings_list_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load readings history."
        : getErrorMessage(error),
      500
    )
  }
}

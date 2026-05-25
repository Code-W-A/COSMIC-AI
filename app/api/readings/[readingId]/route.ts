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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ readingId: string }> }
) {
  const user = await requireUser(request)
  if (isAuthResponse(user)) return user

  const { readingId } = await params
  if (!readingId) {
    return errorResponse("invalid_reading_id", "Reading ID is required.", 400)
  }

  try {
    const snapshot = await getReadingsCollection(user.uid).doc(readingId).get()
    if (!snapshot.exists) {
      return errorResponse("reading_not_found", "Reading was not found.", 404)
    }

    const data = snapshot.data() as Partial<ReadingDocument>

    return successResponse({
      reading: {
        id: snapshot.id,
        agentType: data.agentType ?? "love",
        question: data.question ?? "",
        answer: data.answer ?? data.response ?? "",
        cards: Array.isArray(data.cards) ? data.cards : [],
        followUpQuestions: Array.isArray(data.followUpQuestions) ? data.followUpQuestions : [],
        usedAstrologyData: isRecord(data.usedAstrologyData) ? data.usedAstrologyData : null,
        locale: data.locale === "ro" ? "ro" : "en",
        createdAt: toDateIso(data.createdAt),
        astrologySnapshotCanonical: isRecord(data.astrologySnapshotCanonical)
          ? data.astrologySnapshotCanonical
          : null,
        astrologySnapshotLocalized: isRecord(data.astrologySnapshotLocalized)
          ? data.astrologySnapshotLocalized
          : null,
      },
    })
  } catch (error) {
    await logError("readings", "reading_detail_failed", {
      uid: user.uid,
      readingId,
      error,
    })
    return errorResponse(
      "reading_detail_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load reading details."
        : getErrorMessage(error),
      500
    )
  }
}
